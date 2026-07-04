# Twitter Case Study - Chapter 12: Collaboration and Stakeholder Communication

## 1. Cross-Functional Engineering Alignment (RFC Process)

Launching new infrastructure components (e.g. migrating search indexes to Elasticsearch or updating the caching tier topology) requires alignment across multiple engineering disciplines. To coordinate these teams, we use a structured **Request for Comments (RFC)** process.

```
                  +---------------------------------------+
                  |         Infrastructure Architect      |
                  +---------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
  [ Product Team ]             [ SRE Team ]                 [ DBA / SecOps ]
  (Feature design/code)        (SLOs, scale rules)          (Queries index, WAF)
```

### 1.1 Stakeholder Roles
- **Product Engineers**: Deliver application features and API endpoints, focusing on developer velocity and API ergonomics.
- **SRE Teams**: Focus on reliability, defining Service Level Objectives (SLOs), auto-scaling rules, and monitoring alert configurations.
- **DBAs**: Optimize queries, index models, and database partition keys to maintain storage performance.
- **Security Teams**: Audit access control policies, security groups, and encryption key rotation configurations.

---

### 1.2 RFC Lifecycle
1. **Drafting**: The proposing team documents the architecture changes, design context, trade-offs, and rollback options in an RFC document.
2. **Review**: The draft is shared with all engineering groups for asynchronous review and comment.
3. **Review Board**: SRE and Security leads review the RFC to verify compliance with scaling policies, encryption standards, and budget constraints.
4. **Approval**: Approved designs are merged into the central repository, and tasks are scheduled for implementation.

---

## 2. Cost and Performance Reviews with Stakeholders

Infrastructure choices directly impact operational budgets. We run monthly cost reviews with finance and engineering directors.

### 2.1 Cost Allocation Reporting
- **Grouping**: Resource costs are grouped by team tag (e.g. `owner` labels) to track resource efficiency.
- **Idle Sizing**: Monitoring idle resource metrics helps identify over-provisioned staging clusters.

---

### 2.2 Cost-to-Traffic Efficiency KPI
We monitor the cost-per-million-requests metric to track efficiency:
$$\text{Efficiency KPI} = \frac{\text{Monthly Infrastructure Expenses}}{\text{Total Requests (Millions)}}$$

If this KPI rises, it indicates that the system is consuming more resources per request, triggering investigations into memory leaks, database index saturation, or inefficient queries.

---

## 3. Incident Management & Blameless Post-Mortems

During system outages, the Incident Commander coordinates recovery operations. Following resolution, we run a blameless post-mortem review.

### 3.1 Post-Mortem Structure
1. **Executive Summary**: A high-level description of what happened, the user impact, and the resolution.
2. **Timeline**: A chronological log of the incident, from detection to full recovery.
3. **RCA (Root Cause Analysis)**: Analyzes the underlying issue using the Five Whys methodology.
4. **Action Items**: Post-mortem action items are prioritized in development sprints to address vulnerabilities and prevent recurrence.

---

### 3.2 Root Cause Analysis Example (Five Whys)
- **Problem**: Users received HTTP 500 errors when loading home timelines.
- **Why?**: The Timeline Service could not fetch cached tweet IDs from Redis.
- **Why?**: The Redis cluster node became unresponsive due to memory saturation.
- **Why?**: A celebrity with 10 million followers posted a tweet, triggering a write-intensive fan-out storm that saturated the cache node.
- **Why?**: The hybrid pull-on-read model threshold was set to 50,000 followers, which was too high to prevent write storms on celebrity tweets.
- **Remediation**: Adjust the celebrity write-bypass threshold to 10,000 followers and enforce rate limits on fan-out queues.
