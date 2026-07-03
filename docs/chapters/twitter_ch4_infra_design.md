# Twitter Case Study - Chapter 4: Infrastructure Strategy and Planning

## 1. Capacity Planning Methodology

Capacity planning for a global platform like Twitter (500M+ Daily Active Users) requires converting abstract usage metrics into physical hardware requirements. The capacity planner must design for **peak loads**, not average workloads, while maintaining safety buffers to absorb unexpected traffic surges.

Our capacity forecasting incorporates:
- **Compute Sizing**: Calculating front-end and microservice replica allocations based on CPU instructions and request rates.
- **Cache Sizing**: Planning RAM requirements for active timeline caches.
- **Storage Sizing**: Estimating storage capacity and disk write throughput (IOPS) requirements for long-term persistence.
- **Network Bandwidth**: Sizing ingress/egress transit links to prevent queue saturation.

---

## 2. Ingestion Metrics and Sizing Equations

To illustrate the capacity planning process, we evaluate the system requirements for a platform with the following profile:

- **Daily Active Users (DAUs)**: $500,000,000$ users.
- **Average Tweets per User/Day**: $1.2$ tweets.
- **Total Tweets per Day**:
  $$500,000,000 \times 1.2 = 600,000,000 \text{ tweets/day}$$
- **Average Write Throughput**:
  $$\text{Write QPS} = \frac{600,000,000 \text{ tweets}}{86,400 \text{ seconds}} \approx 6,944 \text{ tweets/sec}$$
- **Peak Write Throughput (2.5x multiplier)**:
  $$\text{Peak Write QPS} = 6,944 \times 2.5 = 17,360 \text{ tweets/sec}$$

---

### 2.1 Caching Tier Memory Planning (Redis Cluster)
We store home timelines for active users in memory to ensure low-latency reads. A monthly active user (MAU) metric of $600,000,000$ is used, defining active users as those who log in at least once every 30 days.

#### Memory Calculations
- **Active Timelines stored**: $600,000,000$.
- **Feed Size**: Latest 800 tweet IDs per user.
- **ID Size**: 64-bit Snowflake ID ($8 \text{ bytes}$).
- **Redis List Overhead**: Pointers, hashing structures, and wrapper allocations average $32 \text{ bytes}$ per list entry.
- **Total Size per Timeline List**:
  $$S_{\text{list}} = 800 \times (8 \text{ bytes} + 32 \text{ bytes}) = 32,000 \text{ bytes (32 KB)}$$
- **Total RAM Cache Requirement (Active Users)**:
  $$\text{RAM}_{\text{active}} = 600,000,000 \times 32 \text{ KB} = 19.2 \text{ Terabytes of RAM}$$

#### Eviction and Cold Tier Strategies
To prevent cache memory saturation, we classify user accounts using access patterns:
1. **Active Users (active in 7 days)**: Kept in the hot Redis caching tier ($19.2 \text{ TB}$).
2. **Warm Users (active in 8-30 days)**: Timeline caches are evicted from memory to disk (using an SSD-backed caching tier like Redis on Flash).
3. **Cold Users (inactive for >30 days)**: Timeline caches are deleted. When a cold user logs back in, their feed is rebuilt on-the-fly (pull on login) from the persistent Cassandra database.

Applying replication ($N=2$) for high availability, the hot caching tier requires:
$$\text{Total RAM Cluster Capacity} = 19.2 \text{ TB} \times 2 = 38.4 \text{ TB}$$

---

### 2.2 Storage Tier Planning (Cassandra Tweet Store)
The storage tier must persist all tweets indefinitely.

#### Storage Capacity Calculation
- **Average Tweet Size**: $280 \text{ characters}$ (UTF-8, average $280 \text{ bytes}$).
- **Metadata Overhead**: Author ID ($16 \text{ bytes}$ UUID), Tweet ID ($8 \text{ bytes}$ Snowflake ID), timestamp ($8 \text{ bytes}$), attachment links ($128 \text{ bytes}$).
- **Total Payload Size per Tweet**: $440 \text{ bytes}$.
- **Daily Ingestion Footprint**:
  $$\text{Storage}_{\text{daily}} = 600,000,000 \times 440 \text{ bytes} \approx 264 \text{ Gigabytes/day}$$
