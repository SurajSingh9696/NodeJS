/**
 * Example Sender Implementation
 * Demonstrates how to send notifications via REST API
 */

async function sendNotification(apiKey, channel, data, priority = 5) {
  try {
    const response = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        channel,
        data,
        priority
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ Notification sent successfully');
      console.log('  Notification ID:', result.notificationId);
      console.log('  Queue Size:', result.queueSize);
    } else {
      console.error('✗ Failed to send notification:', result.error);
    }

    return result;
  } catch (error) {
    console.error('✗ Request failed:', error.message);
    throw error;
  }
}

async function createApiKey(clientName) {
  try {
    const response = await fetch('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clientName })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ API Key created successfully');
      console.log('  API Key:', result.apiKey);
      console.log('  Client Name:', result.clientName);
      return result.apiKey;
    } else {
      console.error('✗ Failed to create API key:', result.error);
    }

    return null;
  } catch (error) {
    console.error('✗ Request failed:', error.message);
    throw error;
  }
}

async function getStats() {
  try {
    const response = await fetch('http://localhost:3000/api/stats');
    const stats = await response.json();
    
    console.log('\n📊 Service Statistics:');
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('✗ Failed to get stats:', error.message);
  }
}

// Example usage
async function main() {
  console.log('Realtime Notification Service - Sender Example\n');

  const command = process.argv[2];
  
  if (command === 'create-key') {
    const clientName = process.argv[3] || 'ExampleSender';
    await createApiKey(clientName);
  } 
  else if (command === 'send') {
    const apiKey = process.argv[3];
    const channel = process.argv[4] || 'updates';
    
    if (!apiKey) {
      console.error('Usage: node examples/sender.js send <API_KEY> [channel]');
      process.exit(1);
    }

    // Send a few example notifications
    await sendNotification(apiKey, channel, {
      title: 'System Update',
      body: 'New version available!',
      version: '2.0.0'
    }, 8);

    await sendNotification(apiKey, channel, {
      title: 'New Message',
      body: 'You have received a new message',
      from: 'John Doe'
    }, 5);

    await sendNotification(apiKey, channel, {
      title: 'Alert',
      body: 'Critical system alert!',
      severity: 'high'
    }, 10);

    console.log('\n✓ All notifications sent');
  }
  else if (command === 'stats') {
    await getStats();
  }
  else {
    console.log('Usage:');
    console.log('  node examples/sender.js create-key [clientName]');
    console.log('  node examples/sender.js send <API_KEY> [channel]');
    console.log('  node examples/sender.js stats');
  }
}

main();
