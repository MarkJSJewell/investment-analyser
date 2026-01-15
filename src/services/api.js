// Point to our local Vercel proxy
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Helper: Pause execution (Jitter)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Smart fetcher with robust error handling
const fetchYahoo = async (yahooUrl, retryCount = 0) => {
  try {
    const res = await fetch(VERCEL_PROXY(yahooUrl));
    
    // If successful, return data
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
    }
    
    // If Rate Limited (429) or Unauthorized (401), wait and retry
    // We retry up to 3 times with increasing delays (2s, 4s, 6s)
    if ((res.status === 429 || res.status === 401) && retryCount < 3) {
      const delayTime = 2000 * (retryCount + 1); 
      console.warn(`Rate limited (429/401). Waiting ${delayTime}ms...`);
      await wait(delayTime);
      return fetchYahoo(yahooUrl, retryCount + 1); // Recursive Retry
    }
    
    console.warn(`Proxy failed with status ${res.status}`);
    return null; // Fail gracefully so the app doesn't crash
  } catch (error) {
    console.warn('Fetch error:', error);
    return null;
  }
};

export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) ||
         /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

export const searchSymbol = async (query) => {
  // Use query1 via proxy
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  try {
    const data = await fetchYahoo(url);
    if (data && data.quotes && data.quotes.length > 0) {
      const bestMatch = data.quotes[0];
      return {
        symbol: bestMatch.symbol,
        name: bestMatch.shortname || bestMatch.longname,
        type: bestMatch.quoteType
      };
    }
  } catch (e) { console.log('Search failed:', e); }
  return null;
};

export const fetchQuote = async (symbol) => {
  let targetSymbol = symbol;
  // Handle ISIN
  if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol)) {
    const searchResult = await searchSymbol(symbol);
    if (searchResult) targetSymbol = searchResult.symbol;
  }

  if (!validateSymbolFormat(targetSymbol)) {
    return { valid: false, error: 'Invalid format.' };
  }
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`;
  
  try {
    const data = await fetchYahoo(url);
    if (data && data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      return { 
        valid: true, 
        name: meta.shortName || meta.longName || meta.symbol || targetSymbol,
        symbol: targetSymbol 
      };
    } else if (data && data.chart?.error) {
      return { valid: false, error: data.chart.error.description || 'Symbol not found' };
    }
  } catch (e) {
    console.log('Validation fetch error:', e);
  }
  return { valid: true, name: `${targetSymbol} (unverified)`, symbol: targetSymbol };
};

export const fetchHistoricalData = async (symbol, start, end) => {
  const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(end).getTime() / 1000);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=div`;
  
  try {
    await wait(1000); // Standard courtesy delay
    const data = await fetchYahoo(yahooUrl);
    
    if (!data || !data.chart?.result?.[0]) throw new Error('No data');
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
    
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: adjClose[i] || quotes.close[i],
      dividend: dividends[new Date(ts * 1000).toISOString().split('T')[0]] || 0
    })).filter(d => d.price !== null);
    
  } catch (err) {
    throw new Error(err.message || `Could not fetch ${symbol}`);
  }
};

export const fetchAnalystData = async (symbol) => {
  // 1. Initial delay to stagger requests
  await wait(1500);

  const t = new Date().getTime();
  const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
  try {
    const data = await fetchYahoo(yahooUrl);
    if (!data) return null; 
    
    const result = data.quoteSummary?.result?.[0];
    if (result) {
      const financial = result.financialData;
      const summary = result.summaryDetail;
      const price = result.price;
      const keyStats = result.defaultKeyStatistics;
      const fundProfile = result.fundProfile;
      const trend = result.recommendationTrend?.trend?.[0];
      
      const totalAssets = summary?.totalAssets?.raw || fundProfile?.totalAssets?.raw || keyStats?.totalAssets?.raw;
      const currentPrice = financial?.currentPrice?.raw || price?.regularMarketPrice?.raw;

      let fmvEstimate = null;
      let fmvMethod = null;
      if (financial?.targetMeanPrice?.raw) {
        fmvEstimate = financial.targetMeanPrice.raw;
        fmvMethod = 'Analyst Target';
      }

      return {
        targetMean: financial?.targetMeanPrice?.raw,
        currentPrice,
        recommendation: financial?.recommendationKey,
        name: price?.shortName || price?.longName,
        currency: price?.currency,
        totalAssets: totalAssets,
        fiftyTwoWeekChange: keyStats?.['52WeekChange']?.raw || summary?.fiftyTwoWeekChange?.raw,
        ytdReturn: keyStats?.ytdReturn?.raw || fundProfile?.ytdReturn?.raw,
        fmvEstimate, fmvMethod,
        strongBuy: trend?.strongBuy || 0,
        buy: trend?.buy || 0,
        hold: trend?.hold || 0,
        sell: trend?.sell || 0,
        strongSell: trend?.strongSell || 0,
        earningsDate: result.calendarEvents?.earnings?.earningsDate?.[0]?.raw ? new Date(result.calendarEvents.earnings.earningsDate[0].raw * 1000).toISOString().split('T')[0] : null,
        
        // Ensure Dividend Yield is captured
        dividendYield: summary?.dividendYield?.raw || summary?.yield?.raw
      };
    }
  } catch (e) {
    console.log(`Could not fetch analyst data for ${symbol}:`, e);
  }
  return null;
};
