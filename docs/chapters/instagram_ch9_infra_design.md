# Instagram Case Study - Chapter 9: Cloud and Virtualization Architecture

## 1. Containerization & Scheduling of Microservices

We package all application microservices (Feed Service, Comments Service, User Registry, Notifications Gateway) in container images and run them in **Amazon EKS (Elastic Kubernetes Service)**.

```
       [ EKS Kubernetes Worker Nodes ]
                     |
         +-----------+-----------+
         v                       v
  [ Pod: Feed Service ]   [ Pod: Comments Service ]
  - Requests: 1 Core, 2GB  - Requests: 0.5 Core, 1GB
  - Limits: 2 Core, 4GB    - Limits: 1 Core, 2GB
```

To optimize server resource density, container placement is handled automatically by the Kubernetes scheduler based on CPU and memory configurations.

---

## 2. Horizontal Pod Autoscaling (HPA) Sizing

Compute pod scale factors are adjusted dynamically by the HPA based on CPU and custom metrics:
- **Transcoding workers**: Scaled dynamically based on the queue depth of the `media-uploads` Kafka topic. If the queue length exceeds 1,000 messages, additional container instances are launched.
- **Scale-Down Management**: A 5-minute cool-down window is applied to avoid rapid pod termination cycles during temporary load fluctuations.

---

## 3. Spot Instances Integration for Transcoding Workloads

Because transcoding operations are asynchronous and fault-tolerant, we run transcoding workloads on **Amazon EC2 Spot Instances**:
- **Cost Savings**: Spot instances provide up to 90% savings compared to on-demand pricing.
- **Preemption Handling**: If AWS reclaims a spot instance, the transcoding event is returned to the Kafka queue, where another worker picks it up for processing.
