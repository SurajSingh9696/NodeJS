# Quick Start Guide

## Start the Service

```powershell
npm start
```

## Create Your First API Key

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/keys" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"clientName": "MyFirstApp"}'

$apiKey = $response.apiKey
Write-Host "Your API Key: $apiKey" -ForegroundColor Green
```

## Send a Test Notification

```powershell
$body = @{
    channel = "test"
    data = @{
        title = "Hello World"
        message = "This is a test notification"
    }
    priority = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/notifications" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{"X-API-Key" = $apiKey} `
  -Body $body
```

## Connect WebSocket Client

```powershell
node examples/client.js YOUR_API_KEY
```

## Check Service Status

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
Invoke-RestMethod -Uri "http://localhost:3000/api/stats"
```

## View API Keys

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/keys"
```

---

See [README.md](README.md) for full documentation.
See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API reference.
