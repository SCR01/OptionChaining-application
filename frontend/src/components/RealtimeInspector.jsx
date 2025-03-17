import React, { useState, useEffect, useCallback } from 'react';
import { connectToWebSocket, subscribeToTokens, unsubscribeFromTokens, disconnect } from '../services/websocketService';
import { Box, TextField, Button, Card, CardContent, Typography, Chip, IconButton, Grid, CircularProgress, Switch, FormControlLabel } from '@mui/material';
import { HighlightOff, TrendingUp, TrendingDown } from '@mui/icons-material';
import './RealtimeInspector.css';

const RealtimeInspector = ({ darkMode, toggleDarkMode }) => {
  // Using state to store option chain data for component functionality
  const [optionChainData, setOptionChainData] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionUpdates, setSubscriptionUpdates] = useState({});
  const [tokenSearch, setTokenSearch] = useState('');
  const [availableTokens, setAvailableTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [customToken, setCustomToken] = useState('');

  const handleInitialData = useCallback((data) => {
    setOptionChainData(data);
    setIsLoading(false);

    // Prepare available tokens list
    const tokens = [
      { token: 'UNDERLYING', label: 'Underlying Asset', type: 'UNDERLYING' },
      ...data.strikes.flatMap(strike => [
        { 
          token: strike.call.token, 
          label: `CALL ${strike.strikePrice}`, 
          type: 'CALL', 
          strike: strike.strikePrice 
        },
        { 
          token: strike.put.token, 
          label: `PUT ${strike.strikePrice}`, 
          type: 'PUT', 
          strike: strike.strikePrice 
        }
      ])
    ];
    setAvailableTokens(tokens);
    
    // No longer auto-subscribing to underlying token
    // Let the user explicitly subscribe to tokens they want
  }, []);

  const handlePriceUpdate = useCallback((data) => {
    setSubscriptionUpdates(prev => {
      const newUpdates = { ...prev };
      
      // Safely process updates
      Object.entries(data).forEach(([token, update]) => {
        if (!update) return; // Skip if update is undefined
        
        // Extract price and percentChange, handling different property names
        const price = update.price !== undefined ? update.price : 
                     (update.currentPrice !== undefined ? update.currentPrice : 0);
        const percentChange = update.percentChange !== undefined ? update.percentChange : 0;
        
        if (!newUpdates[token]) {
          newUpdates[token] = {
            values: [],
            currentPrice: price,
            percentChange: percentChange,
            updatedAt: Date.now()
          };
        } else {
          newUpdates[token].currentPrice = price;
          newUpdates[token].percentChange = percentChange;
          newUpdates[token].updatedAt = Date.now();
        }
        
        // Keep only the last 20 updates for the chart
        newUpdates[token].values = [
          ...newUpdates[token].values.slice(-19),
          price
        ];
      });
      
      return newUpdates;
    });
  }, []);

  const handleSubscriptionUpdate = useCallback((subs) => {
    setSubscriptions(subs);
  }, []);

  const handleConnectionStatus = useCallback((status) => {
    setIsConnected(status);
    if (status) {
      setReconnecting(false);
    }
  }, []);

  const handleReconnecting = useCallback((attempt, maxAttempts) => {
    setReconnecting(true);
  }, []);

  useEffect(() => {
    console.log('RealtimeInspector: Connecting to WebSocket');
    
    // Establish WebSocket connection immediately when component mounts
    connectToWebSocket({
      onInitialData: handleInitialData,
      onPriceUpdate: handlePriceUpdate,
      onSubscriptionUpdate: handleSubscriptionUpdate,
      onConnectionStatus: handleConnectionStatus,
      onReconnecting: handleReconnecting,
      onError: (error) => {
        console.error('RealtimeInspector WebSocket error:', error);
        setConnectionError('Connection error: ' + (error.message || error));
      }
    });
    
    // Keep track of cleanup function to unsubscribe properly on unmount
    return () => {
      console.log('RealtimeInspector: Cleaning up');
      // No need to disconnect on unmount since we want to keep connections between tab switches
    };
  }, [handleInitialData, handlePriceUpdate, handleSubscriptionUpdate, handleConnectionStatus, handleReconnecting]);

  const handleTokenSubscribe = (token) => {
    console.log('Subscribing to token:', token);
    // Add to local state immediately for responsive UI
    setSubscriptions(prev => {
      if (!prev.includes(token)) {
        return [...prev, token];
      }
      return prev;
    });
    subscribeToTokens([token]);
  };

  const handleTokenUnsubscribe = (token) => {
    console.log('Unsubscribing from token:', token);
    // Remove from local state immediately for responsive UI
    setSubscriptions(prev => prev.filter(t => t !== token));
    unsubscribeFromTokens([token]);
  };

  const handleCustomTokenSubscribe = () => {
    if (customToken.trim()) {
      handleTokenSubscribe(customToken.trim());
      setCustomToken('');
    }
  };

  const filteredTokens = availableTokens.filter(item => 
    item.label.toLowerCase().includes(tokenSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <Box className={`${darkMode ? 'dark-mode' : ''}`} sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: darkMode ? '#121212' : '#f5f5f5',
        color: darkMode ? '#fff' : '#333'
      }}>
        <CircularProgress color="primary" />
        <Typography variant="h6">Loading data...</Typography>
        <FormControlLabel
          control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
          label="Dark Mode"
        />
      </Box>
    );
  }

  if (connectionError) {
    return (
      <Box className={`${darkMode ? 'dark-mode' : ''}`} sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: darkMode ? '#121212' : '#f5f5f5',
        color: darkMode ? '#fff' : '#333'
      }}>
        <Typography variant="h6" color="error">{connectionError}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
        <FormControlLabel
          control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
          label="Dark Mode"
        />
      </Box>
    );
  }

  const hasOptionData = Boolean(optionChainData);

  return (
    <Box className={`realtime-inspector ${darkMode ? 'dark-mode' : ''}`} sx={{
      display: 'flex',
      height: 'calc(100vh - 64px)',
      backgroundColor: darkMode ? '#121212' : '#f5f5f5',
      color: darkMode ? '#fff' : '#333',
      overflow: 'hidden'
    }}>
      <Box className="inspector-sidebar" sx={{
        width: '300px',
        borderRight: '1px solid',
        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'hidden',
        backgroundColor: darkMode ? '#1e1e1e' : '#fff'
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Chip 
              label={isConnected ? "Connected" : reconnecting ? "Reconnecting..." : "Disconnected"} 
              color={isConnected ? "success" : reconnecting ? "warning" : "error"}
              size="small"
              sx={{ mr: 1 }}
            />
            {isConnected ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  // Unsubscribe from all tokens
                  if (subscriptions.length > 0) {
                    unsubscribeFromTokens(subscriptions);
                    setSubscriptions([]);
                    setSubscriptionUpdates({});
                  }
                  // Disconnect WebSocket
                  disconnect();
                  setIsConnected(false);
                }}
                sx={{ fontSize: '0.75rem', px: 1, py: 0.5 }}
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
                    onSubscriptionUpdate: handleSubscriptionUpdate,
                    onConnectionStatus: handleConnectionStatus,
                    onReconnecting: handleReconnecting,
                    onError: (error) => {
                      console.error('RealtimeInspector WebSocket error:', error);
                      setConnectionError('Connection error: ' + (error.message || error));
                    }
                  });
                }}
                sx={{ fontSize: '0.75rem', px: 1, py: 0.5 }}
              >
                Connect
              </Button>
            )}
            <FormControlLabel
              control={<Switch size="small" checked={darkMode} onChange={toggleDarkMode} />}
              label="Dark"
              sx={{ ml: 'auto' }}
            />
          </Box>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search tokens..."
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                color: darkMode ? '#fff' : 'inherit',
                '& fieldset': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                opacity: 1,
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Custom token"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                  color: darkMode ? '#fff' : 'inherit',
                  '& fieldset': {
                    borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  },
                },
              }}
            />
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleCustomTokenSubscribe}
              disabled={!customToken.trim()}
            >
              Add
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ 
          overflowY: 'auto', 
          flex: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: darkMode ? '#1e1e1e' : '#f5f5f5',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: darkMode ? '#555' : '#ccc',
            borderRadius: '4px',
          },
        }}>
          {hasOptionData && filteredTokens.map((item) => (
            <Box key={item.token} sx={{ 
              p: 1, 
              borderBottom: '1px solid', 
              borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              }
            }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                <Typography variant="caption" sx={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                  {item.type}
                </Typography>
              </Box>
              {subscriptions.includes(item.token) ? (
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={() => handleTokenUnsubscribe(item.token)}
                  sx={{ minWidth: '100px' }}
                >
                  Remove
                </Button>
              ) : (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  onClick={() => handleTokenSubscribe(item.token)}
                  sx={{ minWidth: '100px' }}
                >
                  Subscribe
                </Button>
              )}
            </Box>
          ))}
        </Box>
      </Box>
      
      <Box className="inspector-content" sx={{ 
        flex: 1, 
        p: 2, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: darkMode ? '#121212' : '#f5f5f5',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: darkMode ? '#555' : '#ccc',
          borderRadius: '4px',
        },
      }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Active Subscriptions</Typography>
        
        {subscriptions.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center', 
            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 1,
          }}>
            <Typography>
              No active subscriptions. Subscribe to tokens to see real-time updates.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {subscriptions.map(token => {
              const data = subscriptionUpdates[token] || { currentPrice: '-', percentChange: 0, values: [] };
              const tokenInfo = availableTokens.find(t => t.token === token) || { label: token, type: 'Custom' };
              const isPositiveChange = data.percentChange >= 0;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={token}>
                  <Card 
                    elevation={3} 
                    sx={{
                      overflow: 'visible',
                      height: '100%',
                      backgroundColor: darkMode ? '#1e1e1e' : '#fff',
                      borderLeft: '4px solid',
                      borderColor: isPositiveChange ? '#4caf50' : '#f44336',
                      transition: 'all 0.3s ease',
                      animation: data.updatedAt ? 'pulse 0.5s' : 'none',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            flex: 1, 
                            fontWeight: 500, 
                            color: darkMode ? '#fff' : 'inherit',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {tokenInfo.label}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={tokenInfo.type} 
                          sx={{ mr: 1 }} 
                          color={
                            tokenInfo.type === 'CALL' ? 'success' : 
                            tokenInfo.type === 'PUT' ? 'error' : 
                            'info'
                          }
                        />
                        <IconButton 
                          size="small" 
                          color="default" 
                          onClick={() => handleTokenUnsubscribe(token)}
                          sx={{ p: 0.5 }}
                        >
                          <HighlightOff />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography 
                          variant="h5" 
                          sx={{ fontWeight: 'bold', color: darkMode ? '#fff' : 'inherit' }}
                        >
                          {data.currentPrice !== '-' ? data.currentPrice.toFixed(2) : '-'}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          ml: 1.5,
                          color: isPositiveChange ? '#4caf50' : '#f44336',
                        }}>
                          {isPositiveChange ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                          <Typography 
                            sx={{ 
                              fontWeight: 500,
                              ml: 0.5
                            }}
                          >
                            {isPositiveChange ? '+' : ''}{data.percentChange !== undefined ? data.percentChange.toFixed(2) : 0}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      {data.values.length > 1 && (
                        <Box sx={{ 
                          height: '60px', 
                          mt: 1, 
                          display: 'flex', 
                          alignItems: 'flex-end',
                          gap: '2px',
                          borderBottom: '1px solid',
                          borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          pt: 1
                        }}>
                          {data.values.map((value, index) => {
                            const min = Math.min(...data.values);
                            const max = Math.max(...data.values);
                            const range = max - min || 1;
                            const height = ((value - min) / range) * 100;
                            const isPositive = index > 0 ? value >= data.values[index - 1] : true;
                            
                            return (
                              <Box 
                                key={index} 
                                sx={{ 
                                  flex: 1,
                                  height: `${Math.max(5, height)}%`,
                                  backgroundColor: isPositive ? '#4caf50' : '#f44336',
                                  opacity: index === data.values.length - 1 ? 1 : 0.7,
                                  borderRadius: '1px',
                                  transition: 'height 0.3s ease'
                                }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default RealtimeInspector;
