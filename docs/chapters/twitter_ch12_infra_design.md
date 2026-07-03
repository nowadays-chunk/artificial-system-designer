# Twitter Case Study - Chapter 12: Collaboration and Stakeholder Communication

## 1. Cross-Functional Engineering Alignment

Infrastructure architects must align technical designs across multiple engineering disciplines. A typical feature launch requires coordination between:
- **Product Engineers**: Deliver application features and logic.
- **Site Reliability Engineers (SREs)**: Manage SLO targets and scaling groups.
- **Database Administrators (DBAs)**: Optimize query index models.
- **Security Operations (SecOps)**: Run vulnerability audits and enforce access control policies.

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

To coordinate these teams, we use **RFC (Request for Comments)** cycles before implementing major architecture changes, ensuring all stakeholders review and sign off on designs.

---

## 2. Cost and Performance Reviews with Stakeholders

Infrastructure choices directly impact operational budgets. We run monthly cost reviews with finance and engineering directors:
- **Cost Allocation Reporting**: Resource costs are grouped by team tag (e.g. `owner` labels) to track resource efficiency.
- **Cost-to-Traffic Efficiency KPI**: We monitor the cost-per-million-requests metric:
  $$\text{Efficiency KPI} = \frac{\text{Monthly Infrastructure Expenses}}{\text{Total Requests (Millions)}}$$
  An increase in this metric triggers investigations into potential memory leaks or over-provisioned compute resources.

---

## 3. Incident Post-Mortems and Remediation Tracking

When production outages occur, we write blameless post-mortems to document the event and prevent recurrence.

### 3.1 Post-Mortem Structure
1. **Executive Summary**: A high-level description of what happened, the user impact, and the resolution.
2. **Timeline**: A chronological log of events from the first alert to full recovery.
3. **Root Cause Analysis (RCA)**: Uses the **Five Whys** methodology to identify the underlying issue.
4. **Action Items**: A list of tracked tickets to resolve the vulnerabilities. Action items must be completed within 14 days of the incident review.
