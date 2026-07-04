# Twitter Case Study - Chapter 6: Security Architecture

## 1. Edge Protection, DDoS Mitigation, and Rate Limiting

A global microblogging platform handling millions of active sessions is a frequent target for distributed denial-of-service (DDoS) attacks, credential stuffing, and automated scraping. The security architecture uses a multi-layered defense-in-depth model, beginning at the global Anycast network edge and cascading down to the application services.

```
       [ Client Egress Traffic ]
                   |
                   v
  [ Global Firewall & WAF (Cloudflare Edge) ]
                   |
                   v
  [ API Gateway (OAuth 2.0 & Rate Limiting) ]
                   |
         +---------+---------+
         | (Valid API Calls) | (Abusive Requests)
         v                   v
  [ Microservices ]     [ HTTP 429 Limit Exceeded ]
```

### 1.1 Web Application Firewall (WAF) Rulesets
All ingress traffic terminates at Cloudflare edge nodes, where WAF rules filter requests:
- **DDoS Mitigation**: Automated rate limiting at Layer 3/4 blocks brute-force volumetric attacks before they reach backend datacenters.
- **L7 Protection**: Inspects payloads for SQL Injection (SQLi), Cross-Site Scripting (XSS), and Remote Code Execution (RCE) patterns.
- **Credential Stuffing Prevention**: Monitors authentication endpoints for high-frequency failure rates originating from unified IP address subnets, triggering CAPTCHA challenges dynamically.

---

### 1.2 Sliding Window Log Rate Limiter (Redis Implementation)

To protect backend APIs from resource exhaustion, the API Gateway enforces rate limiting using **Redis sliding window logs**.

#### Algorithmic Comparison
- **Leaky Bucket / Token Bucket**: Easy to implement but allow burst traffic at window boundaries (the "double quota" problem).
- **Sliding Window Log**: Tracks every request timestamp in a sorted set (`ZSET`) per user, providing precise rate limiting.

#### Math and Complexity
For a rate limit of $N$ requests per window $W$:
- **Time Complexity**: $O(\log M + M)$ where $M$ is the number of requests in the active window. Adding a timestamp and removing expired entries are logarithmic and linear operations.
- **Space Complexity**: $O(M)$ per user.

```typescript
import Redis from "ioredis";

export class RedisRateLimiter {
  private redis = new Redis.Cluster([{ host: "redis-ratelimit-1", port: 6379 }]);

  /**
   * Evaluates if a request from a client should be rate limited.
   * @param clientId Unique user identifier or IP address
   * @param limit Max allowed requests within the sliding window
   * @param windowSec Window duration in seconds
   */
  public async limit(clientId: string, limit = 100, windowSec = 60): Promise<boolean> {
    const key = `ratelimit:${clientId}`;
    const nowMs = Date.now();
    const clearBefore = nowMs - (windowSec * 1000);
    
    const pipeline = this.redis.pipeline();

    // 1. Evict request logs older than the sliding window boundary
    pipeline.zremrangebyscore(key, 0, clearBefore);

    // 2. Add current request timestamp to the user's sorted set
    // We append a random suffix to make members unique in case of concurrent requests
    const uniqueValue = `${nowMs}-${Math.random()}`;
    pipeline.zadd(key, nowMs, uniqueValue);

    // 3. Count total active requests in the current window
    pipeline.zcard(key);

    // 4. Set key expiration to automatically clean up idle sets
    pipeline.expire(key, windowSec);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error("Redis pipeline execution failed");
    }

    const requestCount = results[2][1] as number;

    // Return true if request count exceeds the limit
    return requestCount > limit;
  }
}
```

---

## 2. In-Transit and At-Rest Cryptographic Architectures

Data protection requires securing data both in transit across public and private networks and at rest within persistence layers.

---

### 2.1 Encryption in Transit (TLS 1.3 and 0-RTT Security)

All external connections terminate at edge gateways using **TLS 1.3**, which optimizes performance and security:
- **1-RTT Handshake**: Consolidates cryptographic key exchange parameters into a single round-trip, dropping connection setup latency by 50%.
- **Zero-RTT (0-RTT) Session Resumption**: Allows returning clients to send encrypted application payloads alongside their initial handshake packet.

#### 0-RTT Replay Attack Vulnerability and Mitigations
While 0-RTT improves mobile connection startup latencies, it is vulnerable to **replay attacks**, where an eavesdropper intercepts a client's 0-RTT packet (e.g. a POST request to create a tweet) and retransmits it to the server, potentially duplicating the action.

To mitigate this:
1. **HTTP Method Constraints**: The gateway allows 0-RTT only for safe, idempotent HTTP methods (`GET`, `HEAD`, `OPTIONS`).
2. **Replay Validation Tokens**: POST, PUT, and DELETE actions require a one-time cryptographic transaction token, rejecting duplicate submissions at the API Gateway.

---

### 2.2 Encryption at Rest: Envelope Encryption via KMS and Vault

To protect databases from physical disk theft or file-level compromise, the persistence tier uses **envelope encryption**:

```
  Envelope Encryption Process:
  [ Master Key (HSM / Vault) ] ===( Encrypts )===> [ Data Encryption Key (DEK) ]
                                                          |
                                                          v
                                               [ Data Payload (AES-256) ]
```

1. **Data Encryption Key (DEK)**: The database engine generates a unique symmetric AES-256 key per tablespace or disk block, encrypting the raw data.
2. **Key Encryption Key (KEK)**: The DEK is encrypted using a Key Encryption Key managed by a Key Management Service (KMS) backed by Hardware Security Modules (HSMs).
3. **Storage**: The encrypted DEK is stored alongside the encrypted data blocks, while the plaintext DEK exists only in volatile memory.
4. **Dynamic Key Rotation**: HashiCorp Vault rotates KEKs every 90 days, re-encrypting the DEKs without requiring database downtime.

---

## 3. Data Isolation and RBAC (Role-Based Access Control)

To prevent cross-tenant data leaks and restrict internal access, the architecture enforces strict access control boundaries.

### 3.1 Token Validation Middleware
Every microservice request must include a cryptographically signed JSON Web Token (JWT) containing the caller's identity and authorized scopes:

```typescript
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

interface TenantContext {
  userId: string;
  tenantId: string;
  scopes: string[];
}

export function validateRequestClaims(publicKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing access credentials" });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Validate signature, expiration, and audience claims
      const payload = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        audience: "twitter-api-services"
      }) as any;

      // Bind resolved context to the request object
      req.context = {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        scopes: payload.scopes || []
      };

      // Enforce scope check for write paths
      if (req.method === "POST" && !req.context.scopes.includes("tweet:write")) {
        return res.status(403).json({ error: "Forbidden: Missing required write scope" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized: Invalid signature or expired token" });
    }
  };
}
```

---

### 3.2 Database Row-Level Security (RLS)

In relational metadata stores (PostgreSQL), we enable Row-Level Security (RLS) policies to ensure that queries are restricted to the authenticated tenant's scope:

```sql
-- Enable Row-Level Security on User Accounts Table
ALTER TABLE identity.accounts ENABLE ROW LEVEL SECURITY;

-- Create policy restricting reads to the user's tenant ID context
CREATE POLICY tenant_isolation_policy ON identity.accounts
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));
```

Before executing a query, the application setting `app.current_tenant_id` is set to the caller's verified tenant context within the transaction scope, blocking unauthorized data access at the database driver layer.
