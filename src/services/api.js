// CORS proxies to try
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Validate stock symbol format
export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

// Fetch quote for validation
export const fetchQuote = async (symbol) => {
  if (!validateSymbolFormat(symbol)) {
    return { valid: false, error: 'Invalid format. Use ticker symbols like AAPL, MSFT, NVDA' };
  }
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  
  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (response.ok) {
      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data.chart?.result?.[0]?.meta) {
          const meta = data.chart.result[0].meta;
          return { 
            valid: true, 
            name: meta.shortName || meta.longName || meta.symbol || symbol
          };
        } else if (data.chart?.error) {
          return { valid: false, error: data.chart.error.description || 'Symbol not found' };
        }
      }
    }
  } catch (e) {
    console.log('Validation fetch error:', e);
  }

  return { valid: true, name: `${symbol} (unverified - will validate on calculate)` };
};

// Fetch historical data with dividends
export const fetchHistoricalData = async (symbol, start, end) => {
  const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(end).getTime() / 1000);
  
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=div`;
  
  let lastError = null;
  
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(yahooUrl);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      
      const text = await response.text();
      
      // Handle allorigins wrapper format
      let jsonText = text;
      if (text.includes('"contents"')) {
        try {
          const wrapper = JSON.parse(text);
          jsonText = wrapper.contents;
        } catch (e) {
          // Not a wrapper, use original
        }
      }
      
      if (!jsonText.trim().startsWith('{') && !jsonText.trim().startsWith('[')) {
        lastError = new Error('Invalid response format');
        continue;
      }
      
      const data = JSON.parse(jsonText);
      
      if (data.chart?.error) {
        throw new Error(data.chart.error.description || 'Symbol not found');
      }
      
      if (!data.chart?.result?.[0]) {
        lastError = new Error('No data returned');
        continue;
      }
      
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;
      
      // Extract dividend data
      const dividends = {};
      if (result.events?.dividends) {
        Object.values(result.events.dividends).forEach(div => {
          const divDate = new Date(div.date * 1000).toISOString().split('T')[0];
          dividends[divDate] = div.amount;
        });
      }
      
      if (!timestamps || !adjClose) {
        lastError = new Error('Missing price data');
        continue;
      }
      
      const priceData = timestamps.map((ts, i) => {
        const date = new Date(ts * 1000).toISOString().split('T')[0];
        return {
          date,
          price: adjClose[i] || quotes.close[i],
          dividend: dividends[date] || 0
        };
      }).filter(d => d.price !== null && d.price !== undefined);
      
      if (priceData.length === 0) {
        lastError = new Error('No valid price data');
        continue;
      }
      
      return priceData;
      
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  
  throw new Error(lastError?.message || `Could not fetch ${symbol}. Try running from a local server.`);
};

// Fetch analyst and market data
export const fetchAnalystData = async (symbol) => {
  const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price`;
  
  for (const proxyFn of CORS_PROXIES) {
    try {
      const response = await fetch(proxyFn(yahooUrl));
      if (!response.ok) continue;
      
      const text = await response.text();
      if (!text.trim().startsWith('{')) continue;
      
      const data = JSON.parse(text);
      const result = data.quoteSummary?.result?.[0];
      
      if (result) {
        const trend = result.recommendationTrend?.trend?.[0];
        const financial = result.financialData;
        const summary = result.summaryDetail;
        const price = result.price;
        
        return {
          strongBuy: trend?.strongBuy || 0,
          buy: trend?.buy || 0,
          hold: trend?.hold || 0,
          sell: trend?.sell || 0,
          strongSell: trend?.strongSell || 0,
          targetHigh: financial?.targetHighPrice?.raw,
          targetLow: financial?.targetLowPrice?.raw,
          targetMean: financial?.targetMeanPrice?.raw,
          currentPrice: financial?.currentPrice?.raw || price?.regularMarketPrice?.raw,
          recommendation: financial?.recommendationKey,
          name: price?.shortName || price?.longName,
          currency: price?.currency,
          exchange: price?.exchangeName,
          marketCap: price?.marketCap?.raw,
          fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh?.raw,
          fiftyTwoWeekLow: summary?.fiftyTwoWeekLow?.raw,
          fiftyDayAverage: summary?.fiftyDayAverage?.raw,
          twoHundredDayAverage: summary?.twoHundredDayAverage?.raw,
          trailingPE: summary?.trailingPE?.raw,
          forwardPE: summary?.forwardPE?.raw,
          dividendYield: summary?.dividendYield?.raw,
          beta: summary?.beta?.raw,
          volume: summary?.averageVolume?.raw,
          quoteType: price?.quoteType
        };
      }
    } catch (e) {
      continue; // Try next proxy
    }
  }
  
  console.log(`Could not fetch analyst data for ${symbol}`);
  return null;
};
