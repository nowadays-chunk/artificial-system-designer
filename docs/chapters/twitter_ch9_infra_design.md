# Twitter Case Study - Chapter 9: Cloud and Virtualization Architecture

## 1. Containerization & Orchestration (EKS Kubernetes)

At scale, deploying microservices directly to virtual machine instances introduces significant deployment and resource allocation overhead. To achieve high density and rapid deployments, the compute tier is containerized using **Docker** and orchestrated using **Amazon EKS (Elastic Kubernetes Service)**.

```
       [ EKS Kubernetes Cluster (Control Plane) ]
                           |
         +-----------------+-----------------+
         |                                   |
         v                                   v
  [ API Gateway Pods ]               [ Fan-Out Worker Pods ]
  (Resource Limits: 2 Core, 4GB)     (Resource Limits: 4 Core, 8GB)
```

### 1.1 Kubernetes Pod Resource Definitions
For every microservice, we define strict resource allocation schemas (`requests` and `limits`) to prevent container resource starvation and ensure stable scheduling:
- **`requests`**: The minimum CPU and memory capacity required to schedule a pod on a worker node.
- **`limits`**: The maximum CPU and memory capacity a pod can consume before the container runtime throttles its CPU cycles or terminates it due to an Out-Of-Memory (OOM) error.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tweet-service-deployment
  namespace: twitter-prod
spec:
  replicas: 48
  selector:
    matchLabels:
      app: tweet-service
  template:
    metadata:
      labels:
        app: tweet-service
    spec:
      containers:
      - name: tweet-service-container
        image: twitter/tweet-service:v1.2.4
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m" # 1 vCPU
          limits:
            memory: "4Gi"
            cpu: "2000m" # 2 vCPUs
        ports:
        - containerPort: 50051 # gRPC port
```

---

## 2. Kubernetes Horizontal Pod Autoscaling (HPA)

To handle diurnal traffic patterns automatically, we configure HPAs to adjust pod counts based on target metrics.

### 2.1 HPA Scaling Equation
The HPA computes the target replica count using the ratio of active metrics to target metrics:
$$\text{Target Replicas} = \left\lceil \text{Current Replicas} \times \left( \frac{\text{Current Metric Value}}{\text{Target Metric Value}} \right) \right\rceil$$

For CPU-bound compute services (e.g., Timeline Server), the scale target is set to **60% average CPU utilization**.

### 2.2 Cooldown Periods
To prevent **thrashing** (rapid scale-up and scale-down cycles triggered by transient load spikes), we configure cooldown periods:
- **Scale-Up Delay**: Set to `0` seconds. When load spikes, replicas scale up immediately to handle the traffic.
- **Scale-Down Delay**: Set to `300` seconds (5 minutes). Replicas remain active during short dips in traffic to handle subsequent surges.

---

## 3. Hybrid Cloud Infrastructure Model

For high-scale persistent storage (Cassandra, Kafka, Redis), public cloud resource costs can be prohibitive. To optimize expenses, the system uses a hybrid cloud model:

```
  [ Public Cloud Tier (AWS US-East-1) ] <===( Direct Connect Link )===> [ Private Datacenters ]
  - API Gateways & Edge Routers                                         - Cassandra clusters
  - Stateless compute microservices                                      - Kafka commit log buses
  - Client-facing application servers                                    - Bare-metal storage nodes
```

- **Public Cloud (AWS)**: Hosts stateless compute services, API Gateways, and auto-scaling app servers close to user egress points.
- **Private Datacenters**: Host persistent storage tiers (Cassandra clusters, Redis caches, and Kafka brokers) on dedicated bare-metal nodes, avoiding high public cloud network egress fees.
- **Direct Connect Link**: Dedicated fiber connections (100Gbps+) link AWS VPC networks to private datacenter switches, providing low-latency, secure communication channels.
