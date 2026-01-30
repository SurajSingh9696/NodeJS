/**
 * Example Client Implementation
 * Demonstrates how to use the notification service
 */

import WebSocket from 'ws';

class ExampleClient {
  constructor(wsUrl, apiKey) {
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('Connecting to WebSocket server...');
      
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        console.log('✓ Connected to server');
        this.authenticate();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.type === 'authenticated' && message.success) {
          console.log('✓ Authenticated successfully');
          resolve();
        } else if (message.type === 'authenticated' && !message.success) {
          reject(new Error(message.error));
        }

        if (message.type === 'notification') {
          this.handleNotification(message.notification);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('✗ Disconnected from server');
      });
    });
  }

  authenticate() {
    console.log('Authenticating...');
    this.ws.send(JSON.stringify({
      type: 'authenticate',
      apiKey: this.apiKey
    }));
  }

  subscribe(channel) {
    console.log(`Subscribing to channel: ${channel}`);
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel
    }));
  }

  unsubscribe(channel) {
    console.log(`Unsubscribing from channel: ${channel}`);
    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      channel
    }));
  }

  handleNotification(notification) {
    console.log('\n📬 New Notification:');
    console.log('  ID:', notification.id);
    console.log('  Channel:', notification.channel);
    console.log('  Data:', JSON.stringify(notification.data, null, 2));
    console.log('  Timestamp:', notification.timestamp);
    console.log('');
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function main() {
  const API_KEY = process.argv[2];
  
  if (!API_KEY) {
    console.error('Usage: node examples/client.js <API_KEY>');
    console.error('\nFirst, create an API key:');
    console.error('  curl -X POST http://localhost:3000/api/keys -H "Content-Type: application/json" -d \'{"clientName": "ExampleClient"}\'');
    process.exit(1);
  }

  const client = new ExampleClient('ws://localhost:3001', API_KEY);

  try {
    await client.connect();
    
    // Subscribe to channels
    client.subscribe('updates');
    client.subscribe('alerts');
    client.subscribe('messages');

    console.log('\n✓ Client ready and listening for notifications');
    console.log('Press Ctrl+C to exit\n');

    // Keep the client running
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
  }
}

main();
