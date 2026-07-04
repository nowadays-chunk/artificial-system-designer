# Amazon Marketplace Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Relational Database Sharding vs. NoSQL Keyspace

To store order records, shopping carts, product profiles, and review listings at scale:

- **DynamoDB (Stateful NoSQL Database)**: Selected to store orders and shopping carts. Since order lookups are primary-key-based (fetch order details by Order ID), DynamoDB's consistent sub-10ms response times and automated partitioning scale effectively. It provides multi-item transactional updates (`TransactWriteItems`), allowing atomic writes across multiple tables without requiring relational cluster maintenance.
- **PostgreSQL with Manual Sharding (Comparison)**: Excellent for relational queries and joins, but managing a large horizontally sharded relational database introduces operational overhead and connection limits under peak load conditions.

---

## 2. In-Memory Cache Selection: Redis vs. Memcached

To host active shopping carts, real-time inventory counts, and price indexes:
- **Redis Cluster**: Selected because it supports rich data structures (e.g., Hashes, Lists) in memory. This allows storing cart listings as Hashes, enabling fast element modifications, range checks, and updates.
- **Memcached**: Excellent for simple key-value lookups (such as caching raw product description blocks), but its lack of complex data structures makes it less suitable for hosting dynamic shopping carts.

---

## 3. Database Schema Design for Orders Table

To model orders in DynamoDB:

```json
{
  "TableName": "amazon_marketplace_orders",
  "KeySchema": [
    { "AttributeName": "user_id", "KeyType": "HASH" },
    { "AttributeName": "order_id", "KeyType": "RANGE" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "user_id", "AttributeType": "S" },
    { "AttributeName": "order_id", "AttributeType": "S" }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

This schema partitions the `orders` table by `user_id` to distribute write actions across database shards and group user order histories sequentially on disk.
