# YouTube Case Study - Chapter 9: Cloud and Virtualization Architecture

## 1. Containerization & Scheduling of Microservices

Deploying microservices directly to virtual machines introduces significant deployment overhead, resource underutilization, and packaging inconsistencies. To achieve high density and deployment agility, our stateless compute microservices (e.g. Playback Broker, Ingestion Service) are containerized using **Docker** and orchestrated using **Amazon EKS (Elastic Kubernetes Service)**.

```
       [ EKS Kubernetes Worker Node Array ]
                       |
         +-------------+-------------+
         v                           v
  [ Pod: Playback Broker ]    [ Pod: Ingestion Service ]
  - Requests: 2 Core, 4GB     - Requests: 1 Core, 2GB
  - Limits: 4 Core, 8GB       - Limits: 2 Core, 4GB
```

---

### 1.1 Kubernetes Resource Sizing Allocations
For each service, we define strict resource allocation boundaries (`requests` and `limits`):
- **`requests`**: The minimum CPU and memory capacity required to schedule a pod on a worker node. The scheduler uses this value to place pods without over-provisioning nodes.
- **`limits`**: The maximum CPU and memory capacity a pod can consume before the container runtime throttles its CPU cycles or terminates it due to an Out-Of-Memory (OOM) error.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broker-service-deployment
  namespace: youtube-prod
spec:
  replicas: 48
  selector:
    matchLabels:
      app: broker-service
  template:
    metadata:
      labels:
        app: broker-service
    spec:
      containers:
      - name: broker-service-container
        image: youtube/broker-service:v3.2.0
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m" # 2 vCPU cores
          limits:
            memory: "8Gi"
            cpu: "4000m" # 4 vCPU cores
        ports:
        - containerPort: 50051 # gRPC port
```

---

### 1.2 Pod Anti-Affinity Design
To prevent single-point-of-failure (SPOF) scenarios at the hardware level, we enforce **Pod Anti-Affinity** rules. These rules prevent Kubernetes from scheduling replica pods of the same service on the same physical host or availability zone (AZ).

```yaml
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - broker-service
            topologyKey: "topology.kubernetes.io/zone"
```
This configuration forces EKS to distribute `broker-service` pods across distinct availability zones, ensuring that an AZ outage does not disrupt service availability.

---

## 2. Horizontal Pod Autoscaling (HPA) and Sizing Equations

To handle diurnal traffic patterns automatically, we configure HPAs to adjust pod counts based on target metrics.

### 2.1 HPA Scaling Equation
The HPA computes the target replica count using the ratio of active metrics to target metrics:
$$\text{Target Replicas} = \left\lceil \text{Current Replicas} \times \left( \frac{\text{Current Metric Value}}{\text{Target Metric Value}} \right) \right\rceil$$

For CPU-bound compute services (e.g., Playback Broker), the scale target is set to **65% average CPU utilization**.

---

### 2.2 Pod Termination Lifecycle and Cool-downs
To prevent **thrashing** (rapid scale-up and scale-down cycles triggered by transient load spikes), we configure cooldown periods:
- **Scale-Up Delay**: Set to `0` seconds. When load spikes, replicas scale up immediately to handle the traffic.
- **Scale-Down Delay**: Set to `300` seconds (5 minutes). Replicas remain active during short dips in traffic to handle subsequent surges.

During scale-down events, Kubernetes terminates pods by sending a `SIGTERM` signal. The application is configured to handle this gracefully:
1. **Deregistration**: The pod deregisters from the service discovery registry (e.g. Consul) to stop receiving new request traffic.
2. **Graceful Wait**: The pod waits for 15 seconds to finish processing active connections.
3. **Shutdown**: The container shuts down, and any remaining processes are terminated via `SIGKILL`.

---

## 3. Hybrid Cloud Infrastructure Model

For high-scale persistent storage (PostgreSQL, Kafka, Redis), public cloud resource costs can be prohibitive. To optimize expenses, the system uses a hybrid cloud model:

```
  [ Public Cloud Tier (AWS US-East-1) ] <===( Direct Connect Link )===> [ Private Datacenters ]
  - API Gateways & Edge Routers                                         - PostgreSQL clusters
  - Stateless compute microservices                                      - Kafka commit log buses
  - Client-facing application servers                                    - Bare-metal storage nodes
```

- **Public Cloud (AWS)**: Hosts stateless compute services, API Gateways, and auto-scaling app servers close to user egress points.
- **Private Datacenters**: Host persistent storage tiers (PostgreSQL clusters, Redis caches, and Kafka brokers) on dedicated bare-metal nodes, avoiding public cloud network egress fees.
- **Direct Connect Link**: Dedicated fiber connections (100Gbps+) link AWS VPC networks to private datacenter switches, providing low-latency, secure communication channels.
