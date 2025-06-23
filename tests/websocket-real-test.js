import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { initializeWebSocket } from '../src/services/websocketService.js';

// Test data for the send_message event
const testMessageData = {
  groupId: "9",
  userId: "af5e2f25-1bbe-4865-b1d0-dee2c0e56e1d",
  content: "",
  messageType: "image",
  media_url: "https://firebasestorage.googleapis.com/v0/b/notifications-devs-74gq5b.firebasestorage.app/o/grupo_9%2Fimages%2F1750671504694_ved1r6mbjv.jpg?alt=media&token=79b86812-a8bf-4a05-86cb-7cf84d3e50b0",
};

/**
 * Test function that uses the real WebSocket service with real axios calls
 */
async function testSendMessageEventReal() {
  console.log('🚀 Starting real WebSocket test with axios...');
  
  debugger; // Breakpoint 1: Inicio del test
  
  // Create HTTP server
  const httpServer = createServer();
  
  // Initialize WebSocket server with real service
  const io = initializeWebSocket(httpServer);
  
  // Start the server
  const PORT = 3001;
  httpServer.listen(PORT, () => {
    console.log(`📡 WebSocket server running on port ${PORT}`);
  });

  debugger; // Breakpoint 2: Después de inicializar el servidor

  // Create a client to connect to the server
  const client = new Client(`http://localhost:${PORT}`);
  
  try {
    // Wait for connection
    await new Promise((resolve) => {
      client.on('connect', () => {
        console.log('✅ Client connected to WebSocket server');
        resolve();
      });
    });

    debugger; // Breakpoint 3: Después de conectar

    // Authenticate the user first
    await new Promise((resolve, reject) => {
      client.emit('authenticate', testMessageData.userId, (response) => {
        if (response.success) {
          console.log('✅ User authenticated successfully');
          resolve();
        } else {
          console.error('❌ Authentication failed:', response.error);
          reject(new Error('Authentication failed'));
        }
      });
    });

    debugger; // Breakpoint 4: Después de autenticar

    // Join the group
    await new Promise((resolve, reject) => {
      client.emit('join_group', { groupId: testMessageData.groupId }, (response) => {
        if (response.success) {
          console.log('✅ User joined group successfully');
          resolve();
        } else {
          console.error('❌ Failed to join group:', response.error);
          reject(new Error('Failed to join group'));
        }
      });
    });

    debugger; // Breakpoint 5: Antes de enviar mensaje

    // Send the test message
    console.log('📤 Sending test message with data:', JSON.stringify(testMessageData, null, 2));
    
    client.emit('send_message', testMessageData);
    
    // Wait longer for the real HTTP requests to complete
    console.log('⏳ Waiting for axios requests to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
    
    console.log('✅ Test message sent successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    client.disconnect();
    httpServer.close(() => {
      console.log('🔌 WebSocket server closed');
    });
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSendMessageEventReal()
    .then(() => {
      console.log('🎉 Real test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Real test failed:', error);
      process.exit(1);
    });
}

export { testSendMessageEventReal }; 