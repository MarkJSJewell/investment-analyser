// PROXY CONFIGURATION
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Backup Public Proxies
const PUBLIC_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

// Helper: Pause execution (Jitter)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Smart fetcher with robust fallback
const fetchYahoo = async (yahooUrl, retryCount = 0) => {
  // 1. Try Vercel Proxy
  try {
    const res = await fetch(VERCEL_PROXY(yahooUrl));
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
    }
    if (res.status === 429 && retryCount < 1) {
      await wait(2000);
      return fetchYahoo(yahooUrl, retryCount + 1);
    }
  } catch (e) { /* Ignore and try fallback */ }

  // 2. Try Public Proxies (Fallback)
  for (const proxyFn of PUBLIC_PROXIES) {
    try {
      await wait(1000); // Courtesy delay
      const res = await fetch(proxyFn(yahooUrl));
      if (res.ok) {
        const text = await res.text();
        let jsonText = text;
        // Handle allorigins wrapper
        if (text.includes('"contents"')) {
           try { const wrapper = JSON.parse(text); if (wrapper.contents) jsonText = wrapper.contents; } catch(e) {}
        }
        if (jsonText.trim().startsWith('{')) return JSON.parse(jsonText);
      }
    } catch (e) { continue; }
  }
  return null;
};

// ... [Keep validation logic unchanged] ...
export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) || /^[A-Z]{1,5}$/.test(symbol) || /^\^[A-Z0-9]+$/.test(symbol) || /^[A-Z]+=F$/.test(symbol) || /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

export const searchSymbol = async (query) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  const data = await fetchYahoo(url);
  if (data?.quotes?.[0]) return { symbol: data.quotes[0].symbol, name: data.quotes[0].shortname || data.quotes[0].longname };
  return null;
};

export const fetchQuote = async (symbol) => {
  let target = symbol;
  if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol)) {
    const s = await searchSymbol(symbol);
    if (s) target = s.symbol;
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(target)}?interval=1d&range=5d`;
  const data = await fetchYahoo(url);
  if (data?.chart?.result?.[0]?.meta) return { valid: true, name: data.chart.result[0].meta.shortName, symbol: target };
  return { valid: true, name: `${target} (unverified)`, symbol: target };
};

export const fetchHistoricalData = async (symbol, start, end) => {
  const startTs = Math.floor(new Date(start).getTime() / 1000);
  const endTs = Math.floor(new Date(end).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTs}&period2=${endTs}&interval=1d&events=div`;
  
  await wait(500); 
  const data = await fetchYahoo(url);
  if (!data?.chart?.result?.[0]) throw new Error('No data');
  
  const result = data.chart.result[0];
  const adjClose = result.indicators.adjclose?.[0]?.adjclose || result.indicators.quote[0].close;
  const dividends = {};
  if (result.events?.dividends) {
    Object.values(result.events.dividends).forEach(d => dividends[new Date(d.date * 1000).toISOString().split('T')[0]] = d.amount);
  }
  
  return result.timestamp.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    price: adjClose[i],
    dividend: dividends[new Date(ts * 1000).toISOString().split('T')[0]] || 0
  })).filter(d => d.price != null);
};

// --- NEW: FETCH DIVIDEND INFO (Uses Chart API to bypass blocks) ---
export const fetchDividendInfo = async (symbol) => {
  await wait(1500); // Rate limit protection
  
  // Fetch 1 year of data to calculate trailing yield
  const end = Math.floor(Date.now() / 1000);
  const start = end - 31536000; // 1 year ago
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=div`;
  
  const data = await fetchYahoo(url);
  
  if (data?.chart?.result?.[0]) {
    const meta = data.chart.result[0].meta;
    const events = data.chart.result[0].events;
    const price = meta.regularMarketPrice;
    
    // Calculate Yield
    let yieldVal = 0;
    
    // CASE A: Bond Yields (Indices like ^TNX)
    // For these, the "Price" is actually the yield (e.g. 4.20 = 4.2%)
    if (symbol.startsWith('^')) {
      yieldVal = price / 100; 
    } 
    // CASE B: Stocks/ETFs
    // Sum up dividends from the last year
    else if (events?.dividends) {
      const totalDivs = Object.values(events.dividends).reduce((acc, d) => acc + d.amount, 0);
      yieldVal = price ? (totalDivs / price) : 0;
    }

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || symbol,
      price: price,
      yield: yieldVal,
      yieldDisplay: yieldVal * 100
    };
  }
  return null;
};

// Keep old function for main dashboard (Growth tab)
export const fetchAnalystData = async (symbol) => {
  // Reuse the dividend fetcher for the basic data to ensure dashboard loads
  const basic = await fetchDividendInfo(symbol);
  if (basic) {
    return {
      ...basic,
      currentPrice: basic.price,
      dividendYield: basic.yield
    };
  }
  return null;
};
