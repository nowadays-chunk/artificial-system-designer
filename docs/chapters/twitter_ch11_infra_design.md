# Twitter Case Study - Chapter 11: Governance and Compliance

## 1. Architecture Governance Framework

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

### 1.1 ADR Management Process
- **GitOps Workflow**: ADRs are managed as markdown files in the central git repository. Any modification or addition to infrastructure configurations must reference an approved ADR.
- **Review Board**: The Enterprise Architecture Board reviews draft ADRs weekly to ensure alignment with security standards, cost budgets, and performance targets.

---

## 2. Regulatory Compliance: GDPR/CCPA Data Governance

Global social platforms must comply with data privacy regulations like **GDPR (General Data Protection Regulation)** and **CCPA (California Consumer Privacy Act)**. Key compliance requirements include:
- **Right to Be Forgotten**: Users must be able to delete their accounts and all associated data permanently.
- **Data Portability**: Users must be able to export their data.
- **Data Residency**: Data must be stored in compliance with local residency laws.

---

### 2.1 Asynchronous Account Deletion Pipeline
To satisfy the "Right to Be Forgotten" without degrading database performance:
1. **Soft Delete**: When a user deletes their account, the application updates their state to `deleted` in the PostgreSQL database.
2. **Cache Eviction**: The system evicts the user's home timeline cache from Redis instantly.
3. **Asynchronous Hard Delete**: A background job processes the deletion log from a Kafka topic (`account-deletions`). It runs low-priority batch deletions against Cassandra to remove all tweets, likes, and followers associated with the user ID, avoiding database write saturation during peak hours.

```typescript
import { Kafka } from "kafkajs";
import { Client as CassandraClient } from "cassandra-driver";

interface AccountDeletionEvent {
  userId: string;
  timestamp: number;
}

export class DeletionPipeline {
  private kafka = new Kafka({ brokers: ["kafka-broker-1:9092"] });
  private cassandra = new CassandraClient({
    contactPoints: ["cassandra-node-1"],
    localDataCenter: "us-east-1"
  });
  private consumer = this.kafka.consumer({ groupId: "deletion-workers" });

  public async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "account-deletions", fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: AccountDeletionEvent = JSON.parse(message.value.toString());
        await this.executeHardDelete(event.userId);
      }
    });
  }

  private async executeHardDelete(userId: string) {
    console.log(`[DELETION] Starting hard delete for user: ${userId}`);

    // 1. Delete user's tweets from Cassandra
    const deleteTweetsQuery = "DELETE FROM twitter_persistence.tweets WHERE author_id = ?";
    await this.cassandra.execute(deleteTweetsQuery, [userId], { prepare: true });

    // 2. Delete user's social graph relations (FlockDB)
    const deleteFollowersQuery = "DELETE FROM flock_graph.edges WHERE source_id = ?";
    const deleteFollowingQuery = "DELETE FROM flock_graph.edges WHERE target_id = ?";
    await this.cassandra.execute(deleteFollowersQuery, [userId], { prepare: true });
    await this.cassandra.execute(deleteFollowingQuery, [userId], { prepare: true });

    // 3. Delete user's profile metadata from PostgreSQL
    await postgresClient.query("DELETE FROM identity.accounts WHERE user_id = $1", [userId]);

    console.log(`[DELETION] Successfully completed hard delete for user: ${userId}`);
  }
}
```

---

### 2.2 Data Export Pipeline
To comply with data portability requirements:
1. **Export Request**: The user requests a data export.
2. **Asynchronous Assembly**: A worker consumes the request and queries database systems (PostgreSQL, Cassandra) to retrieve the user's profile, followers lists, and tweets.
3. **Packaging**: The worker compiles the dataset into a structured JSON payload, packages it into an encrypted ZIP file, and uploads it to a secure S3 bucket.
4. **Delivery**: The user receives a time-limited download link via email.

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
- **`owner`**: The engineering team responsible for maintaining the resource.
