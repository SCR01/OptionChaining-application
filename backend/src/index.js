const express = require('express');
const http = require('http');
const cors = require('cors');
const WebSocketService = require('./services/websocketService');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Basic API routes
app.get('/', (req, res) => {
  res.json({ message: 'Option Chain WebSocket API is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/option-chain', (req, res) => {
  res.json({ message: 'Use WebSocket connection for real-time data' });
});

app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
WebSocketService.initialize(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
