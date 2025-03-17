// Mock data generator for option chain data

/**
 * Generates a complete set of mock option chain data
 */
const generateMockData = () => {
  const underlyingPrice = 17500;
  const strikes = [];
  
  // Generate strikes around the underlying price
  for (let i = -10; i <= 10; i++) {
    const strikePrice = Math.round((underlyingPrice + i * 100) / 10) * 10;
    
    strikes.push({
      strikePrice,
      call: {
        token: `CE_${strikePrice}`,
        price: calculateCallPrice(underlyingPrice, strikePrice),
        percentChange: 0,
        volume: Math.floor(Math.random() * 10000),
      },
      put: {
        token: `PE_${strikePrice}`,
        price: calculatePutPrice(underlyingPrice, strikePrice),
        percentChange: 0,
        volume: Math.floor(Math.random() * 10000),
      }
    });
  }
  
  return {
    symbol: 'NIFTY',
    underlyingPrice,
    strikes,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Calculate a simple mock price for call options
 */
const calculateCallPrice = (underlyingPrice, strikePrice) => {
  // Simple Black-Scholes approximation
  if (underlyingPrice > strikePrice) {
    // In the money
    const intrinsicValue = underlyingPrice - strikePrice;
    const timeValue = Math.random() * 50 + 20;
    return parseFloat((intrinsicValue + timeValue).toFixed(2));
  } else {
    // Out of the money
    const distanceFromStrike = Math.abs(underlyingPrice - strikePrice);
    const timeValue = Math.max(5, 100 - distanceFromStrike / 10);
    return parseFloat(timeValue.toFixed(2));
  }
};

/**
 * Calculate a simple mock price for put options
 */
const calculatePutPrice = (underlyingPrice, strikePrice) => {
  // Simple Black-Scholes approximation
  if (underlyingPrice < strikePrice) {
    // In the money
    const intrinsicValue = strikePrice - underlyingPrice;
    const timeValue = Math.random() * 50 + 20;
    return parseFloat((intrinsicValue + timeValue).toFixed(2));
  } else {
    // Out of the money
    const distanceFromStrike = Math.abs(underlyingPrice - strikePrice);
    const timeValue = Math.max(5, 100 - distanceFromStrike / 10);
    return parseFloat(timeValue.toFixed(2));
  }
};

/**
 * Generates random price updates for options
 */
const generatePriceUpdates = (mockData) => {
  const updates = {};
  const tokens = getAllTokens(mockData);
  
  // Randomly select 30% of tokens to update
  const tokensToUpdate = tokens
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.ceil(tokens.length * 0.3));
  
  // Generate random updates
  tokensToUpdate.forEach(token => {
    let currentPrice = 0;
    
    // Find current price
    if (token === 'UNDERLYING') {
      currentPrice = mockData.underlyingPrice;
    } else {
      mockData.strikes.forEach(strike => {
        if (strike.call.token === token) {
          currentPrice = strike.call.price;
        } else if (strike.put.token === token) {
          currentPrice = strike.put.price;
        }
      });
    }
    
    // Calculate new price with random change
    const percentChange = parseFloat((Math.random() * 4 - 2).toFixed(2)); // -2% to +2%
    const newPrice = parseFloat((currentPrice * (1 + percentChange / 100)).toFixed(2));
    
    updates[token] = {
      price: newPrice,
      percentChange
    };
  });
  
  return updates;
};

/**
 * Helper to get all tokens from mock data
 */
const getAllTokens = (mockData) => {
  const tokens = ['UNDERLYING'];
  
  mockData.strikes.forEach(strike => {
    tokens.push(strike.call.token);
    tokens.push(strike.put.token);
  });
  
  return tokens;
};

// Generate initial data with symbol, underlying price, and options data
const generateInitialData = () => {
  // Use the existing generateMockData function to create our initial data
  return generateMockData();
};

// Generate a unique session ID for tracking connections
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substring(2, 15);
};

module.exports = {
  generateMockData,
  generatePriceUpdates,
  generateInitialData,
  generateSessionId
};
