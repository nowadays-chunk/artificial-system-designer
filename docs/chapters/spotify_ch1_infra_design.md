# Spotify Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global music streaming platform at the scale of Spotify (500M+ Daily Active Users) requires separating high-availability metadata storage (playlists, catalog queries) from low-latency audio file streaming delivery channels.

The infrastructure must support:
- **Write Volume (Playlist Changes)**: Average of 2,000 edits/additions per second, peaking at 5,000+ edits per second.
- **Read Volume (Playback Starts)**: Average of 80,000 song streams initiated per second, peaking at 180,000+ requests per second.
- **Data Catalog Size**: 100M+ music tracks and podcasts metadata records.

To satisfy these requirements, the architecture decouples metadata management (ACID/relational dependencies) from the audio streaming pipeline.

---

## 2. Ingress Architecture and Stream Splitting

```
  Ingress Path:
  [ Ingress Gateway (Anycast, CDN Edge) ]
         |
         +-------------------------+-------------------------+
         | (Metadata Query)                                  | (Audio Streaming)
         v                                                   v
  [ Catalog API Service ]                             [ Audio Streaming API ]
         |                                                   |
         +===> Read Catalog (Cassandra Cluster)              +===> Fetch Audio File (Regional CDN)
         |                                                   |
         +===> Load Playlists (PostgreSQL Primary)           +===> Fetch Encrypted Key (KMS Vault)
```

### 2.1 Metadata Query Paths
1. **Catalog API Service**: Handles requests for album listings, user search profiles, artist metadata, and user playlists.
2. **Persistence Storage**: Hits Cassandra clusters (for wide-column catalog metadata) and PostgreSQL replication sets (for user playlists).

### 2.2 Audio Streaming Paths
1. **Audio Streaming API**: Receives song playback requests, validates user session parameters, and generates pre-signed streaming tokens.
2. **Audio Egress Route**: Client apps fetch encrypted Ogg Vorbis/AAC audio file blocks directly from geographic CDN edge caching endpoints, reducing origin bandwidth consumption.
3. **Decryption Keys**: Client apps fetch short-lived content decryption keys from Key Management Services (KMS) to enable playbacks.
