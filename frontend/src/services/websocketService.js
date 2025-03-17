// WebSocket service using a Web Worker for improved performance
import { toast } from 'react-toastify';

let worker = null;
let eventHandlers = {
  onInitialData: null,
  onPriceUpdate: null,
  onSubscriptionUpdate: null,
  onConnectionStatus: null,
  onReconnecting: null,
  onError: null
};
let isConnected = false;
let isInitialized = false;
let activeSubscriptions = []; // Track active subscriptions across component mounts

// Dynamic server URL based on environment
const getWebSocketUrl = () => {
  // For production deployments
  if (process.env.NODE_ENV === 'production') {
    // Use the API_URL environment variable if set, otherwise use relative path
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL.replace(/^http/, 'ws');
    }
    // Fallback to same domain WebSocket
    return `ws://${window.location.host}/ws`;
  }
  
  // For local development
  return 'ws://localhost:5000';
};

// Initialize the worker
const initializeWorker = () => {
  if (worker) return;
  
  try {
    // Create the worker
    worker = new Worker(new URL('../workers/websocketWorker.js', import.meta.url));
    
    console.log('WebSocket worker created');
    
    // Set up message listener
    worker.onmessage = (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'INITIAL_DATA':
          if (eventHandlers.onInitialData) {
            eventHandlers.onInitialData(message.data);
          }
          break;
        case 'PRICE_UPDATE':
          if (eventHandlers.onPriceUpdate) {
            eventHandlers.onPriceUpdate(message.updates);
          }
          break;
        case 'SUBSCRIPTION_UPDATE':
          if (message.subscriptions) {
            activeSubscriptions = [...message.subscriptions]; // Update cached subscriptions
          }
          if (eventHandlers.onSubscriptionUpdate) {
            eventHandlers.onSubscriptionUpdate(message.subscriptions);
          }
          break;
        case 'CONNECTION_STATUS':
          isConnected = message.status === 'CONNECTED';
          if (eventHandlers.onConnectionStatus) {
            eventHandlers.onConnectionStatus(isConnected);
          }
          break;
        case 'RECONNECTING':
          if (eventHandlers.onReconnecting) {
            eventHandlers.onReconnecting(message.attempt, message.maxAttempts);
          }
          break;
        case 'ERROR':
          if (eventHandlers.onError) {
            eventHandlers.onError(message.error);
          }
          console.error('WebSocket error:', message.error);
          toast.error(message.error);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    };
    
    // Initialize connection
    worker.postMessage({ type: 'CONNECT', url: getWebSocketUrl() });
    
  } catch (error) {
    console.error('Error initializing WebSocket worker:', error);
    toast.error('Failed to initialize WebSocket worker: ' + error.message);
  }
};

// Connect to WebSocket and set up event handlers
const connectToWebSocket = (handlers) => {
  // Initialize handler references
  Object.keys(handlers || {}).forEach(key => {
    if (handlers[key]) {
      eventHandlers[key] = handlers[key];
    }
  });
  
  // Initialize worker if needed
  if (!isInitialized) {
    initializeWorker();
    isInitialized = true;
  } else {
    // Update the new component with the current connection status
    if (eventHandlers.onConnectionStatus) {
      setTimeout(() => {
        eventHandlers.onConnectionStatus(isConnected);
      }, 0);
    }
    
    // Request current data if connected
    if (isConnected && eventHandlers.onInitialData) {
      worker.postMessage({ type: 'GET_INITIAL_DATA' });
    }
    
    // Update new component with current subscriptions
    if (activeSubscriptions.length > 0 && eventHandlers.onSubscriptionUpdate) {
      setTimeout(() => {
        eventHandlers.onSubscriptionUpdate(activeSubscriptions);
      }, 0);
    }
  }
};

// Subscribe to tokens
const subscribeToTokens = (tokens) => {
  if (!worker) {
    console.error('Worker not initialized. Call connectToWebSocket first.');
    return;
  }
  
  if (!Array.isArray(tokens)) {
    tokens = [tokens];
  }
  
  // Update our cache of active subscriptions
  tokens.forEach(token => {
    if (!activeSubscriptions.includes(token)) {
      activeSubscriptions.push(token);
    }
  });
  
  worker.postMessage({
    type: 'SUBSCRIBE',
    tokens
  });
};

// Unsubscribe from tokens
const unsubscribeFromTokens = (tokens) => {
  if (!worker) {
    console.error('Worker not initialized. Call connectToWebSocket first.');
    return;
  }
  
  if (!Array.isArray(tokens)) {
    tokens = [tokens];
  }
  
  // Update our cache of active subscriptions
  activeSubscriptions = activeSubscriptions.filter(token => !tokens.includes(token));
  
  worker.postMessage({
    type: 'UNSUBSCRIBE',
    tokens
  });
};

// Disconnect from WebSocket
const disconnect = () => {
  if (worker) {
    // Clear all subscriptions on disconnect
    activeSubscriptions = [];
    worker.postMessage({ type: 'DISCONNECT' });
  }
};

// Check connection status
const getConnectionStatus = () => {
  if (worker) {
    worker.postMessage({ type: 'GET_CONNECTION_STATUS' });
  }
  return isConnected;
};

// Get currently active subscriptions
const getActiveSubscriptions = () => {
  return [...activeSubscriptions];
};

export {
  connectToWebSocket,
  subscribeToTokens,
  unsubscribeFromTokens,
  disconnect,
  getConnectionStatus,
  getActiveSubscriptions
};
