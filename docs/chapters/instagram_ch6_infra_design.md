# Instagram Case Study - Chapter 6: Security Architecture

## 1. OAuth 2.0 Scopes and Access Management

Access to user media, followers lists, and direct message channels is protected using **OAuth 2.0** access token authentication.

```
       [ Client Request + Access Token ] ---> [ API Gateway (Scopes Check) ]
                                                        |
                                       +----------------+----------------+
                                       | (Authorized)                    | (Unauthorized)
                                       v                                 v
                              [ Target Service ]                [ HTTP 403 Forbidden ]
```

- **Token Validation**: The API Gateway decodes the client's JWT access token to verify signatures and scopes.
- **Scopes Enforcement**: Gateway rules check scopes (e.g., `media:read`, `comments:write`) before routing requests to downstream microservices, rejecting unauthorized actions at the ingress boundary.

---

## 2. Cryptographic Protection of Media at Rest

To secure private posts and user direct messages, all uploaded binaries are encrypted at rest.

- **S3 Bucket Encryption**: Standardized on server-side encryption with Amazon S3-managed keys (**SSE-S3**) using AES-256.
- **Key Rotation**: Encryption keys are rotated automatically every 90 days.
- **Signed CDN URLs**: Access to private media is restricted using time-limited pre-signed Cloudfront URLs. CDN edge nodes reject access requests with expired signatures.

---

## 3. Web Application Firewall (WAF) Protections

We deploy WAF protection profiles at the ingress firewall to defend against common attack vectors:
- **DDoS Mitigation**: Automated rate limiting checks based on request rate and origin IP address blocks.
- **Payload Validation**: Inspections checking for SQL injections, cross-site scripting (XSS), and path traversal attempts.
