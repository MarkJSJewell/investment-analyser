// 1. PROXY CONFIGURATION
// ----------------------

// The local Vercel proxy (Best for Production & reliability)
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Public backup proxies (For when running 'npm run dev' locally)
const PUBLIC_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`, 
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// 2. HELPER FUNCTIONS
// -------------------

// Smart fetcher: Tries local proxy first -> Falls back to public proxies
const fetchYahoo = async (yahooUrl) => {
  // Strategy A: Try the Vercel Serverless Function (Preferred)
  try {
    const res = await fetch(VERCEL_PROXY(yahooUrl));
    
    // If we get a 200 OK, great! Return the data.
    if (res.ok) {
      const text = await res.text();
      // Verify it's valid JSON before returning
      if (text.trim().startsWith('{')) {
        return JSON.parse(text);
      }
    }
    
    // If 404 (Localhost doesn't have the API) or 500 (Server error), throw to trigger fallback
    throw new Error(`Local proxy failed with ${res.status}`);
    
  } catch (localError) {
    // Strategy B: Fallback to Public Proxies
    // console.warn('Local proxy failed, switching to public proxies...', localError);
    
    for (const proxyFn of PUBLIC_PROXIES) {
      try {
        const res = await fetch(proxyFn(yahooUrl));
        if (!res.ok) continue;
        
        const text = await res.text();
        
        // Handle wrappers like AllOrigins
        let jsonText = text;
        if (text.includes('"contents"')) {
           try {
             const wrapper = JSON.parse(text);
             if (wrapper.contents) jsonText = wrapper.contents;
           } catch(e) {}
        }
        
        if (jsonText.trim().startsWith('{')) {
          return JSON.parse(jsonText);
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  throw new Error('All proxy attempts failed');
};

export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

// 3. EXPORTED API FUNCTIONS
// -------------------------

// Fetch quote for validation
export const fetchQuote = async (symbol) => {
  if (!validateSymbolFormat(symbol)) {
    return { valid: false, error: 'Invalid format. Use ticker symbols like AAPL, MSFT, NVDA' };
  }
  
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  
  try {
    const data = await fetchYahoo(url);
    if (data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      return { 
        valid: true, 
        name: meta.shortName || meta.longName || meta.symbol || symbol
      };
    } else if (data.chart?.error) {
      return { valid: false, error: data.chart.error.description || 'Symbol not found' };
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
    const data = await fetchYahoo(yahooUrl);
    
    if (data.chart?.error) throw new Error(data.chart.error.description);
    if (!data.chart?.result?.[0]) throw new Error('No data returned');
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;
    
    const dividends = {};
    if (result.events?.dividends) {
      Object.values(result.events.dividends).forEach(div => {
        const divDate = new Date(div.date * 1000).toISOString().split('T')[0];
        dividends[divDate] = div.amount;
      });
    }
    
    if (!timestamps || !adjClose) throw new Error('Missing price data');
    
    return timestamps.map((ts, i) => {
      const date = new Date(ts * 1000).toISOString().split('T')[0];
      return {
        date,
        price: adjClose[i] || quotes.close[i],
        dividend: dividends[date] || 0
      };
    }).filter(d => d.price !== null && d.price !== undefined);
    
  } catch (err) {
    throw new Error(err.message || `Could not fetch ${symbol}`);
  }
};

// Helper: Pause execution for a random time between min and max ms
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

// Fetch analyst and market data
export const fetchAnalystData = async (symbol) => {
  // 1. Add "Jitter" delay
  // Wait 500ms to 2000ms before requesting. This prevents hitting the rate limit
  // when the page loads multiple stocks at once.
  await delay(500, 2000);

  // Use timestamp to prevent local browser caching, but rely on Proxy caching
  const t = new Date().getTime();
  
  // NOTE: We stripped 'fundProfile' if it causes issues, but kept it here. 
  // If 429 persists, try removing 'fundProfile' from this list.
  const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
  try {
    // We reuse the smart fetcher from before (ensure fetchYahoo is defined in your file)
    // If you don't have fetchYahoo defined in this scope, just use:
    // const response = await fetch(`/api/proxy?url=${encodeURIComponent(yahooUrl)}`);
    // const data = await response.json();
    
    // Assuming you have the fetchYahoo helper from the previous step:
    const data = await fetchYahoo(yahooUrl); 
    
    if (!data) return null;
    
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
      const totalAssets = summary?.totalAssets?.raw || fundProfile?.totalAssets?.raw || keyStats?.totalAssets?.raw;
      
      // FMV Logic
      let fmvEstimate = null;
      let fmvMethod = null;
      const bookValue = keyStats?.bookValue?.raw;
      const forwardPE = summary?.forwardPE?.raw || keyStats?.forwardPE?.raw;
      const forwardEps = keyStats?.forwardEps?.raw;

      if (financial?.targetMeanPrice?.raw) {
        fmvEstimate = financial.targetMeanPrice.raw;
        fmvMethod = 'Analyst Target';
      } else if (forwardPE && forwardEps && forwardPE > 0 && forwardPE < 100) {
        fmvEstimate = forwardPE * forwardEps;
        fmvMethod = 'Forward PE';
      } else if (bookValue && bookValue > 0) {
        const reasonablePB = Math.min(keyStats?.priceToBook?.raw || 2, 5);
        fmvEstimate = bookValue * reasonablePB;
        fmvMethod = 'Book Value';
      }

      return {
        strongBuy: trend?.strongBuy || 0,
        buy: trend?.buy || 0,
        hold: trend?.hold || 0,
        sell: trend?.sell || 0,
        strongSell: trend?.strongSell || 0,
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
        earningsDate: earningsDate ? new Date(earningsDate * 1000).toISOString().split('T')[0] : null,
        bookValue,
        priceToBook: keyStats?.priceToBook?.raw,
        forwardEps,
        pegRatio: keyStats?.pegRatio?.raw,
        fmvEstimate,
        fmvMethod,
        enterpriseValue: keyStats?.enterpriseValue?.raw,
        profitMargins: keyStats?.profitMargins?.raw,
        revenueGrowth: financial?.revenueGrowth?.raw,
        earningsGrowth: financial?.earningsGrowth?.raw,
        totalAssets: totalAssets,
        fiftyTwoWeekChange: keyStats?.['52WeekChange']?.raw || summary?.fiftyTwoWeekChange?.raw,
        ytdReturn: keyStats?.ytdReturn?.raw || fundProfile?.ytdReturn?.raw,
      };
    }
  } catch (e) {
    console.log(`Could not fetch analyst data for ${symbol}:`, e);
  }
  return null;
};
