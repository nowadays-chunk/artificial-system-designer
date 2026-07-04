# Google Docs Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a real-time collaborative editing platform like Google Docs (100M+ active users) introduces unique scaling and concurrency challenges. Unlike typical read-heavy content platforms, collaborative editors require handling high-frequency write operations, managing real-time WebSocket connection loops, resolving concurrent editing conflicts, and ensuring low-latency, consistent updates across editing sessions.

The system must handle:
- **Write Volume (Collaborative Edits)**: Average of 50,000 edit events per second globally, peaking at 150,000+ edits per second.
- **Read Volume (Snapshot Views)**: Average of 100,000 document reads per second.
- **Latency Target**: End-to-end character synchronization latency under 100ms globally to ensure smooth collaborative editing.

To meet these requirements, the architecture separates the **Live Collaborative Edit Write Path** from the **High-Availability Snapshot Read Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on request path parameters:

```
  Ingress Path:
  [ Ingress Gateway (Anycast, Cloudflare Edge) ]
         |
         +-------------------------+-------------------------+
         | (Collaborative edits: WebSocket)                  | (Static reads: HTTP GET /api/doc)
         v                                                   v
  [ WebSocket Sync Gateways ]                         [ Document Reader API ]
         |                                                   |
         +===> Dynamic Conflict Resolve (OT Service)         +===> Read Stable Snapshot (PostgreSQL)
         |                                                   |
         +===> Cache Delta Updates (Redis Cache)             +===> Return Rendered Document
```

### 2.1 Live Collaborative Edit Write Path
The edit path manages real-time synchronization:
1. **WebSocket Connection**: The client app establishes a full-duplex WebSocket connection to a WebSocket Sync Gateway.
2. **Operational Transformation (OT) Sync Service**: When a user types, the client sends edit operations (insertions, deletions, formatting) as character deltas. The gateway forwards these deltas to the OT Sync Service.
3. **Conflict Resolution**: The OT Service serializes incoming deltas, applies Operational Transformation logic to resolve conflicts from concurrent typists, updates document state in a Redis cache, and broadcasts the transformed operations to other collaborators.
4. **Asynchronous Composing**: A background composer worker consolidates cached delta sequences and writes consolidated document snapshots to the PostgreSQL database every 10 seconds, offloading the primary write path.

---

### 2.2 WebSocket Ingestion Gateway Handshake Pattern
To manage WebSocket connection states securely:
1. **HTTP Upgrade Request**: The client requests a connection upgrade from HTTP/1.1 to WebSockets, passing an authorization token.
2. **Token Validation**: The gateway validates the token, resolves user credentials and document permissions, and establishes a persistent socket connection.

#### Gateway WebSocket connection controller implementation:

```typescript
import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as jwt from "jsonwebtoken";

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  documentId: string;
}

export class WebSocketGateway {
  private wss = new WebSocketServer({ noServer: true });
  private activeConnections: Map<string, Set<ClientConnection>> = new Map(); // Grouped by document ID
  private jwtPublicKey = "public-key-string";

  /**
   * Handles HTTP connection upgrade requests to initialize WebSockets.
   */
  public handleUpgrade(req: IncomingMessage, socket: any, head: Buffer) {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const documentId = url.searchParams.get("docId");

    if (!token || !documentId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      // Validate token signature and retrieve permissions
      const payload = jwt.verify(token, this.jwtPublicKey, { algorithms: ["RS256"] }) as any;
      const userId = payload.sub;

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const connection: ClientConnection = { ws, userId, documentId };
        this.addConnection(documentId, connection);

        ws.on("message", (message: string) => {
          this.routeOperation(documentId, userId, message);
        });

        ws.on("close", () => {
          this.removeConnection(documentId, connection);
        });
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  }

  private addConnection(documentId: string, conn: ClientConnection) {
    if (!this.activeConnections.has(documentId)) {
      this.activeConnections.set(documentId, new Set());
    }
    this.activeConnections.get(documentId)?.add(conn);
  }

  private removeConnection(documentId: string, conn: ClientConnection) {
    this.activeConnections.get(documentId)?.delete(conn);
  }

  private routeOperation(documentId: string, userId: string, operationJson: string) {
    // Forward operation data payload to conflict resolution queue (Kafka)
    console.log(`[ROUTE] Operation received for doc: ${documentId} from user: ${userId}`);
  }
}
```

---

## 3. High-Availability Snapshot Read Path

The read path serves document views to users:
1. **Metadata Lookup**: When a user opens a document link, the Document Reader API queries PostgreSQL read replicas to retrieve the latest consolidated document snapshot.
2. **Delta Hydration**: The service fetches any uncommitted delta operations from Redis caches and applies them to the snapshot, returning the reconstructed document state to the client.
