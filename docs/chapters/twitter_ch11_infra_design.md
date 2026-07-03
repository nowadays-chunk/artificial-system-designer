# Twitter Case Study - Chapter 11: Governance and Compliance

## 1. Architectural Governance and ADR Processes

In large engineering organizations, maintaining architectural consistency requires a structured governance process. We enforce the use of **Architecture Decision Records (ADRs)** to document significant architectural decisions, their context, and their trade-offs.

```
       [ Proposed Infrastructure Change ]
                       |
                       v
       [ Draft Architecture Decision Record (ADR) ]
                       |
                       v
       [ Peer Review & SRE Board Review ]
         /                            \
        / (Approved)                   \ (Rejected)
       v                                v
  [ Merge ADR to Git ]            [ Revise Plan ]
```

### 1.1 ADR Lifecycle and Management
- **Git-Ops Workflow**: ADRs are managed as markdown files in the central git repository. Any modification or addition to infrastructure configurations must reference an approved ADR.
- **Review Board**: The Enterprise Architecture Board reviews draft ADRs weekly to ensure alignment with security standards, cost budgets, and performance targets.

---

## 2. Regulatory Compliance: GDPR/CCPA Data Governance

Global social platforms must comply with data privacy regulations like **GDPR (General Data Protection Regulation)** and **CCPA (California Consumer Privacy Act)**. Key compliance requirements include:
- **Right to Be Forgotten**: Users must be able to delete their accounts and all associated data permanently.
- **Data Portability**: Users must be able to export their data.
- **Data Residency**: Data must be stored in compliance with local residency laws.

### 2.2 Implementing the Deletion Pipeline
To satisfy the "Right to Be Forgotten" without degrading database performance:
1. **Soft Delete**: When a user deletes their account, the application updates their state to `deleted` in the PostgreSQL database.
2. **Cache Eviction**: The system evicts the user's home timeline cache from Redis instantly.
3. **Asynchronous Hard Delete**: A background job processes the deletion log from a Kafka topic (`account-deletions`). It runs low-priority batch deletions against Cassandra to remove all tweets, likes, and followers associated with the user ID, avoiding database write saturation during peak hours.

---

## 3. Cloud Resource Tagging and Cost Governance

To manage cloud costs, we enforce standardized resource tagging across all cloud resources:

```yaml
# Kubernetes Resource Metadata Tagging Template
metadata:
  name: user-service-pod
  labels:
    env: production
    owner: core-identity-team
    project: twitter-platform
    cost-center: cc-9081
    compliance: gdpr-relevant
```

### 3.1 Tag Invariants
- **`env`**: `production`, `staging`, `development`. Used to partition monitoring alert configurations.
- **`cost-center`**: Identifies the team responsible for the resource's cloud expenses.
- **`compliance`**: Indicates if the resource processes Personally Identifiable Information (PII) to apply appropriate encryption and access policies.
