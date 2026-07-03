# Twitter Case Study - Chapter 6: Security Architecture

## 1. Edge Protection & Rate Limiting

A public-facing social network with hundreds of millions of active users is a frequent target for distributed denial-of-service (DDoS) attacks, brute force login attempts, and automated data scraping campaigns. To defend the system, the architecture implements a multi-layered security model starting at the edge.

```
       [ Edge Firewall / WAF (Cloudflare SSL/TLS 1.3) ]
                              |
                              v
       [ API Gateway Rate Limiter (Redis Sliding Window) ]
                              |
                              v
       [ Internal App Services (OAuth 2.0 / JWT Claims) ]
```

### 1.1 Sliding Window Log Rate Limiter Algorithm
We implement rate limiting at the API Gateway layer using Redis sliding window logs to prevent burst traffic from degrading service performance.

The rate limiting algorithm works as follows:
1. When a request arrives, the gateway identifies the client by User ID or IP address.
2. It pushes the current epoch timestamp to a Redis sorted set (`ZSET`) keyed by the client's identifier.
3. It evicts all elements in the set older than the rate limit window (e.g., 1 minute).
4. The remaining card count determines if the request fits within the client's rate limit quota (e.g., 100 requests per minute).

```typescript
async function isRateLimited(clientId: string, limit = 100, windowSec = 60): Promise<boolean> {
  const key = `ratelimit:${clientId}`;
  const now = Date.now();
  const clearBefore = now - (windowSec * 1000);

  const pipeline = redisCluster.pipeline();
  
  // Remove logs older than window threshold
  pipeline.zremrangebyscore(key, 0, clearBefore);
  
  // Log the current request timestamp
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Count remaining logs in the window
  pipeline.zcard(key);
  
  // Set expiration to clean up unused sets
  pipeline.expire(key, windowSec);

  const results = await pipeline.exec();
  const requestCount = results[2][1] as number;

  return requestCount > limit;
}
```

---

## 2. In-Transit and At-Rest Cryptographic Boundaries

To protect user privacy and comply with data residency standards, all communications and storage systems employ encryption.

### 2.1 Encryption in Transit (TLS 1.3)
All external client connections terminate at the ingress gateway using **TLS 1.3**. This version optimizes connection handshakes:
- **1-RTT Handshake**: Reduces handshake time by eliminating redundant exchange cycles.
- **Zero-RTT (0-RTT) Session Resumption**: Speeds up connection establishment for returning clients by allowing them to send encrypted data alongside the initial handshake request.
- **Perfect Forward Secrecy (PFS)**: Ensures that compromised server keys cannot decrypt past sessions.

### 2.2 Encryption at Rest (AES-256)
- **Database Storage**: Cassandra table SSTables and PostgreSQL data pages are encrypted using AES-256.
- **Secret Management**: System credentials, API tokens, and private keys are retrieved dynamically from a HashiCorp Vault cluster.

---

## 3. Multi-Tenant Scoped Data Isolation

The platform enforces tenant isolation to prevent cross-tenant data leaks in shared storage environments.

### 3.1 Tenancy Middleware Checks
Every incoming request must be associated with an authenticated tenant ID. The authentication middleware parses the caller's JWT token, validates its signature, and injects the resolved `tenantId` into the request context.

```typescript
import { Request, Response, NextFunction } from "express";

export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication credentials" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const claims = decodeJwtToken(token); // Verify signature and resolve claims

    // Bind tenant context to the active request lifecycle
    req.tenantContext = {
      tenantId: claims.tenantId,
      actorId: claims.userId,
      role: claims.role
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden: Invalid authorization token" });
  }
}
```

### 3.2 SQL Row-Level Security
In relational metadata stores (PostgreSQL), we enable Row-Level Security (RLS) policies to ensure that queries are restricted to the authenticated tenant's scope:

```sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_tenant_isolation_policy ON workspaces
    FOR ALL
    USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
```
This database-level constraint acts as a fallback to prevent data leakage even if application-level tenant validation fails.
