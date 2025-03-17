const getOptionChainData = () => {
  const baseStrike = 22500;
  const strikeGap = 100;
  const strikesCount = 75;
  const underlyingPrice = 22750;

  const strikes = [];
  const startStrike = baseStrike - (Math.floor(strikesCount / 2) * strikeGap);

  for (let i = 0; i < strikesCount; i++) {
    const strike = startStrike + (i * strikeGap);

    const callOption = {
      token: `CALL_${strike}`,
      strike,
      type: 'CALL',
      yesterdayPrice: getRandomPrice(Math.abs(underlyingPrice - strike)),
      currentPrice: 0,
      percentChange: 0,
    };

    const putOption = {
      token: `PUT_${strike}`,
      strike,
      type: 'PUT',
      yesterdayPrice: getRandomPrice(Math.abs(underlyingPrice - strike)),
      currentPrice: 0,
      percentChange: 0,
    };

    strikes.push({
      strike,
      call: callOption,
      put: putOption,
    });
  }

  return {
    underlyingPrice,
    yesterdayUnderlyingPrice: underlyingPrice - getRandomPrice(100),
    strikes
  };
};

function getRandomPrice(distanceFromATM) {
  const basePrice = Math.max(10, 500 - (distanceFromATM / 10));
  return parseFloat((basePrice + (Math.random() * 50)).toFixed(2));
}

const generatePriceUpdates = (subscriptions, optionChainData) => {
  if (!subscriptions || subscriptions.length === 0) return {};

  const updates = {};

  const tokensToUpdate = subscriptions
    .filter(() => Math.random() > 0.7)
    .slice(0, 10);

  tokensToUpdate.forEach(token => {
    let option;

    for (const strikeData of optionChainData.strikes) {
      if (strikeData.call.token === token) {
        option = strikeData.call;
        break;
      } else if (strikeData.put.token === token) {
        option = strikeData.put;
        break;
      }
    }

    if (option) {
      const changePercent = (Math.random() * 10 - 5) / 100;
      const newPrice = option.yesterdayPrice * (1 + changePercent);

      updates[token] = {
        currentPrice: parseFloat(newPrice.toFixed(2)),
        percentChange: parseFloat((changePercent * 100).toFixed(2))
      };
    }
  });

  if (Math.random() > 0.8) {
    const changePercent = (Math.random() * 2 - 1) / 100;
    const newUnderlyingPrice = optionChainData.underlyingPrice * (1 + changePercent);

    updates['UNDERLYING'] = {
      currentPrice: parseFloat(newUnderlyingPrice.toFixed(2)),
      percentChange: parseFloat(((newUnderlyingPrice / optionChainData.yesterdayUnderlyingPrice - 1) * 100).toFixed(2))
    };

    optionChainData.underlyingPrice = newUnderlyingPrice;
  }

  return updates;
};

module.exports = {
  getOptionChainData,
  generatePriceUpdates
};
