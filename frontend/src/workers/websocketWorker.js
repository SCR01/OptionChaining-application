/* eslint-disable no-restricted-globals */
// WebSocket Worker
let socket = null;
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 500; // Reduced from 1000ms to 500ms for faster reconnection
const connectionTimeoutMs = 3000; // Reduced from 5000ms to 3000ms for faster timeout detection
let cachedInitialData = null;
let activeSubscriptions = []; // Track active subscriptions
let connectionStartTime = 0;
let wsUrl = 'ws://localhost:5000'; // Default URL, can be overridden by messages from main thread

// Connect to WebSocket server with timeout
const connectToWebSocket = () => {
  try {
    connectionStartTime = Date.now();
    console.log(`[Worker] Connecting to WebSocket at ${wsUrl} at ${connectionStartTime}`);
    
    // Close any existing socket
    if (socket) {
      socket.close();
    }
    
    // Set connection timeout - shorter timeout for faster UI feedback
    const connectionTimeout = setTimeout(() => {
      if (socket && socket.readyState !== WebSocket.OPEN) {
        console.log('[Worker] Connection timeout, attempting reconnect');
        socket.close();
        attemptReconnect();
      }
    }, connectionTimeoutMs);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      const connectionTime = Date.now() - connectionStartTime;
      console.log(`[Worker] WebSocket connection established in ${connectionTime}ms`);
      clearTimeout(connectionTimeout);
      // Reset reconnect attempts on successful connection
      reconnectAttempts = 0;
      // Clear any pending reconnect interval
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      // Immediately notify main thread of connection - do this first for UI responsiveness
      self.postMessage({ type: 'CONNECTION_STATUS', status: 'CONNECTED' });
      
      // Then immediately send INITIAL_DATA_REQUEST to speed up data loading
      socket.send(JSON.stringify({ type: 'INITIAL_DATA_REQUEST' }));
      
      // Resubscribe to any tokens that were active before reconnection
      if (activeSubscriptions.length > 0) {
        console.log('[Worker] Resubscribing to active tokens:', activeSubscriptions);
        socket.send(JSON.stringify({
          type: 'SUBSCRIBE',
          tokens: activeSubscriptions
        }));
        // Notify main thread of current subscriptions
        self.postMessage({
          type: 'SUBSCRIPTION_UPDATE',
          subscriptions: [...activeSubscriptions]
        });
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[Worker] Error parsing message:', error, 'Raw data:', event.data);
      }
    };
    
    socket.onclose = (event) => {
      console.log(`[Worker] WebSocket connection closed: ${event.code} ${event.reason}`);
      clearTimeout(connectionTimeout);
      self.postMessage({ type: 'CONNECTION_STATUS', status: 'DISCONNECTED' });
      
      // Attempt to reconnect if not closing cleanly
      if (event.code !== 1000) {
        attemptReconnect();
      }
    };
    
    socket.onerror = (error) => {
      console.error('[Worker] WebSocket error:', error);
      clearTimeout(connectionTimeout);
      self.postMessage({ 
        type: 'ERROR', 
        error: 'Failed to connect to WebSocket server. Please check if the server is running.'
      });
    };
  } catch (error) {
    console.error('[Worker] Error connecting to WebSocket:', error);
    self.postMessage({ 
      type: 'ERROR', 
      error: 'Failed to connect to WebSocket server. Please check if the server is running.'
    });
    
    // Attempt to reconnect on error
    attemptReconnect();
  }
};

