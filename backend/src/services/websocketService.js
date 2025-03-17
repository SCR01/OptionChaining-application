const WebSocket = require('ws');
const { generateMockData, generatePriceUpdates, generateSessionId, generateInitialData } = require('../utils/mockDataGenerator');

let wss;
let mockData;
let subscriptions = new Map(); // Client -> Set of subscribed tokens
let updateInterval;
let connectionResponse;
let pongResponse;

// Initialize WebSocket server
const initialize = (server) => {
  if (wss) {
    console.log('WebSocket server already initialized');
    return;
  }

  wss = new WebSocket.Server({
    server,
    cors: {
      origin: '*',
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });

  console.log('WebSocket server initialized and ready for connections');
  
  // Performance optimization: Pre-generate some common responses
  connectionResponse = JSON.stringify({ type: 'CONNECTION_STATUS', status: 'CONNECTED' });
  pongResponse = JSON.stringify({ type: 'PONG' });
  
  // Setup connection handling
  wss.on('connection', handleConnection);
  
  // Initialize mock data
  mockData = generateMockData();
  setupPriceUpdates();
};

// Handle new WebSocket connection
const handleConnection = (ws, req) => {
  const sessionId = generateSessionId();
  console.log(`New WebSocket connection established: ${sessionId}`);
  
  // Send immediate connection confirmation for UI responsiveness
  ws.send(connectionResponse);
  
  // Set empty subscriptions for this client
  subscriptions.set(ws, new Set());
  
  // Send initial data immediately without waiting for request
  sendInitialData(ws);
  
  // Handle messages from the client
  ws.on('message', (message) => handleMessage(ws, message));
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    
    // Remove client from subscriptions
    subscriptions.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  // Set up ping/pong for connection health
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);
  
  ws.on('pong', () => {
    ws.send(pongResponse);
  });
};

// Handle incoming messages from clients
const handleMessage = (ws, message) => {
  try {
    const parsedMessage = JSON.parse(message);
    
    switch (parsedMessage.type) {
      case 'SUBSCRIBE':
        handleSubscribe(ws, parsedMessage.tokens);
        break;
        
      case 'UNSUBSCRIBE':
        handleUnsubscribe(ws, parsedMessage.tokens);
        break;
        
      case 'PING':
        ws.send(pongResponse);
        break;
        
      case 'INITIAL_DATA_REQUEST':
        // Immediately send initial data when explicitly requested
        sendInitialData(ws);
        break;
        
      default:
        console.log(`Unknown message type: ${parsedMessage.type}`);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
};

// Handle subscription request
const handleSubscribe = (ws, tokens) => {
  if (!Array.isArray(tokens)) {
    console.error('Invalid tokens format, expected array');
    return;
  }
  
  const clientSubscriptions = subscriptions.get(ws) || new Set();
  
  // Add tokens to client's subscriptions
  tokens.forEach(token => clientSubscriptions.add(token));
  
  subscriptions.set(ws, clientSubscriptions);
  
  // Immediately send current prices for the subscribed tokens
  sendUpdatesForTokens(ws, tokens);
};

// Handle unsubscription request
const handleUnsubscribe = (ws, tokens) => {
  if (!Array.isArray(tokens)) {
    console.error('Invalid tokens format, expected array');
    return;
  }
  
  const clientSubscriptions = subscriptions.get(ws);
  
  if (!clientSubscriptions) {
    return;
  }
  
  // Remove tokens from client's subscriptions
  tokens.forEach(token => clientSubscriptions.delete(token));
};

// Send initial data to client
const sendInitialData = (ws) => {
  ws.send(JSON.stringify({
    type: 'INITIAL_DATA',
    data: mockData
  }));
};

// Send updates only for specific tokens to a client
const sendUpdatesForTokens = (ws, tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) return;
  
  const updates = {};
  
  tokens.forEach(token => {
    if (token === 'UNDERLYING') {
      updates[token] = {
        price: mockData.underlyingPrice,
        percentChange: 0
      };
    } else {
      // Find the token in the mock data
      mockData.strikes.forEach(strike => {
        if (strike.call.token === token) {
          updates[token] = {
            price: strike.call.price,
            percentChange: strike.call.percentChange
          };
        } else if (strike.put.token === token) {
          updates[token] = {
            price: strike.put.price,
            percentChange: strike.put.percentChange
          };
        }
      });
    }
  });
  
  if (Object.keys(updates).length > 0) {
    ws.send(JSON.stringify({
      type: 'PRICE_UPDATE',
      updates
    }));
  }
};

// Start price update simulation
const setupPriceUpdates = () => {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Generate and send price updates every 2 seconds
  updateInterval = setInterval(() => {
    // Only generate updates if there are connected clients
    if (wss.clients.size > 0) {
      const updates = generatePriceUpdates(mockData);
      
      // Update our mock data with new prices
      Object.entries(updates).forEach(([token, update]) => {
        if (token === 'UNDERLYING') {
          mockData.underlyingPrice = update.price;
        } else {
          // Find and update the appropriate option
          mockData.strikes.forEach(strike => {
            if (strike.call.token === token) {
              strike.call.price = update.price;
              strike.call.percentChange = update.percentChange;
            } else if (strike.put.token === token) {
              strike.put.price = update.price;
              strike.put.percentChange = update.percentChange;
            }
          });
        }
      });
      
      // Send updates to each client based on their subscriptions
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const clientSubs = subscriptions.get(client);
          
          if (clientSubs && clientSubs.size > 0) {
            // Filter updates to only include subscribed tokens
            const clientUpdates = {};
            Object.entries(updates).forEach(([token, update]) => {
              if (clientSubs.has(token)) {
                clientUpdates[token] = update;
              }
            });
            
            // Only send if client has subscribed to at least one updated token
            if (Object.keys(clientUpdates).length > 0) {
              client.send(JSON.stringify({
                type: 'PRICE_UPDATE',
                updates: clientUpdates
              }));
            }
          }
        }
      });
    }
  }, 2000);
};

module.exports = {
  initialize,
  getAllSubscriptions: () => {
    return Array.from(subscriptions.values())
      .flatMap(set => Array.from(set));
  },
  getConnectionCount: () => {
    return wss ? wss.clients.size : 0;
  }
};
