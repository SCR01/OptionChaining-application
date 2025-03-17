import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Chip, Switch, FormControlLabel, Button } from '@mui/material';
import { AutoSizer, List } from 'react-virtualized';
import { connectToWebSocket, subscribeToTokens, unsubscribeFromTokens, disconnect } from '../services/websocketService';
import './OptionChain.css';

const OptionChain = ({ darkMode, toggleDarkMode }) => {
  const [optionChainData, setOptionChainData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [subscribedTokens, setSubscribedTokens] = useState(['UNDERLYING']);

  const handleInitialData = useCallback((data) => {
    console.log('OptionChain: Received initial data');
    setOptionChainData(data);
    setIsLoading(false);
    
    // Automatically subscribe to underlying and some options for demo
    const defaultTokens = ['UNDERLYING'];
    // Add some strikes around the current price
    if (data && data.strikes && data.strikes.length > 0) {
      const midIndex = Math.floor(data.strikes.length / 2);
      for (let i = Math.max(0, midIndex - 1); i < Math.min(data.strikes.length, midIndex + 2); i++) {
        defaultTokens.push(data.strikes[i].call.token);
        defaultTokens.push(data.strikes[i].put.token);
      }
    }
    // Subscribe to these tokens
    subscribeToTokens(defaultTokens);
    setSubscribedTokens(defaultTokens);
  }, []);

  // Handle individual price updates from WebSocket
  const handlePriceUpdate = useCallback((updates) => {
    if (!updates) return;

    setPriceUpdates(prev => {
      const newUpdates = { ...prev };
      Object.entries(updates).forEach(([token, update]) => {
        newUpdates[token] = {
          ...update,
          updatedAt: Date.now()
        };
      });
      return newUpdates;
    });
  }, []);

  const handleConnectionStatus = useCallback((status) => {
    setIsConnected(status);
    if (status) {
      setReconnecting(false);
    }
  }, []);

  const handleReconnecting = useCallback((attempt, maxAttempts) => {
    console.log(`Reconnecting ${attempt}/${maxAttempts}`);
    setReconnecting(true);
  }, []);

  // Subscribe to a specific option
  const handleSubscribe = useCallback((token) => {
    console.log('Subscribing to token:', token);
    subscribeToTokens([token]);
    setSubscribedTokens(prev => [...prev, token]);
  }, []);

  // Unsubscribe from a specific option
  const handleUnsubscribe = useCallback((token) => {
    console.log('Unsubscribing from token:', token);
    unsubscribeFromTokens([token]);
    setSubscribedTokens(prev => prev.filter(t => t !== token));
  }, []);

  useEffect(() => {
    console.log('OptionChain: Connecting to WebSocket');
    
    // Establish WebSocket connection immediately when component mounts
    connectToWebSocket({
      onInitialData: handleInitialData,
      onPriceUpdate: handlePriceUpdate,
      onConnectionStatus: handleConnectionStatus,
      onReconnecting: handleReconnecting,
      onError: (error) => {
        console.error('Option Chain: WebSocket error:', error);
        setError(`Connection error: ${error.message || error}`);
      }
    });
    
    // Keep track of cleanup function to unsubscribe properly on unmount
    return () => {
      // No need to disconnect on unmount since we want to keep connections between tab switches
    };
  }, [handleInitialData, handlePriceUpdate, handleConnectionStatus, handleReconnecting]);

  // Handle clean unsubscribe on unmount
  useEffect(() => {
    return () => {
      if (subscribedTokens.length > 0) {
        console.log('Unsubscribing from all tokens on unmount');
        unsubscribeFromTokens(subscribedTokens);
      }
    };
  }, [subscribedTokens]);

  // This will be displayed at the top of the component
  const renderHeader = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      p: 2,
      borderBottom: '1px solid',
      borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Chip 
          label={isConnected ? "Connected" : reconnecting ? "Reconnecting..." : "Disconnected"} 
          color={isConnected ? "success" : reconnecting ? "warning" : "error"}
          size="small"
          sx={{ mr: 2 }}
        />
        {optionChainData && (
          <Typography variant="body1">
            {optionChainData.symbol} - {optionChainData.underlyingPrice.toFixed(2)}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isConnected ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              // Unsubscribe from all tokens
              if (subscribedTokens.length > 0) {
                unsubscribeFromTokens(subscribedTokens);
                setSubscribedTokens([]);
              }
              // Disconnect WebSocket
              disconnect();
              setIsConnected(false);
            }}
            sx={{ mr: 2, fontSize: '0.75rem', px: 1, py: 0.5 }}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="success"
            size="small"
            onClick={() => {
              // Reconnect WebSocket
              connectToWebSocket({
                onInitialData: handleInitialData,
                onPriceUpdate: handlePriceUpdate,
                onConnectionStatus: handleConnectionStatus,
                onReconnecting: handleReconnecting,
                onError: (error) => {
                  console.error('Option Chain: WebSocket error:', error);
                  setError(`Connection error: ${error.message || error}`);
                }
              });
            }}
            sx={{ mr: 2, fontSize: '0.75rem', px: 1, py: 0.5 }}
          >
            Connect
          </Button>
        )}
        <FormControlLabel
          control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
          label="Dark Mode"
        />
      </Box>
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading option chain data...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          {isConnected ? 'Connected to server' : reconnecting ? 'Reconnecting...' : 'Connecting to server...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 3
      }}>
        <Typography variant="body1" color="error">{error}</Typography>
      </Box>
    );
  }

  // Get price data from updates for a given token
  const getPriceData = (token) => {
    return priceUpdates[token];
  };

  // Render row function for virtualized list
  const renderRow = ({ index, key, style }) => {
    if (!optionChainData || !optionChainData.strikes) return null;
    
    const strikeData = optionChainData.strikes[index];
    if (!strikeData) return null;
    
    const underlyingPrice = optionChainData.underlyingPrice;
    const strikePrice = strikeData.strikePrice;
    const strikeStyle = strikePrice < underlyingPrice ? 'in-the-money' : 'out-of-the-money';
    
    const callPriceData = getPriceData(strikeData.call.token);
    const putPriceData = getPriceData(strikeData.put.token);
    
    const callPrice = callPriceData ? callPriceData.price : strikeData.call.price;
    const callPriceChange = callPriceData ? callPriceData.percentChange : 0;
    const callUpdated = callPriceData && callPriceData.updatedAt;
    
    const putPrice = putPriceData ? putPriceData.price : strikeData.put.price;
    const putPriceChange = putPriceData ? putPriceData.percentChange : 0;
    const putUpdated = putPriceData && putPriceData.updatedAt;

    const isCallSubscribed = subscribedTokens.includes(strikeData.call.token);
    const isPutSubscribed = subscribedTokens.includes(strikeData.put.token);

    return (
      <div key={key} style={style} className={`option-row ${strikeStyle} ${darkMode ? 'dark-mode' : ''}`}>
        {/* Call Option (CE) */}
        <div className={`option-cell call ${callUpdated ? 'highlight' : ''}`}>
          <div className="price-section">
            <div className="price">{callPrice.toFixed(2)}</div>
            <div className={`change ${callPriceChange >= 0 ? 'positive' : 'negative'}`}>
              {callPriceChange > 0 ? '+' : ''}{callPriceChange.toFixed(2)}%
            </div>
          </div>
          <div className="subscribe-section">
            {isCallSubscribed ? (
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={() => handleUnsubscribe(strikeData.call.token)}
              >
                Unsub
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={() => handleSubscribe(strikeData.call.token)}
              >
                Sub
              </Button>
            )}
          </div>
        </div>
        
        {/* Strike Price */}
        <div className="strike-cell">
          <div className="strike">{strikePrice.toFixed(2)}</div>
        </div>
        
        {/* Put Option (PE) */}
        <div className={`option-cell put ${putUpdated ? 'highlight' : ''}`}>
          <div className="price-section">
            <div className="price">{putPrice.toFixed(2)}</div>
            <div className={`change ${putPriceChange >= 0 ? 'positive' : 'negative'}`}>
              {putPriceChange > 0 ? '+' : ''}{putPriceChange.toFixed(2)}%
            </div>
          </div>
          <div className="subscribe-section">
            {isPutSubscribed ? (
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={() => handleUnsubscribe(strikeData.put.token)}
              >
                Unsub
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={() => handleSubscribe(strikeData.put.token)}
              >
                Sub
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const underlyingData = priceUpdates['UNDERLYING'] || (optionChainData && { price: optionChainData.underlyingPrice, percentChange: 0 });

  return (
    <Box className={`option-chain-container ${darkMode ? 'dark-mode' : ''}`} sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      p: 2
    }}>
      {renderHeader()}
      
      {/* Underlying price */}
      {underlyingData && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h6" component="div">
            Underlying: {underlyingData.price.toFixed(2)}
            <span className={underlyingData.percentChange >= 0 ? 'positive-change' : 'negative-change'} style={{ marginLeft: '10px' }}>
              {underlyingData.percentChange > 0 ? '+' : ''}{underlyingData.percentChange.toFixed(2)}%
            </span>
          </Typography>
        </Box>
      )}
      
      {/* Option chain header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 1,
        fontWeight: 'bold',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>CALL (CE)</Box>
        <Box sx={{ width: '100px', textAlign: 'center' }}>Strike</Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>PUT (PE)</Box>
      </Box>

      <Box sx={{ flex: 1 }}>
        {optionChainData && optionChainData.strikes && (
          <AutoSizer>
            {({ height, width }) => (
              <List
                width={width}
                height={height}
                rowCount={optionChainData.strikes.length}
                rowHeight={60}
                rowRenderer={renderRow}
                overscanRowCount={10}
              />
            )}
          </AutoSizer>
        )}
      </Box>
    </Box>
  );
};

export default OptionChain;