// Attempt to reconnect with exponential backoff
const attemptReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[Worker] Maximum reconnect attempts reached, giving up');
    self.postMessage({ 
      type: 'ERROR', 
      error: 'Failed to reconnect to the server after multiple attempts. Please refresh the page.'
    });
    return;
  }
  
  // Clear any existing reconnect interval
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }
  
  // Calculate delay with exponential backoff
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
  console.log(`[Worker] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  
  self.postMessage({
    type: 'RECONNECTING',
    attempt: reconnectAttempts + 1,
    maxAttempts: MAX_RECONNECT_ATTEMPTS
  });
  
  reconnectInterval = setTimeout(() => {
    reconnectAttempts++;
    connectToWebSocket();
  }, delay);
};

// Handle incoming WebSocket messages
const handleMessage = (message) => {
  switch (message.type) {
    case 'INITIAL_DATA':
      console.log('[Worker] Received initial data');
      // Cache the initial data for future requests
      cachedInitialData = message.data;
      self.postMessage({
        type: 'INITIAL_DATA',
        data: message.data
      });
      break;
      
    case 'PRICE_UPDATE':
      // Forward price updates directly to main thread
      self.postMessage({
        type: 'PRICE_UPDATE',
        updates: message.updates
      });
      break;
      
    case 'PONG':
      // Just log pongs, no need to forward
      console.log('[Worker] Received pong from server');
      break;
      
    default:
      console.log(`[Worker] Received unknown message type: ${message.type}`, message);
  }
};

// Subscribe to tokens
const subscribeToTokens = (tokens) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('[Worker] Cannot subscribe, WebSocket not connected');
    self.postMessage({ 
      type: 'ERROR', 
      error: 'Cannot subscribe, WebSocket not connected. Trying to reconnect...'
    });
    connectToWebSocket();
    return;
  }
  
  console.log(`[Worker] Subscribing to tokens: ${tokens.join(', ')}`);
  
  // Update our local active subscriptions
  tokens.forEach(token => {
    if (!activeSubscriptions.includes(token)) {
      activeSubscriptions.push(token);
    }
  });
  
  socket.send(JSON.stringify({
    type: 'SUBSCRIBE',
    tokens
  }));
  
  // Notify main thread of updated subscriptions
  self.postMessage({
    type: 'SUBSCRIPTION_UPDATE',
    subscriptions: [...activeSubscriptions]
  });
};

// Unsubscribe from tokens
const unsubscribeFromTokens = (tokens) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('[Worker] Cannot unsubscribe, WebSocket not connected');
    return;
  }
  
  console.log(`[Worker] Unsubscribing from tokens: ${tokens.join(', ')}`);
  
  // Remove from our local active subscriptions
  activeSubscriptions = activeSubscriptions.filter(token => !tokens.includes(token));
  
  socket.send(JSON.stringify({
    type: 'UNSUBSCRIBE',
    tokens
  }));
  
  // Notify main thread of updated subscriptions
  self.postMessage({
    type: 'SUBSCRIPTION_UPDATE',
    subscriptions: [...activeSubscriptions]
  });
};

// Send initial data from cache or request new data
const sendInitialData = () => {
  if (cachedInitialData) {
    // Send cached data immediately
    self.postMessage({
      type: 'INITIAL_DATA',
      data: cachedInitialData
    });
  }
  
  // Also request fresh data if connected
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'INITIAL_DATA_REQUEST' }));
  }
  
  // Send current subscription status
  self.postMessage({
    type: 'SUBSCRIPTION_UPDATE',
    subscriptions: [...activeSubscriptions]
  });
};

// Send ping to keep connection alive
const ping = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'PING' }));
  }
};

// Initialize ping interval
const startPingInterval = () => {
  setInterval(ping, 30000); // Send ping every 30 seconds
};

// Handle messages from main thread
self.onmessage = (event) => {
  const message = event.data;
  
  switch (message.type) {
    case 'CONNECT':
      // Update URL if provided
      if (message.url) {
        wsUrl = message.url;
        console.log(`[Worker] Using WebSocket URL: ${wsUrl}`);
      }
      connectToWebSocket();
      startPingInterval();
      break;
      
    case 'SET_WS_URL':
      wsUrl = message.wsUrl;
      console.log(`[Worker] Updated WebSocket URL to ${wsUrl}`);
      break;
      
    case 'SUBSCRIBE':
      subscribeToTokens(message.tokens);
      break;
      
    case 'UNSUBSCRIBE':
      unsubscribeFromTokens(message.tokens);
      break;
      
    case 'DISCONNECT':
      if (socket) {
        // Clear active subscriptions on explicit disconnect
        activeSubscriptions = [];
        socket.close(1000, "Normal closure");
      }
      self.postMessage({ 
        type: 'CONNECTION_STATUS', 
        status: 'DISCONNECTED' 
      });
      self.postMessage({
        type: 'SUBSCRIPTION_UPDATE',
        subscriptions: []
      });
      break;
      
    case 'GET_CONNECTION_STATUS':
      const status = socket && socket.readyState === WebSocket.OPEN ? 'CONNECTED' : 'DISCONNECTED';
      self.postMessage({ type: 'CONNECTION_STATUS', status });
      break;
      
    case 'GET_INITIAL_DATA':
      sendInitialData();
      break;
      
    default:
      console.log(`[Worker] Received unknown message from main thread: ${message.type}`);
  }
};

// Initialize with disconnected status and connect immediately to reduce load time
self.postMessage({ type: 'CONNECTION_STATUS', status: 'DISCONNECTED' });
connectToWebSocket();
