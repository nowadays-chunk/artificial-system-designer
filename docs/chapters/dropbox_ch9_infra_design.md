# Dropbox Case Study - Chapter 9: Cloud and Virtualization Architecture

## 1. Containerization & Scheduling of Microservices

We package all application microservices (Metadata Registry, WebSockets Sync, User Service) in container images and run them in **Amazon EKS (Elastic Kubernetes Service)**.

```
       [ EKS Kubernetes Worker Nodes ]
                     |
         +-----------+-----------+
         v                       v
  [ Pod: Metadata Service ]   [ Pod: Sync Service ]
  - Requests: 1 Core, 2GB     - Requests: 2 Core, 4GB
  - Limits: 2 Core, 4GB       - Limits: 4 Core, 8GB
```

Container placement is managed automatically by the Kubernetes scheduler based on CPU and memory configurations.

---

## 2. Horizontal Pod Autoscaling (HPA) Sizing

Compute pod scale factors are adjusted dynamically by the HPA based on CPU and custom metrics:
- **Sync workers**: Scaled dynamically based on the queue depth of the `sync-events` Kafka topic. If the queue length exceeds 2,000 messages, additional container instances are launched.
- **Scale-Down Management**: A 5-minute cool-down window is applied to avoid rapid pod termination cycles during temporary load fluctuations.

---

## 3. Spot Instances Integration for Transcoding Workloads

Because sync operations are asynchronous and fault-tolerant, we run background sync tasks on **Amazon EC2 Spot Instances**:
- **Cost Savings**: Spot instances provide up to 90% savings compared to on-demand pricing.
- **Preemption Handling**: If AWS reclaims a spot instance, the compute task is rescheduled on another available node.
