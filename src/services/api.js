// Point to our local Vercel serverless function
// This avoids CORS issues and Yahoo 401 blocks by handling requests server-side
const PROXY_URL = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

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
  
  // Use query2 as it is generally more reliable than query1
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  
  try {
    const response = await fetch(PROXY_URL(url));
    if (response.ok) {
      const data = await response.json();
      
      // Handle the data structure
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
  } catch (e) {
    console.log('Validation fetch error:', e);
  }

  return { valid: true, name: `${symbol} (unverified - will validate on calculate)` };
};

// Fetch historical data with dividends
export const fetchHistoricalData = async (symbol, start, end) => {
  const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(end).getTime() / 1000);
  
  const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=div`;
  
  try {
    const response = await fetch(PROXY_URL(yahooUrl));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.chart?.error) {
      throw new Error(data.chart.error.description || 'Symbol not found');
    }
    
    if (!data.chart?.result?.[0]) {
      throw new Error('No data returned');
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
      throw new Error('Missing price data');
    }
    
    const priceData = timestamps.map((ts, i) => {
      const date = new Date(ts * 1000).toISOString().split('T')[0];
      return {
        date,
        price: adjClose[i] || quotes.close[i],
        dividend: dividends[date] || 0
      };
    }).filter(d => d.price !== null && d.price !== undefined);
    
    return priceData;
    
  } catch (err) {
    throw new Error(err.message || `Could not fetch ${symbol}`);
  }
};

// Fetch analyst and market data
export const fetchAnalystData = async (symbol) => {
  // Use timestamp to prevent caching
  const t = new Date().getTime();
  
  // We request all modules needed for FMV, AUM, and Trend analysis
  const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
  try {
    const response = await fetch(PROXY_URL(yahooUrl));
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];
    
    if (result) {
      const trend = result.recommendationTrend?.trend?.[0];
      const financial = result.financialData;
      const summary = result.summaryDetail;
      const price = result.price;
      const calendar = result.calendarEvents;
      const keyStats = result.defaultKeyStatistics;
      const fundProfile = result.fundProfile;
      
      const earningsDate = calendar?.earnings?.earningsDate?.[0]?.raw;
      const currentPrice = financial?.currentPrice?.raw || price?.regularMarketPrice?.raw;
      
      // Extract AUM (Assets Under Management)
      const totalAssets = summary?.totalAssets?.raw || fundProfile?.totalAssets?.raw || keyStats?.totalAssets?.raw;
      
      // --- Fair Market Value (FMV) Calculation Logic ---
      const bookValue = keyStats?.bookValue?.raw;
      const priceToBook = keyStats?.priceToBook?.raw;
      const forwardPE = summary?.forwardPE?.raw || keyStats?.forwardPE?.raw;
      const forwardEps = keyStats?.forwardEps?.raw;
      const pegRatio = keyStats?.pegRatio?.raw;
      
      let fmvEstimate = null;
      let fmvMethod = null;
      
      // Method 1: Target Mean from analysts (most reliable)
      if (financial?.targetMeanPrice?.raw) {
        fmvEstimate = financial.targetMeanPrice.raw;
        fmvMethod = 'Analyst Target';
      }
      // Method 2: Forward PE * Forward EPS
      else if (forwardPE && forwardEps && forwardPE > 0 && forwardPE < 100) {
        fmvEstimate = forwardPE * forwardEps;
        fmvMethod = 'Forward PE';
      }
      // Method 3: Book Value * reasonable P/B multiple
      else if (bookValue && bookValue > 0) {
        const reasonablePB = Math.min(priceToBook || 2, 5);
        fmvEstimate = bookValue * reasonablePB;
        fmvMethod = 'Book Value';
      }
      // -----------------------------------------------

      return {
        strongBuy: trend?.strongBuy || 0,
        buy: trend?.buy || 0,
        hold: trend?.hold || 0,
        sell: trend?.sell || 0,
        strongSell: trend?.strongSell || 0,
        targetHigh: financial?.targetHighPrice?.raw,
        targetLow: financial?.targetLowPrice?.raw,
        targetMean: financial?.targetMeanPrice?.raw,
        currentPrice,
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
        forwardPE: forwardPE,
        dividendYield: summary?.dividendYield?.raw,
        beta: summary?.beta?.raw,
        volume: summary?.volume?.raw || price?.regularMarketVolume?.raw,
        averageVolume: summary?.averageVolume?.raw || price?.averageDailyVolume10Day?.raw,
        quoteType: price?.quoteType,
        
        // Formatted Dates
        earningsDate: earningsDate ? new Date(earningsDate * 1000).toISOString().split('T')[0] : null,
        
        // FMV Fields
        bookValue,
        priceToBook,
        forwardEps,
        pegRatio,
        fmvEstimate,
        fmvMethod,
        enterpriseValue: keyStats?.enterpriseValue?.raw,
        profitMargins: keyStats?.profitMargins?.raw,
        revenueGrowth: financial?.revenueGrowth?.raw,
        earningsGrowth: financial?.earningsGrowth?.raw,
        
        // NEW FIELDS: AUM & Trend
        totalAssets: totalAssets,
        // Using bracket notation to safely access keys starting with numbers
        fiftyTwoWeekChange: keyStats?.['52WeekChange']?.raw || summary?.fiftyTwoWeekChange?.raw,
        ytdReturn: keyStats?.ytdReturn?.raw || fundProfile?.ytdReturn?.raw,
      };
    }
  } catch (e) {
    console.log(`Could not fetch analyst data for ${symbol}:`, e);
  }
  
  return null;
};
