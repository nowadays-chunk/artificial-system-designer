# Spotify Case Study - Chapter 3: Technology Selection and Standards

## 1. Evaluation Matrix: Storage Selection for Playlists and Catalog Metadata

To persist user playlist definitions (which can contain thousands of song ID references) and the catalog metadata database, the storage engine must support low-latency reads and writes:

- **Apache Cassandra**: Selected for catalog and playlist storage due to its wide-column storage engine, multi-datacenter replication capabilities, and predictable scaling profiles under high write loads.
- **Relational Databases (PostgreSQL)**: PostgreSQL is used to manage relational datasets, such as user profiles, billing history, and system configurations, where ACID guarantees are required.

---

## 2. Audio File Packaging Formats: Ogg Vorbis vs. MP3

For audio encoding and storage:
- **Ogg Vorbis (and AAC)**: Selected as the compression standard because it provides higher audio fidelity at lower bitrates (e.g., 96kbps, 160kbps, 320kbps) than legacy MP3 formats, minimizing CDN storage footprints and egress bandwidth consumption.

---

## 3. Playlists Cassandra Table Schema Design

To model user playlists in Cassandra:

```sql
CREATE TABLE spotify_playlists.playlists (
    playlist_id uuid,
    track_id uuid,
    added_at timestamp,
    track_order int,
    PRIMARY KEY (playlist_id, track_id)
);
```

This schema partitions playlists by `playlist_id`, grouping track records on disk to enable fast, single-query retrieval of playlist tracks.
