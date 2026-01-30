# Realtime Notification Service Platform

A robust, production-ready realtime notification service built with Node.js and WebSockets. This platform allows anyone to use it as a service for sending real-time notifications to connected clients.

## Features

- ✅ **Real-time WebSocket connections** - Instant notification delivery
- ✅ **RESTful API** - Easy integration with HTTP endpoints
- ✅ **API Key Authentication** - Secure access control
- ✅ **Channel-based subscriptions** - Targeted notification delivery
- ✅ **Priority queue system** - Handle urgent notifications first
- ✅ **Automatic retry mechanism** - Ensures reliable delivery
- ✅ **Message expiry** - Prevents old messages from clogging the queue
- ✅ **Heartbeat monitoring** - Automatic connection health checks
- ✅ **Comprehensive error handling** - Robust error management
- ✅ **Configurable via environment variables** - Easy deployment
- ✅ **Logging system** - Track all operations
- ✅ **Statistics and monitoring** - Real-time service metrics

## Installation

```bash
cd "02 - Realtime Notification Service"
npm install
```

## Quick Start

### 1. Start the Server

```bash
npm start
```

The service will start on:
- REST API: `http://localhost:3000`
- WebSocket: `ws://localhost:3001`

### 2. Create an API Key

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"clientName": "MyApp"}'
```

Response:
```json
{
  "success": true,
  "apiKey": "your-generated-api-key-here",
  "clientName": "MyApp",
  "message": "API key created successfully"
}
```

### 3. Connect via WebSocket

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'authenticate',
    apiKey: 'your-api-key'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'authenticated') {
    // Subscribe to a channel
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'updates'
    }));
  }
  
  if (message.type === 'notification') {
    console.log('Notification:', message.notification);
  }
});
```

### 4. Send a Notification

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "channel": "updates",
    "data": {
      "title": "New Message",
      "body": "You have a new notification!"
    },
    "priority": 8
  }'
```

## API Reference

### REST API Endpoints

#### API Key Management

**Create API Key**
```http
POST /api/keys
Content-Type: application/json

{
  "clientName": "MyApp"
}
```

**List API Keys**
```http
GET /api/keys
```

**Get API Key Info**
```http
GET /api/keys/:key
```

**Revoke API Key**
```http
DELETE /api/keys/:key
```

#### Notification Management

**Send Notification**
```http
POST /api/notifications
Content-Type: application/json
X-API-Key: your-api-key

{
  "channel": "channel-name",
  "data": {
    "title": "Notification Title",
    "body": "Notification content"
  },
  "priority": 5,
  "metadata": {}
}
```

**Broadcast Notification**
```http
POST /api/notifications/broadcast
Content-Type: application/json
X-API-Key: your-api-key

{
  "channel": "channel-name",
  "data": {
    "message": "Broadcast message"
  },
  "priority": 7
}
```

#### Monitoring

**Health Check**
```http
GET /api/health
```

**Service Statistics**
```http
GET /api/stats
```

**Queue Statistics**
```http
GET /api/stats/queue
```

**Clear Queue**
```http
DELETE /api/queue
```

### WebSocket Protocol

#### Message Types

**Authentication**
```json
{
  "type": "authenticate",
  "apiKey": "your-api-key"
}
```

**Subscribe to Channel**
```json
{
  "type": "subscribe",
  "channel": "channel-name"
}
```

**Unsubscribe from Channel**
```json
{
  "type": "unsubscribe",
  "channel": "channel-name"
}
```

**Ping (Keep-Alive)**
```json
{
  "type": "ping"
}
```

#### Server Messages

**Connection Established**
```json
{
  "type": "connected",
  "connectionId": "unique-id",
  "message": "Please authenticate with your API key"
}
```

**Authentication Response**
```json
{
  "type": "authenticated",
  "success": true,
  "message": "Successfully authenticated"
}
```

**Notification Delivery**
```json
{
  "type": "notification",
  "notification": {
    "id": "notification-id",
    "channel": "channel-name",
    "data": {
      "title": "Message",
      "body": "Content"
    },
    "timestamp": "2026-01-30T12:00:00.000Z"
  }
}
```

## Configuration

Configure the service using environment variables:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3000
WS_PORT=3001

# Notification Configuration
MAX_QUEUE_SIZE=10000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
BATCH_SIZE=100
MESSAGE_EXPIRY=86400000

# Client Configuration
MAX_CLIENTS_PER_KEY=1000
HEARTBEAT_INTERVAL=30000
CONNECTION_TIMEOUT=60000

# Security Configuration
API_KEY_LENGTH=32
ENABLE_RATE_LIMIT=true
MAX_REQUESTS_PER_MINUTE=60

# Logging Configuration
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=false
LOG_PATH=./logs
```

## Client Examples

### JavaScript/Node.js Client

