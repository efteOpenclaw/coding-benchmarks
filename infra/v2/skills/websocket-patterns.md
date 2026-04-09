---
name: websocket-patterns
description: WebSocket server with ws package — auth via session token, presence tracking, server-authoritative events. Use when building real-time features, WebSocket handlers, or presence systems.
globs: "**/server.ts,**/ws/**,**/websocket/**,**/lib/ws.ts"
---

# WebSocket Patterns — ws + Custom Server

## Custom server.ts wrapping Next.js (copy this)

```typescript
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { unsealData } from 'iron-session';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  currentPage: string | null;
}

const clients = new Map<string, AuthenticatedSocket>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', async (ws: AuthenticatedSocket, req) => {
    // Auth: verify session token from query param
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) { ws.close(4001, 'Missing token'); return; }

    try {
      const session = await unsealData<{ userId: string }>(token, {
        password: process.env.SESSION_SECRET!,
      });
      ws.userId = session.userId;
      ws.currentPage = null;
      clients.set(ws.userId, ws);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      // Server-authoritative: validate and re-broadcast
      if (msg.type === 'presence:page') {
        ws.currentPage = msg.slug;
        broadcastPresence();
      }
    });

    ws.on('close', () => {
      clients.delete(ws.userId);
      broadcastPresence();
    });
  });

  server.listen(3000);
});
```

## Server-authoritative events (CRITICAL)

```typescript
// GOOD — server decides what to broadcast
function broadcastPageUpdate(slug: string, revisionId: string, editedBy: string) {
  broadcast({ type: 'page:updated', slug, revision_id: revisionId, edited_by: editedBy });
}

// BAD — client sends event, server re-broadcasts blindly
ws.on('message', (msg) => {
  broadcast(msg); // Client can fake any event!
});
```

## Rules

1. ALWAYS authenticate WebSocket connections via session token.
2. NEVER trust client-sent events — server validates and re-broadcasts.
3. ALWAYS clean up on disconnect (remove from clients map, release locks).
4. Use typed message interfaces for all event payloads.
5. Lock release on disconnect: if user held a lock, release it when socket closes.
