export const findBestAndWorstTrades = (priceData) => {
  if (!priceData || priceData.length < 2) return null;

  let bestTrade = { buyDate: '', sellDate: '', profit: -Infinity, buyPrice: 0, sellPrice: 0, percent: 0 };
  let worstTrade = { buyDate: '', sellDate: '', profit: Infinity, buyPrice: 0, sellPrice: 0, percent: 0 };

  // O(N^2) approach is fine for < 1000 data points (3 years)
  // We check every possible pair of (Buy Day, Sell Day) where Sell > Buy
  
  for (let i = 0; i < priceData.length - 1; i++) {
    const buy = priceData[i];
    
    for (let j = i + 1; j < priceData.length; j++) {
      const sell = priceData[j];
      const profit = sell.price - buy.price;
      const percent = (profit / buy.price) * 100;

      // Check Best (Max Profit)
      if (profit > bestTrade.profit) {
        bestTrade = {
          buyDate: buy.date,
          sellDate: sell.date,
          buyPrice: buy.price,
          sellPrice: sell.price,
          profit,
          percent
        };
      }

      // Check Worst (Max Loss / Min Profit)
      if (profit < worstTrade.profit) {
        worstTrade = {
          buyDate: buy.date,
          sellDate: sell.date,
          buyPrice: buy.price,
          sellPrice: sell.price,
          profit,
          percent
        };
      }
    }
  }

  return { bestTrade, worstTrade };
};
