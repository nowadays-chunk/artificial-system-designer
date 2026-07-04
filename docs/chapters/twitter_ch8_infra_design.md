# Twitter Case Study - Chapter 8: Infrastructure Implementation Oversight

## 1. Automated Topology Validation Policy Gates

To prevent human error during infrastructure updates, our deployment pipelines enforce automated validation gates. When developers modify infrastructure layouts (e.g. adding a container pod, changing database replicas, or adjusting network routes), the modifications are serialized to a JSON topology document and audited before deployment.

```
       [ Infrastructure Layout Update ]
                      |
                      v
       [ Automated Policy Validator ]
         /                        \
        / (Fails Rules?)           \ (Passes)
       v                            v
  [ Block Deployment ]         [ Plan Staging Test ]
```

### 1.1 Custom Validation Policy Rules
The validator enforces policies, categorizing violations by severity:
- **Blockers (Severe)**: Unreplicated databases, public-facing data endpoints without firewalls, or direct compute-to-database connections at peak loads. These violations halt the CI/CD pipeline immediately.
- **Warnings (Medium)**: Compute instances with high replica counts and low traffic demand, or missing CDN configurations. These trigger pipeline warnings but allow deployments to proceed.

---

### 1.2 Cut-Vertex Graph Analysis (SPOF Audits)
To detect Single Points of Failure (SPOFs) at the database and routing tiers, the validator parses the layout topology as a directed graph $G=(V,E)$ and runs **Tarjan's Bridge-Finding Algorithm**.

A node $v \in V$ is flagged as a cut-vertex (SPOF) if removing it increases the number of connected components:
$$\text{Components}(G \setminus \{v\}) > \text{Components}(G)$$

```typescript
export class TopologyValidator {
  private adjacencyList: Map<string, string[]> = new Map();

  /**
   * Identifies if a specific node is a Single Point of Failure (SPOF) in the graph.
   * Runs Tarjan's cut-vertex detection algorithm.
   */
  public findCutVertices(nodes: string[], edges: { source: string; target: string }[]): string[] {
    this.adjacencyList.clear();
    nodes.forEach(n => this.adjacencyList.set(n, []));
    
    // Build undirected representation for connectivity checks
    edges.forEach(e => {
      this.adjacencyList.get(e.source)?.push(e.target);
      this.adjacencyList.get(e.target)?.push(e.source);
    });

    const discoveryTime: Map<string, number> = new Map();
    const lowValue: Map<string, number> = new Map();
    const parentNode: Map<string, string | null> = new Map();
    const visitedNodes: Map<string, boolean> = new Map();
    const cutVertices: Set<string> = new Set();
    let time = 0;

    const dfs = (u: string) => {
      visitedNodes.set(u, true);
      discoveryTime.set(u, ++time);
      lowValue.set(u, time);
      let children = 0;

      const neighbors = this.adjacencyList.get(u) || [];
      for (const v of neighbors) {
        if (!visitedNodes.get(v)) {
          children++;
          parentNode.set(v, u);
          dfs(v);

          // Check if subtree has a back-edge to an ancestor of u
          lowValue.set(u, Math.min(lowValue.get(u)!, lowValue.get(v)!));

          // Condition 1: u is root and has 2+ children
          if (parentNode.get(u) === null && children > 1) {
            cutVertices.add(u);
          }
          // Condition 2: u is not root and low value of child is >= discovery time of u
          if (parentNode.get(u) !== null && lowValue.get(v)! >= discoveryTime.get(u)!) {
            cutVertices.add(u);
          }
        } else if (v !== parentNode.get(u)) {
          lowValue.set(u, Math.min(lowValue.get(u)!, discoveryTime.get(v)!));
        }
      }
    };

    nodes.forEach(node => {
      if (!visitedNodes.get(node)) {
        parentNode.set(node, null);
        dfs(node);
      }
    });

    return Array.from(cutVertices);
  }
}
```

---

## 2. Chaos Engineering Staging Simulation Scenarios

Before deploying infrastructure changes to production, we validate them under load in staging environments.

### 2.1 Staging Simulation Profiles
Using the modeler's simulation engine, we simulate three workload profiles:
- **Burst Profile**: Simulates a 10x traffic spike over a 30-second window to verify that auto-scaling groups scale up timely and queues handle backpressure.
- **Dependency Failure Profile**: Simulates cache node outages to verify that database lock mechanisms prevent cache stampedes.
- **Diurnal Profile**: Simulates a 24-hour load cycle to evaluate cost efficiency and verify that scaling thresholds match load curves.

---

### 2.2 Chaos Engineering Rulesets
SRE teams run automated chaos test runs (e.g. using Chaos Mesh or Gremlin) to inject faults during staging simulations:
- **Database Latency Injection**: Injects +450ms latency on database connection links to verify that read/write timeout and retry thresholds are enforced correctly.
- **Cache Eviction Storms**: Evicts 50% of home feed keys from Redis caches to test caching fallback behaviors under load.
- **Link Outages**: Disconnects connection channels between compute containers and database replicas to verify that routing gateways failover to standby replicas.

---

## 3. Zero-Downtime Migration Runbooks

Upgrading live databases or modifying routing topologies at scale requires zero-downtime migration strategies.

---

### 3.1 Blue-Green Deployment Pattern
We use blue-green deployments for stateless compute service upgrades:
- **Blue Environment**: The current active production tier.
- **Green Environment**: The new version tier deployed in parallel.
- **Traffic Transition**: The gateway routes a small percentage of requests (e.g., 2% canary traffic) to the Green tier. If error rates and latencies remain normal, the traffic transition is gradually scaled to 100%.

```
    Blue-Green Traffic Migration:
    [ Ingress Router ] =======( 98% Traffic )=======> [ Blue Tier (v1.0) ]
                       \======(  2% Traffic )=======> [ Green Tier (v1.1) ]
```

---

### 3.2 Database Schema Upgrades (Dual-Write Phase)
Upgrading database schemas without downtime requires a multi-phase write cycle:
1. **Phase 1 (Deploy Code)**: Application writes to both the old database table and the new database table, reading only from the old table.
2. **Phase 2 (Migrate Data)**: Run background migration jobs to copy historical records from the old table to the new table.
3. **Phase 3 (Verify & Read)**: Switch the application to read from the new table. Verify data consistency.
4. **Phase 4 (Cleanup)**: Remove the dual-write logic and decommission the old table.
