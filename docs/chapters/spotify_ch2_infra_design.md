# Spotify Case Study - Chapter 2: Infrastructure Modeling

## 1. Directed Dependency Modeling for Audio Streaming

We represent Spotify's catalog management and playback delivery network as a directed dependency graph:
$$G = (V, E)$$
where:
- **Vertices ($V$)**: Represent streaming components (e.g., Ingress Gateways, Playlist Service, CDN Edges, DRM Keys Host).
- **Directed Edges ($E$)**: Represent communication and data-flow links.

```
       [ Client Gateway ] ---> [ Playback Controller ] ---> [ DRM Service ]
              |
              +--------------> [ Playlist Manager ] ---> [ Cassandra Nodes ]
```

---

## 2. Vertex Node Attributes for Spotify

### 2.1 Playlist Management Services (Compute Nodes)
- **Replicas**: Scaled dynamically based on active socket connection counts.
- **CPU Allocations**: Provisioned with 2 vCPUs per container replica.

### 2.2 Relational Playlist Database Nodes (Stateful)
- **RAM allocations**: Buffer pool configured to cache active playlists.
- **Disk IOPS**: Minimum of 10,000 IOPS on SSDs to handle write-heavy playlist edits.

---

## 3. Serializing the Graph: JSON Schema Representation

```json
{
  "diagramId": "spotify-core-topology",
  "version": 1,
  "nodes": [
    {
      "id": "node-audio-cdn-edge",
      "label": "Audio CDN Edge",
      "type": "cdn-cache",
      "settings": {
        "cacheCapacityTB": 500,
        "hitRateTarget": 0.98
      }
    },
    {
      "id": "node-playlist-cassandra",
      "label": "Cassandra Playlist Ring",
      "type": "database",
      "settings": {
        "nodesCount": 36,
        "ram": 64
      }
    },
    {
      "id": "node-drm-keys-host",
      "label": "DRM KMS Keys Host",
      "type": "kms-vault",
      "settings": {
        "replicas": 6,
        "hsmEnabled": true
      }
    }
  ],
  "edges": [
    {
      "id": "edge-client-to-cdn",
      "source": "node-audio-cdn-edge",
      "target": "node-drm-keys-host",
      "protocol": "grpc-tls"
    }
  ]
}
```
