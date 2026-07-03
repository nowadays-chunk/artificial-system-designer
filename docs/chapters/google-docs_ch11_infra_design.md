# Google Docs Case Study - Chapter 11: Governance and Compliance

## 1. Architectural Governance and ADR Processes

We manage design changes through **Architecture Decision Records (ADRs)** to maintain system design consistency:
- **Git Repository**: ADRs are stored as markdown files in a central git repository.
- **Auditing**: SRE and Security leads review pull requests containing new ADR files to verify compliance with scaling policies, encryption standards, and budget constraints.

---

## 2. GDPR/CCPA Compliance: User Data Management

Data privacy regulations require robust user data deletion and export processes.

```
       [ Delete User Request ] ---> [ Soft Delete (Metadata flag) ]
                                                |
                                                v
                                    [ Trigger Deletion Topic ]
                                                |
         +--------------------------------------+--------------------------------------+
         |                                                                             |
         v                                                                             v
  [ Delete SQL Rows (Profiles, Files) ]                                 [ Delete Storage Objects (S3 Blocks) ]
```

- **Right to Be Forgotten**: When a user deletes their profile, the delete service deletes their record from PostgreSQL and publishes a deletion event to a Kafka topic. Background jobs consume the event to delete the user's files from S3 and remove their associated metadata from database tables, avoiding database write saturation during peak hours.
- **Data Export**: Background workers package user data, file metadata, and files into encrypted ZIP archives, providing download links to users requesting data exports.

---

## 3. Resource Allocation Tagging

Every cloud resource (VM instance, database cluster, cache pool) must be tagged to track costs:
- **`env`**: `production`, `staging`, `dev`.
- **`owner`**: The engineering team responsible for the resource.
- **`cost-center`**: Internal billing identifiers.
- **`compliance`**: Flag indicating if the resource handles personal data (PII).
