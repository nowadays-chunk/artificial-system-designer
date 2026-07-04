# Amazon Marketplace Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global e-commerce and retail platform like Amazon Marketplace introduces unique scaling and concurrency challenges. Unlike simple catalog viewers, an e-commerce platform must process millions of transactional write operations (order creation, inventory reservations), serve high-volume read paths (product searches, price listings), enforce strong consistency boundaries, and integrate with external payment and shipping systems.

The system must handle:
- **Order Placement Write Path**: 20,000+ checkout operations per second globally, peaking at 100,000+ transactions per second during holiday shopping events.
- **Catalog Read Path**: Over 200,000 product listing views per second.
- **Latency Target**: Core checkout transactions completed under 200ms end-to-end.

To meet these targets, the architecture decouples the **Checkout & Order Creation Write Path** from the **High-Availability Product Catalog Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Checkout: /api/checkout)                         | (Catalog views: /api/product)
         v                                                   v
  [ Order Processing API ]                            [ Catalog Search API ]
         |                                                   |
         +===> Check Stock (Redis Cache)                     +===> Query Product (DynamoDB Read)
         |                                                   |
         +===> Create Order (DynamoDB Transactional)         +===> Return Rendered Catalog Page
```

### 2.1 Checkout & Order Creation Write Path
The checkout path handles transactional orders:
1. **API Ingestion**: The gateway receives the checkout request containing item IDs, billing details, and shipping parameters.
2. **Inventory Reservation**: The Order Service checks and decrements inventory in a high-performance Redis cache cluster.
3. **Transaction Commit**: The service writes the pending order metadata to a primary transactional DynamoDB table.
4. **Asynchronous Dispatch**: The system publishes an `OrderCreatedEvent` to a Kafka topic. Background payment and shipment workers consume the event to finalize transactions.

---

### 2.2 Order Transaction Gateway Implementation
To prevent double-billing and handle concurrent stock checks safely, the Order Service executes atomic transactions and checks idempotency keys.

#### Transaction routing and coordination implementation:

```typescript
import { Client as DynamoClient } from "pg"; // PostgreSQL mock for transactional DB
import Redis from "ioredis";

interface CheckoutRequest {
  idempotencyKey: string;
  userId: string;
  itemId: string;
  quantity: number;
  totalPriceCents: number;
}

export class CheckoutTransactionCoordinator {
  private redis = new Redis.Cluster([{ host: "redis-inventory", port: 6379 }]);
  private dbClient = new DynamoClient({ connectionString: "postgresql://db-orders:5432/amazon" });

  public async initialize() {
    await this.dbClient.connect();
  }

  /**
   * Processes a client checkout request with idempotency verification.
   */
  public async processCheckout(request: CheckoutRequest): Promise<{ success: boolean; orderId?: string }> {
    const idempotencyKey = `idempotency:${request.idempotencyKey}`;

    // 1. Verify if request was already processed
    const existingOrderId = await this.redis.get(idempotencyKey);
    if (existingOrderId) {
      return { success: true, orderId: existingOrderId };
    }

    // 2. Perform optimistic inventory reservation in Redis
    const inventoryKey = `inventory:${request.itemId}`;
    const remainingStock = await this.redis.decrby(inventoryKey, request.quantity);

    if (remainingStock < 0) {
      // Revert reservation on stock depletion
      await this.redis.incrby(inventoryKey, request.quantity);
      return { success: false };
    }

    // 3. Execute database write transaction
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      await this.dbClient.query("BEGIN");

      const insertOrderQuery = "INSERT INTO orders.records (order_id, user_id, item_id, quantity, total_price_cents, status) VALUES ($1, $2, $3, $4, $5, $6)";
      await this.dbClient.query(insertOrderQuery, [orderId, request.userId, request.itemId, request.quantity, request.totalPriceCents, "pending"]);

      await this.dbClient.query("COMMIT");

      // 4. Save idempotency reference in Redis cache
      await this.redis.set(idempotencyKey, orderId, "EX", 86400); // 24-hour TTL

      return { success: true, orderId };
    } catch (err) {
      await this.dbClient.query("ROLLBACK");
      // Revert Redis reservation on database write failure
      await this.redis.incrby(inventoryKey, request.quantity);
      return { success: false };
    }
  }
}
```

---

## 3. High-Availability Catalog Read Path

The read path serves product detail views:
1. **Catalog Query**: The client requests a product detail page.
2. **Cache Verification**: The Catalog API queries Redis caches first.
3. **Database Fallback**: On cache miss, the service queries DynamoDB read replicas, updates the Redis cache, and returns the product data to the client.
