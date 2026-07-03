# Google Docs Case Study - Chapter 6: Security Architecture

## 1. Access Control and Namespace Security

Access to documents and shared directories is restricted using **OAuth 2.0** access token authentication.

```
       [ Client Request + Access Token ] ---> [ Gateway (Scope Check) ]
                                                        |
                                       +----------------+----------------+
                                       | (Authorized)                    | (Unauthorized)
                                       v                                 v
                              [ Target Service ]                [ HTTP 403 Forbidden ]
```

- **Scope Check**: The API gateway decodes access tokens to verify scopes (e.g., `documents:read`, `documents:write`).
- **Namespace Validation**: Database queries check document ownership records to prevent cross-tenant directory access.

---

## 2. Encryption Boundaries

To protect user data at rest and in transit:
- **Encryption in Transit (TLS 1.3)**: Secure communication channels are used for all document and metadata transfers.
- **Encryption at Rest (AES-256)**: Document snapshots are encrypted on the storage server using AES-256. Keys are managed in a secure KMS vault with automated key rotation.
- **Client-Side Encryption Options**: Enterprise clients can configure custom keys to encrypt document data before transmission, preventing the platform from reading document content.