```javascript
const WebSocket = require('ws');

class NotificationClient {
  constructor(wsUrl, apiKey) {
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
    this.ws = null;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        this.authenticate();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'authenticated' && message.success) {
          resolve();
        }
        
        if (message.type === 'notification') {
          this.handleNotification(message.notification);
        }
      });

      this.ws.on('error', reject);
    });
  }

  authenticate() {
    this.ws.send(JSON.stringify({
      type: 'authenticate',
      apiKey: this.apiKey
    }));
  }

  subscribe(channel, callback) {
    this.callbacks.set(channel, callback);
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel
    }));
  }

  handleNotification(notification) {
    const callback = this.callbacks.get(notification.channel);
    if (callback) {
      callback(notification);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage
const client = new NotificationClient('ws://localhost:3001', 'your-api-key');

client.connect().then(() => {
  console.log('Connected!');
  
  client.subscribe('updates', (notification) => {
    console.log('Received notification:', notification);
  });
});
```

### Browser Client

```html
<!DOCTYPE html>
<html>
<head>
  <title>Notification Client</title>
</head>
<body>
  <div id="notifications"></div>

  <script>
    const ws = new WebSocket('ws://localhost:3001');
    const API_KEY = 'your-api-key';

    ws.onopen = () => {
      // Authenticate
      ws.send(JSON.stringify({
        type: 'authenticate',
        apiKey: API_KEY
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received:', message);

      if (message.type === 'authenticated') {
        // Subscribe to channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'alerts'
        }));
      }

      if (message.type === 'notification') {
        displayNotification(message.notification);
      }
    };

    function displayNotification(notification) {
      const div = document.getElementById('notifications');
      const notif = document.createElement('div');
      notif.innerHTML = `
        <h3>${notification.data.title}</h3>
        <p>${notification.data.body}</p>
        <small>${notification.timestamp}</small>
      `;
      div.appendChild(notif);
    }
  </script>
</body>
</html>
```

### Python Client

```python
import websocket
import json
import threading

class NotificationClient:
    def __init__(self, ws_url, api_key):
        self.ws_url = ws_url
        self.api_key = api_key
        self.ws = None
        self.callbacks = {}

    def on_message(self, ws, message):
        data = json.loads(message)
        
        if data['type'] == 'notification':
            channel = data['notification']['channel']
            if channel in self.callbacks:
                self.callbacks[channel](data['notification'])

    def on_open(self, ws):
        # Authenticate
        ws.send(json.dumps({
            'type': 'authenticate',
            'apiKey': self.api_key
        }))

    def connect(self):
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_message=self.on_message,
            on_open=self.on_open
        )
        
        thread = threading.Thread(target=self.ws.run_forever)
        thread.daemon = True
        thread.start()

    def subscribe(self, channel, callback):
        self.callbacks[channel] = callback
        self.ws.send(json.dumps({
            'type': 'subscribe',
            'channel': channel
        }))

# Usage
client = NotificationClient('ws://localhost:3001', 'your-api-key')
client.connect()

def handle_notification(notification):
    print(f"Received: {notification}")

client.subscribe('updates', handle_notification)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REST API Server                      │
│              (Port 3000 - HTTP/HTTPS)                   │
│                                                         │
│  • API Key Management                                  │
│  • Notification Submission                             │
│  • Statistics & Monitoring                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │
┌────────────────────▼────────────────────────────────────┐
│              Notification Service Core                  │
│                                                         │
│  • Priority Queue Management                           │
│  • Message Processing & Routing                        │
│  • Retry Logic                                         │
│  • Client Management                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │
┌────────────────────▼────────────────────────────────────┐
│                WebSocket Server                         │
│              (Port 3001 - WebSocket)                    │
│                                                         │
│  • Real-time Connections                               │
│  • Channel Subscriptions                               │
│  • Heartbeat Monitoring                                │
│  • Message Delivery                                    │
└─────────────────────────────────────────────────────────┘
```

## Use Cases

1. **Chat Applications** - Real-time message delivery
2. **Live Updates** - Stock prices, sports scores, news feeds
3. **IoT Notifications** - Device status updates
4. **Monitoring Alerts** - System health notifications
5. **Collaborative Tools** - Real-time collaboration events
6. **Gaming** - Game state updates, player notifications
7. **E-commerce** - Order status, inventory updates
8. **Social Media** - Likes, comments, mentions

## Production Considerations

### Security
- Use HTTPS/WSS in production
- Implement rate limiting
- Add IP whitelisting if needed
- Rotate API keys regularly
- Use environment variables for secrets

### Scaling
- Run multiple instances behind a load balancer
- Use Redis for shared state across instances
- Implement horizontal scaling
- Monitor queue sizes and connection counts

### Monitoring
- Set up health check endpoints
- Monitor error rates and latency
- Track notification delivery success rates
- Set up alerts for queue overflow

### Performance
- Adjust batch size based on load
- Tune heartbeat intervals
- Optimize queue size limits
- Monitor memory usage

## Development

```bash
# Development mode with auto-reload
npm run dev

# Run with custom configuration
PORT=4000 WS_PORT=4001 LOG_LEVEL=debug npm start
```

## License

MIT

## Support

For issues, questions, or contributions, please refer to the project repository.
