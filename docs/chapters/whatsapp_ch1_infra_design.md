# WhatsApp Case Study - Chapter 1: Infrastructure Architecture Design

## 1. Introduction and System Scale Requirements

Designing the infrastructure architecture for a global instant messaging platform like WhatsApp (2B+ active users) introduces unique scaling challenges. Unlike typical read-heavy web apps, an instant messaging platform must manage hundreds of millions of concurrent, persistent TCP/WebSocket connections, route messages with sub-100ms end-to-end latency, track user presence states in real-time, and buffer offline messages securely.

The system must handle:
- **Active Connections**: Up to 100M+ concurrent persistent socket connections per datacenter.
- **Message Volume**: Over 100 billion messages routed per day.
- **Latency Target**: End-to-end message delivery under 100ms globally in nominal network conditions.

To satisfy these requirements, the architecture decouples the **Live Message Delivery Path** from the **Offline Message Buffering Path**.

---

## 2. Ingress Architecture and Path Splitting

To optimize performance, we split incoming client traffic at the API Gateway layer based on connection type:

```
  Ingress Path:
  [ Mobile / Web Client ]
         |
         | (Persistent TCP / WebSockets / TLS 1.3)
         v
  [ Chat Gateway Tier (Erlang/Elixir Connection Nodes) ]
         |
         +-------------------------+-------------------------+
         | (Online Delivery)                                 | (Offline Buffering)
         v                                                   v
  [ Router Service ]                                  [ Offline Queue Service ]
         |                                                   |
         +===> Check User Presence (Redis Cluster)           +===> Buffer Message (MySQL Shards)
         |                                                   |
         +===> Direct Socket Forward (Active TCP Conn)       +===> Trigger Push Notify (APNs / FCM)
```

### 2.1 Live Message Delivery Path
The live routing path delivers messages instantly:
1. **Persistent Sockets**: Clients maintain a long-lived, encrypted TCP socket to a node in the Chat Gateway Tier.
2. **Router Service**: When User A sends a message to User B, the gateway forwards it to the Router Service.
3. **Presence Verification**: The Router queries a high-throughput Redis cluster to check if User B is currently online.
4. **Direct Delivery**: If User B is active, the Router locates the specific gateway node holding User B's socket and pushes the payload directly down that connection. The message bypasses persistent database writes entirely, allowing sub-50ms transit latencies.

---

### 2.2 Ingress Gateway Connection Loop Pattern
To manage millions of concurrent connections efficiently, we use an asynchronous event-loop architecture.

#### Connection loop and state controller implementation:

```typescript
import * as net from "net";
import { EventEmitter } from "events";

interface SocketSession {
  socket: net.Socket;
  userId: string;
  connectedAt: number;
}

export class ChatGatewayNode extends EventEmitter {
  private activeSessions: Map<string, SocketSession> = new Map(); // Keyed by User ID
  private server: net.Server;

  constructor(port: number) {
    super();
    this.server = net.createServer((socket) => this.handleConnection(socket));
    this.server.listen(port, () => {
      console.log(`[GATEWAY] Gateway connection server active on port ${port}`);
    });
  }

  private handleConnection(socket: net.Socket) {
    let sessionUser: string | null = null;

    // Enforce socket keep-alive to detect dead connections
    socket.setKeepAlive(true, 60000); // 1 minute keep-alive pings

    socket.on("data", async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        // 1. Handle initial session handshake
        if (payload.type === "handshake") {
          sessionUser = payload.userId;
          this.activeSessions.set(sessionUser!, {
            socket,
            userId: sessionUser!,
            connectedAt: Date.now()
          });
          // Update global presence state to Online
          await this.updatePresenceState(sessionUser!, "online");
          socket.write(JSON.stringify({ status: "connected" }));
          return;
        }

        // 2. Route messages if session is authenticated
        if (sessionUser && payload.type === "message") {
          this.emit("message_received", {
            senderId: sessionUser,
            recipientId: payload.recipientId,
            content: payload.content
          });
        }
      } catch (err) {
        socket.write(JSON.stringify({ error: "Invalid payload format" }));
      }
    });

    socket.on("close", async () => {
      if (sessionUser) {
        this.activeSessions.delete(sessionUser);
        // Update global presence state to Offline
        await this.updatePresenceState(sessionUser, "offline");
      }
    });
  }

  private async updatePresenceState(userId: string, state: "online" | "offline") {
    // Write state update to Redis Presence Cache cluster
    console.log(`[PRESENCE] User ${userId} is now ${state}`);
  }

  /**
   * Pushes a message directly to an active socket connection.
   */
  public deliverMessage(recipientId: string, payload: any): boolean {
    const session = this.activeSessions.get(recipientId);
    if (session && !session.socket.destroyed) {
      session.socket.write(JSON.stringify(payload));
      return true;
    }
    return false;
  }
}
```

---

### 2.3 Offline Message Buffering Path
The offline path manages message delivery to disconnected clients:
1. **Offline Buffering**: If User B is offline, the Router redirects the message to the Offline Queue Service.
2. **Metadata Buffering**: The service writes the transient message payload to a database shard (using a sharded MySQL configuration optimized for fast sequential appends).
3. **Push Notification**: The system calls mobile push gateways (APNs / FCM) to wake up the recipient's device.
4. **Drain and Delete**: When the client reconnects, it pulls any pending messages from the offline tables. Once the client sends a delivery receipt, the server deletes the messages.
