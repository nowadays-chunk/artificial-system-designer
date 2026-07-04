# WhatsApp Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Sizing for High-Density Connection Clusters

Capacity planning for a real-time chat platform is determined by connection count and socket memory overhead.

We estimate resource requirements using the following profile:
- **Total Concurrent Connected Users**: 100,000,000 users globally.
- **Connection Overhead per Socket**: 10 KB (including TCP buffers, Erlang process state, and SSL context parameters).
- **Total Gateway Memory Requirement**:
  $$\text{RAM} = 100,000,000 \times 10 \text{ KB} = 1,000 \text{ Gigabytes (1 Terabyte of RAM)}$$

Applying replication ($N=2$) and redundancy buffers, the gateway cluster requires at least 2 Terabytes of RAM. Using bare-metal servers equipped with 128GB of RAM, we deploy a cluster of:
$$\text{Server Count} = \frac{2,000 \text{ GB}}{128 \text{ GB}} \approx 16 \text{ nodes}$$

---

## 2. Bandwidth and Egress Sizing for Messaging

At an average message transmission rate of 1,000,000 messages per second, and an average message payload size of 500 bytes (including headers and encryption wrappers):
- **Egress Bandwidth**:
  $$\text{Bandwidth} = 1,000,000 \text{ msg/sec} \times 500 \text{ bytes} = 500 \text{ Megabytes/sec (4 Gbps)}$$

```
  Delivery Path:
  [ Sender App ] ===( 4 Gbps Ingress )===> [ Erlang Gateway Cluster ] ===( 4 Gbps Egress )===> [ Recipient App ]
```

---

## 3. TCP Keep-Alive and Connection Recovery Strategies

To detect disconnected sockets and prevent resource leaks:
- **Mobile Keep-Alives**: The client app sends a lightweight ping packet every 15-30 minutes if the connection is idle.
- **Backoff Reconnects**: During network transitions (e.g. switching from Wi-Fi to Cellular), clients use exponential backoff algorithms with jitter to prevent reconnect storms from saturating the gateways.