- **Annual Storage Footprint (with 3x replication)**:
  $$\text{Storage}_{\text{annual}} = 264 \text{ GB/day} \times 365 \text{ days} \times 3 \approx 289 \text{ Terabytes/year}$$

#### Storage IOPS Sizing (Cassandra LSM-Tree)
At peak write volumes ($17,360 \text{ writes/sec}$), the Cassandra cluster must handle the write throughput. Because Cassandra uses LSM-Trees, random writes are serialized in memory and flushed to disk sequentially, making the write IOPS footprint highly efficient. The limiting factor is disk compaction overhead, requiring a 50% storage overhead allocation buffer.

---

### 2.3 Compute Tier Planning (API Gateways & Workers)
- **Ingress Traffic Load**: $300,000 \text{ reads/sec}$ peak.
- **Compute Instance Capacity**: A standard compute container node (e.g., AWS c6g.2xlarge with 8 vCPUs and 16GB RAM) running optimized Go/Scala code can handle $5,000 \text{ HTTP connections/sec}$ under load.
- **Total Compute Replicas Requirement**:
  $$R_{\text{compute}} = \frac{300,000}{5,000} = 60 \text{ container instances}$$
- **Safety Buffer**: A 30% capacity buffer is added to handle load balancing skew and instance startup times, bringing the target allocation to **78 compute instances**.

---

## 3. Scaling Strategy: Diurnal Sinusoidal Workloads

Global internet traffic follows a diurnal pattern, aligned with daylight cycles in populated geographic regions. This workload variation can be modeled using a sinusoidal curve:
$$W(t) = W_{\text{base}} \times \left( 1 + A \sin\left(\frac{2\pi t}{24} + \phi\right) \right)$$
where $A$ is the amplitude fluctuation parameter (typically $0.4$, representing $\pm 40\%$ variations from the base load).

```
  Load Curve (Diurnal Workload):
  Traffic QPS
    ^
    |          /\          /\          /\
    |         /  \        /  \        /  \
    |   ---- / -- \ ---- / -- \ ---- / -- \ ----  <- Base Load (W_base)
    |       /      \    /      \    /      \
    |      /        \  /        \  /        \
    +-------------------------------------------> Time (Hours)
```

### Auto-Scaling Group (ASG) Configurations
To optimize operational costs, the compute tier uses dynamic auto-scaling:
- **Scale-Up Threshold**: Triggered when average CPU utilization across the compute group exceeds 65% for 3 consecutive minutes.
- **Scale-Down Threshold**: Triggered when average CPU utilization drops below 40% for 10 consecutive minutes.
- **Predictive Scaling**: Leverages historical daily logs to pre-provision compute instances 30 minutes before forecasted morning traffic surges, avoiding scaling latency during sharp load transitions.

---

## 4. Stress and Burst Strategy: Handling Surge Events

During major live events (e.g., World Cup finals, election nights), traffic can surge by 5x-10x within seconds. The system must degrade gracefully rather than collapsing under load.

### 4.1 Circuit Breakers
Implemented at the microservice gateway level using the **Netflix Hystrix pattern**:
- **Closed State**: Normal operation. Requests flow to downstream services.
- **Open State**: If downstream call failure rates exceed 15% over a 10-second window, the circuit opens. Subsequent requests bypass the service and receive immediate fallback payloads (e.g., cached timelines).
- **Half-Open State**: After a 60-second cooldown, a small fraction of requests are allowed through to verify service recovery.

### 4.2 Graceful Degradation Policies
When load levels exceed safety margins, the system sheds non-essential features to preserve core functionality:
1. **Disable Typestate Typo Indicators**: Stop rendering active typing signals.
2. **Favour Read-Only Paths**: Temporarily queue write operations longer in Kafka buffers while keeping read paths responsive.
3. **Drop Media Pre-transcoding**: Store media uploads at raw resolution initially, queuing high-definition transcoding operations for off-peak processing hours.
