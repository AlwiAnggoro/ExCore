/**
 * Example: Server-Sent Events (SSE)
 *
 * Demonstrates how to use SSEManager for real-time server-to-client streaming.
 */

import { SSEManager } from '@excore/core/adapters/realtime';

// Simulated SSE Connection
class SimulatedSSEConnection {
  constructor(
    public id: string,
    public userId?: string,
    public channel?: string
  ) {}

  send(data: string): void {
    console.log(`📤 [${this.id}] Sent: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
  }

  close(): void {
    console.log(`🔌 [${this.id}] Connection closed`);
  }
}

// Example: SSE Server Implementation
async function sseServerExample() {
  console.log('=== Server-Sent Events Example ===\n');

  const sseManager = new SSEManager({
    heartbeatInterval: 30000, // 30 seconds
    maxConnectionsPerUser: 5,
  });

  // Example 1: Add client connections
  console.log('1️⃣ Adding Client Connections:\n');

  const conn1 = new SimulatedSSEConnection('conn-1', 'user-1', 'notifications');
  sseManager.addConnection(
    conn1.id,
    (data) => conn1.send(data),
    () => conn1.close(),
    conn1.userId,
    conn1.channel
  );
  console.log(`✅ User 1 connected to notifications channel`);

  const conn2 = new SimulatedSSEConnection('conn-2', 'user-2', 'notifications');
  sseManager.addConnection(
    conn2.id,
    (data) => conn2.send(data),
    () => conn2.close(),
    conn2.userId,
    conn2.channel
  );
  console.log(`✅ User 2 connected to notifications channel`);

  const conn3 = new SimulatedSSEConnection('conn-3', 'user-1', 'chat');
  sseManager.addConnection(
    conn3.id,
    (data) => conn3.send(data),
    () => conn3.close(),
    conn3.userId,
    conn3.channel
  );
  console.log(`✅ User 1 connected to chat channel`);

  // Example 2: Send to specific user
  console.log('\n2️⃣ Sending to Specific User:\n');
  const sent1 = sseManager.sendToUser('user-1', {
    type: 'notification',
    data: {
      message: 'You have a new follower!',
      timestamp: new Date().toISOString(),
    },
  });
  console.log(`✅ Message sent to ${sent1} connection(s) for user-1`);

  // Example 3: Broadcast to channel
  console.log('\n3️⃣ Broadcasting to Channel:\n');
  const sent2 = sseManager.sendToChannel('notifications', {
    type: 'announcement',
    data: {
      title: 'System Maintenance',
      message: 'Scheduled maintenance in 1 hour',
      severity: 'info',
    },
  });
  console.log(`✅ Message broadcast to ${sent2} connection(s) in notifications channel`);

  // Example 4: Broadcast to all connections
  console.log('\n4️⃣ Broadcasting to All:\n');
  const sent3 = sseManager.broadcast({
    type: 'system',
    data: {
      message: 'New feature available: Dark mode!',
      timestamp: new Date().toISOString(),
    },
  });
  console.log(`✅ Message broadcast to ${sent3} connection(s)`);

  // Example 5: Simulating real-time events
  console.log('\n5️⃣ Simulating Real-Time Events:\n');

  // Simulate a comment notification
  setTimeout(() => {
    console.log('📬 New comment event:');
    sseManager.sendToUser('user-1', {
      type: 'comment',
      data: {
        postId: 'post-123',
        author: 'user-2',
        text: 'Great article!',
        timestamp: new Date().toISOString(),
      },
    });
  }, 1000);

  // Simulate a like notification
  setTimeout(() => {
    console.log('❤️  Like event:');
    sseManager.sendToUser('user-1', {
      type: 'like',
      data: {
        postId: 'post-123',
        author: 'user-3',
        timestamp: new Date().toISOString(),
      },
    });
  }, 2000);

  // Simulate chat message
  setTimeout(() => {
    console.log('💬 Chat message:');
    sseManager.sendToChannel('chat', {
      type: 'message',
      data: {
        from: 'user-2',
        text: 'Hello everyone!',
        timestamp: new Date().toISOString(),
      },
    });
  }, 3000);

  // Example 6: Connection statistics
  setTimeout(() => {
    console.log('\n6️⃣ Connection Statistics:\n');
    console.log(`Total connections: ${sseManager.getConnectionCount()}`);
    console.log(`User 1 connections: ${sseManager.getUserConnectionCount('user-1')}`);
    console.log(`User 2 connections: ${sseManager.getUserConnectionCount('user-2')}`);
    console.log(`Notifications channel: ${sseManager.getChannelConnectionCount('notifications')}`);
    console.log(`Chat channel: ${sseManager.getChannelConnectionCount('chat')}`);
  }, 4000);

  // Example 7: Remove connections
  setTimeout(() => {
    console.log('\n7️⃣ Removing Connections:\n');
    sseManager.removeConnection('conn-2');
    console.log(`Connection stats after removal:`);
    console.log(`Total connections: ${sseManager.getConnectionCount()}`);
  }, 5000);

  // Example 8: Multiple messages to same user
  setTimeout(() => {
    console.log('\n8️⃣ Multiple Message Types to Same User:\n');

    sseManager.sendToUser('user-1', {
      type: 'achievement',
      data: {
        title: '100 Posts Milestone!',
        description: 'Congratulations on your 100th post!',
        badge: 'prolific-writer',
      },
    });

    sseManager.sendToUser('user-1', {
      type: 'mention',
      data: {
        postId: 'post-456',
        author: 'user-4',
        text: '@user-1 What do you think about this?',
      },
    });
  }, 6000);

  // Cleanup
  setTimeout(() => {
    console.log('\n9️⃣ Cleanup:\n');
    sseManager.removeAllConnections();
    console.log(`All connections removed`);
    console.log(`Total connections: ${sseManager.getConnectionCount()}`);
  }, 7000);

  // Wait for all events to complete
  await new Promise((resolve) => setTimeout(resolve, 8000));
}

// Run the example
sseServerExample()
  .then(() => {
    console.log('\n✨ SSE Server examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
