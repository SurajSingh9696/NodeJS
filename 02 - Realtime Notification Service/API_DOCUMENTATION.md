# API Documentation

Complete API reference for the Realtime Notification Service Platform.

---

## Table of Contents

- [Authentication](#authentication)
- [API Key Management](#api-key-management)
- [Notification Management](#notification-management)
- [Statistics & Monitoring](#statistics--monitoring)
- [Queue Management](#queue-management)
- [WebSocket Protocol](#websocket-protocol)
- [Error Responses](#error-responses)

---

## Authentication

Most endpoints require an API key for authentication. Include it in the request header:

```
X-API-Key: your-api-key-here
```

Or alternatively:

```
Authorization: Bearer your-api-key-here
```

---

## API Key Management

### Create API Key

Generate a new API key for accessing the notification service.

**Endpoint:** `POST /api/keys`

**Authentication:** None required

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "clientName": "string (required)"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clientName | string | Yes | A descriptive name for the client/application |

**Success Response (201 Created):**
```json
{
  "success": true,
  "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "clientName": "MyApp",
  "message": "API key created successfully"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| apiKey | string | The generated API key (64 characters hex) |
| clientName | string | The name provided for this client |
| message | string | Success message |

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "name": "ValidationError",
    "message": "clientName is required",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": {
      "received": {}
    }
  }
}
```

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/keys" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"clientName": "MyApp"}'

# cURL (Windows)
curl.exe -X POST http://localhost:3000/api/keys ^
  -H "Content-Type: application/json" ^
  -d "{\"clientName\": \"MyApp\"}"

# cURL (Linux/Mac)
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"clientName": "MyApp"}'
```

---

### List API Keys

Retrieve all registered API keys and their information.

**Endpoint:** `GET /api/keys`

**Authentication:** None required

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "keys": [
    {
      "apiKey": "a1b2c3d4...",
      "name": "MyApp",
      "createdAt": "2026-01-30T06:00:00.000Z",
      "activeConnections": 3,
      "stats": {
        "totalConnections": 15,
        "totalNotifications": 245,
        "lastActivity": "2026-01-30T06:30:00.000Z"
      }
    },
    {
      "apiKey": "b2c3d4e5...",
      "name": "TestClient",
      "createdAt": "2026-01-30T05:00:00.000Z",
      "activeConnections": 0,
      "stats": {
        "totalConnections": 5,
        "totalNotifications": 50,
        "lastActivity": "2026-01-30T05:45:00.000Z"
      }
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| count | number | Total number of API keys |
| keys | array | Array of API key objects |
| keys[].apiKey | string | Masked API key (first 8 chars + "...") |
| keys[].name | string | Client name |
| keys[].createdAt | string (ISO 8601) | Creation timestamp |
| keys[].activeConnections | number | Current active WebSocket connections |
| keys[].stats.totalConnections | number | Total connections ever made |
| keys[].stats.totalNotifications | number | Total notifications sent |
| keys[].stats.lastActivity | string (ISO 8601) | Last activity timestamp |

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/keys" -Method GET

# cURL
curl http://localhost:3000/api/keys
```

---

### Get API Key Info

Retrieve detailed information about a specific API key.

**Endpoint:** `GET /api/keys/:key`

**Authentication:** None required

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | The full API key |

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "info": {
    "name": "MyApp",
    "createdAt": "2026-01-30T06:00:00.000Z",
    "activeConnections": 3,
    "stats": {
      "totalConnections": 15,
      "totalNotifications": 245,
      "lastActivity": "2026-01-30T06:30:00.000Z"
    },
    "apiKey": "a1b2c3d4..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "Invalid API key",
    "code": "AUTHENTICATION_ERROR",
    "statusCode": 401
  }
}
```

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/keys/YOUR_API_KEY" -Method GET

# cURL
curl http://localhost:3000/api/keys/YOUR_API_KEY
```

---

### Revoke API Key

Permanently revoke an API key and disconnect all associated clients.

**Endpoint:** `DELETE /api/keys/:key`

**Authentication:** None required

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| key | string | Yes | The full API key to revoke |

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": {
    "name": "ValidationError",
    "message": "API key not found",
    "code": "VALIDATION_ERROR",
    "statusCode": 400
  }
}
```

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/keys/YOUR_API_KEY" -Method DELETE

# cURL
curl -X DELETE http://localhost:3000/api/keys/YOUR_API_KEY
```

---

## Notification Management

### Send Notification

Send a notification to all clients subscribed to a specific channel.

**Endpoint:** `POST /api/notifications`

**Authentication:** Required (API Key)

**Request Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key-here
```

**Request Body:**
```json
{
  "channel": "string (required)",
  "data": "object (required)",
  "priority": "number (optional, 1-10)",
  "metadata": "object (optional)"
}
```

**Parameters:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| channel | string | Yes | - | Channel name to send notification to |
| data | object | Yes | - | Notification payload (can be any JSON object) |
| priority | number | No | 5 | Priority level (1=lowest, 10=highest) |
| metadata | object | No | {} | Additional metadata (custom fields) |

**Success Response (201 Created):**
```json
{
  "success": true,
  "notificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "queueSize": 42
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| notificationId | string (UUID) | Unique identifier for this notification |
| queueSize | number | Current number of notifications in queue |

**Error Responses:**

**401 Unauthorized** (Missing API Key):
```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "API key is required",
    "code": "AUTHENTICATION_ERROR",
    "statusCode": 401
  }
}
```

**400 Bad Request** (Invalid Data):
```json
{
  "error": {
    "name": "ValidationError",
    "message": "Channel is required",
    "code": "VALIDATION_ERROR",
    "statusCode": 400
  }
}
```

**503 Service Unavailable** (Queue Full):
```json
{
  "error": {
    "name": "QueueFullError",
    "message": "Queue size limit reached (10000)",
    "code": "QUEUE_FULL_ERROR",
    "statusCode": 503
  }
}
```

**Example:**
```bash
# PowerShell
$body = @{
  channel = "updates"
  data = @{
    title = "New Update"
    body = "Version 2.0 is now available"
    version = "2.0.0"
  }
  priority = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/notifications" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"X-API-Key" = "YOUR_API_KEY"} `
  -Body $body

# cURL (Windows)
curl.exe -X POST http://localhost:3000/api/notifications ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: YOUR_API_KEY" ^
  -d "{\"channel\":\"updates\",\"data\":{\"title\":\"New Update\"},\"priority\":8}"

# cURL (Linux/Mac)
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "channel": "updates",
    "data": {
      "title": "New Update",
      "body": "Version 2.0 is now available"
    },
    "priority": 8
  }'
```

---

### Broadcast Notification

Broadcast a notification to all clients in a channel, with optional connection exclusion.

**Endpoint:** `POST /api/notifications/broadcast`

**Authentication:** Required (API Key)

**Request Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key-here
```

**Request Body:**
```json
{
  "channel": "string (required)",
  "data": "object (required)",
  "priority": "number (optional, 1-10)",
  "excludeConnection": "string (optional)"
}
```

**Parameters:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| channel | string | Yes | - | Channel name to broadcast to |
| data | object | Yes | - | Notification payload |
| priority | number | No | 5 | Priority level (1-10) |
| excludeConnection | string | No | null | Connection ID to exclude from broadcast |

**Success Response (201 Created):**
```json
{
  "success": true,
  "notificationId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "queueSize": 15
}
```

**Error Responses:** Same as [Send Notification](#send-notification)

**Example:**
```bash
# PowerShell
$body = @{
  channel = "alerts"
  data = @{
    type = "warning"
    message = "System maintenance in 10 minutes"
  }
  priority = 9
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/notifications/broadcast" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"X-API-Key" = "YOUR_API_KEY"} `
  -Body $body

# cURL
curl -X POST http://localhost:3000/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"channel":"alerts","data":{"message":"Maintenance"},"priority":9}'
```

---

## Statistics & Monitoring

### Health Check

Check if the service is running and responsive.

**Endpoint:** `GET /api/health`

**Authentication:** None required

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T06:30:00.000Z",
  "uptime": 3600.5
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| status | string | Service health status ("healthy") |
| timestamp | string (ISO 8601) | Current server time |
| uptime | number | Server uptime in seconds |

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# cURL
curl http://localhost:3000/api/health
```

---

### Service Statistics

Get comprehensive service statistics including queue and processing information.

**Endpoint:** `GET /api/stats`

**Authentication:** None required

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "service": {
    "queue": {
      "size": 42,
      "maxSize": 10000,
      "utilizationPercent": "0.42",
      "priorityDistribution": {
        "5": 20,
        "8": 15,
        "10": 7
      },
      "oldestMessage": 5000
    },
    "processing": false,
    "timestamp": "2026-01-30T06:30:00.000Z"
  },
  "clients": 5,
  "timestamp": "2026-01-30T06:30:00.000Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| service.queue.size | number | Current notifications in queue |
| service.queue.maxSize | number | Maximum queue capacity |
| service.queue.utilizationPercent | string | Queue utilization percentage |
| service.queue.priorityDistribution | object | Count of notifications by priority |
| service.queue.oldestMessage | number | Age of oldest message in milliseconds |
| service.processing | boolean | Whether queue is being processed |
| service.timestamp | string (ISO 8601) | Timestamp of statistics |
| clients | number | Total number of registered API keys |
| timestamp | string (ISO 8601) | Response timestamp |

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/stats" -Method GET

# cURL
curl http://localhost:3000/api/stats
```

---

### Queue Statistics

Get detailed queue statistics only.

**Endpoint:** `GET /api/stats/queue`

**Authentication:** None required

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "size": 42,
    "maxSize": 10000,
    "utilizationPercent": "0.42",
    "priorityDistribution": {
      "5": 20,
      "8": 15,
      "10": 7
    },
    "oldestMessage": 5000
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| stats.size | number | Current queue size |
| stats.maxSize | number | Maximum queue capacity |
| stats.utilizationPercent | string | Percentage of queue filled |
| stats.priorityDistribution | object | Notifications grouped by priority level |
| stats.oldestMessage | number | Time in ms since oldest message was queued |

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/queue" -Method GET

# cURL
curl http://localhost:3000/api/stats/queue
```

---

## Queue Management

### Clear Queue

Remove all pending notifications from the queue.

**Endpoint:** `DELETE /api/queue`

**Authentication:** None required

**Request Headers:** None

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cleared 42 notifications from queue"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Operation status |
| message | string | Confirmation message with count of cleared items |

**Example:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/queue" -Method DELETE

# cURL
curl -X DELETE http://localhost:3000/api/queue
```

---

## WebSocket Protocol

Connect to `ws://localhost:3001` (or your configured WebSocket port).

### Connection Flow

1. **Connect** → Server sends `connected` message
2. **Authenticate** → Client sends authentication message
3. **Subscribe** → Client subscribes to channels
4. **Receive** → Client receives notifications
5. **Disconnect** → Connection closes

---

### Client Messages

#### Authenticate

Must be sent immediately after connection.

**Message:**
```json
{
  "type": "authenticate",
  "apiKey": "your-api-key-here"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Must be "authenticate" |
| apiKey | string | Yes | Valid API key |

**Server Response (Success):**
```json
{
  "type": "authenticated",
  "success": true,
  "message": "Successfully authenticated"
}
```

**Server Response (Failure):**
```json
{
  "type": "authenticated",
  "success": false,
  "error": "Invalid API key"
}
```

Note: Connection will be closed on authentication failure.

---

#### Subscribe to Channel

Subscribe to receive notifications from a specific channel.

**Message:**
```json
{
  "type": "subscribe",
  "channel": "channel-name"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Must be "subscribe" |
| channel | string | Yes | Channel name to subscribe to |

**Server Response:**
```json
{
  "type": "subscribed",
  "success": true,
  "channel": "channel-name",
  "message": "Subscribed to channel: channel-name"
}
```

---

#### Unsubscribe from Channel

Stop receiving notifications from a channel.

**Message:**
```json
{
  "type": "unsubscribe",
  "channel": "channel-name"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Must be "unsubscribe" |
| channel | string | Yes | Channel name to unsubscribe from |

**Server Response:**
```json
{
  "type": "unsubscribed",
  "success": true,
  "channel": "channel-name",
  "message": "Unsubscribed from channel: channel-name"
}
```

---

#### Ping

Send a ping to test connection (optional - heartbeat is automatic).

**Message:**
```json
{
  "type": "ping"
}
```

**Server Response:**
```json
{
  "type": "pong",
  "timestamp": 1706596200000
}
```

---

### Server Messages

#### Connected

Sent immediately when client connects.

**Message:**
```json
{
  "type": "connected",
  "connectionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Please authenticate with your API key"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| type | string | "connected" |
| connectionId | string (UUID) | Unique connection identifier |
| message | string | Welcome message |

---

#### Notification

Delivered when a notification is sent to a subscribed channel.

**Message:**
```json
{
  "type": "notification",
  "notification": {
    "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
    "channel": "updates",
    "data": {
      "title": "New Message",
      "body": "You have a new notification!",
      "customField": "customValue"
    },
    "timestamp": "2026-01-30T06:30:00.000Z"
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| type | string | "notification" |
| notification.id | string (UUID) | Unique notification ID |
| notification.channel | string | Channel name |
| notification.data | object | Notification payload (any structure) |
| notification.timestamp | string (ISO 8601) | When notification was created |

---

#### Error

Sent when an error occurs during WebSocket communication.

**Message:**
```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "Not authenticated",
    "code": "AUTHENTICATION_ERROR"
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "name": "ErrorName",
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

### Error Types

| Error Name | Status Code | Code | Description |
|------------|-------------|------|-------------|
| ValidationError | 400 | VALIDATION_ERROR | Invalid request parameters |
| AuthenticationError | 401 | AUTHENTICATION_ERROR | Invalid or missing API key |
| AuthorizationError | 403 | AUTHORIZATION_ERROR | Access denied |
| ResourceNotFoundError | 404 | RESOURCE_NOT_FOUND | Resource doesn't exist |
| RateLimitError | 429 | RATE_LIMIT_ERROR | Too many requests |
| InternalServerError | 500 | INTERNAL_SERVER_ERROR | Unexpected server error |
| QueueFullError | 503 | QUEUE_FULL_ERROR | Notification queue is full |
| ConnectionError | 503 | CONNECTION_ERROR | WebSocket connection issue |

### Common HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| 200 | OK | Successful GET, DELETE requests |
| 201 | Created | Successful POST creating new resource |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Complete Usage Example

### 1. Create an API Key

```bash
# PowerShell
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/keys" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"clientName": "MyApp"}'

$apiKey = $result.apiKey
Write-Host "API Key: $apiKey"
```

### 2. Connect WebSocket Client

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
  
  if (message.type === 'authenticated' && message.success) {
    // Subscribe to channels
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'updates'
    }));
    
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'alerts'
    }));
  }
  
  if (message.type === 'notification') {
    console.log('Received:', message.notification);
  }
});
```

### 3. Send Notifications

```bash
# PowerShell
$body = @{
  channel = "updates"
  data = @{
    title = "Hello"
    body = "This is a notification"
  }
  priority = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/notifications" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"X-API-Key" = $apiKey} `
  -Body $body
```

### 4. Monitor Statistics

```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/stats" -Method GET
```

---

## Rate Limiting

When rate limiting is enabled (`ENABLE_RATE_LIMIT=true`), requests are limited to `MAX_REQUESTS_PER_MINUTE` per API key.

**Rate Limit Response (429):**
```json
{
  "error": {
    "name": "RateLimitError",
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_ERROR",
    "statusCode": 429
  }
}
```

---

## WebSocket Connection Limits

Each API key can have up to `MAX_CLIENTS_PER_KEY` concurrent WebSocket connections (default: 1000).

**Limit Exceeded Response:**
```json
{
  "type": "authenticated",
  "success": false,
  "error": "Maximum connections (1000) reached for this API key"
}
```

---

## Best Practices

1. **Store API keys securely** - Never commit them to version control
2. **Use appropriate priorities** - Reserve 9-10 for urgent notifications
3. **Set meaningful channel names** - Use hierarchical names like `user.123.messages`
4. **Include relevant data** - Put all necessary info in the notification data object
5. **Handle disconnections** - Implement reconnection logic with exponential backoff
6. **Monitor queue size** - Alert when queue utilization is high
7. **Clean up unused API keys** - Revoke keys that are no longer needed
8. **Use connection exclusion** - When broadcasting, exclude the sender if needed

---

## Support & Additional Information

For more examples and implementation details, see:
- [README.md](README.md) - General overview and quick start
- [examples/client.js](examples/client.js) - WebSocket client example
- [examples/sender.js](examples/sender.js) - REST API sender example

---

**Last Updated:** January 30, 2026  
**Version:** 1.0.0
