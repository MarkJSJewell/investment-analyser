// PROXY CONFIGURATION
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Backup Public Proxies
const PUBLIC_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` // Kept as secondary backup
];

// Helper: Pause execution
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch with Timeout
const fetchWithTimeout = async (url, options = {}) => {
  const { timeout = 8000 } = options; 
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Helper: Smart fetcher
const fetchYahoo = async (yahooUrl, retryCount = 0) => {
  try {
    const res = await fetchWithTimeout(VERCEL_PROXY(yahooUrl));
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
    }
    if (res.status === 429) console.warn(`Rate limit (429) on Vercel Proxy.`);
  } catch (e) { console.warn(`Vercel Proxy failed: ${e.message}`); }

  for (const proxyFn of PUBLIC_PROXIES) {
    try {
      await wait(1000 + Math.random() * 1000);
      const res = await fetchWithTimeout(proxyFn(yahooUrl));
      if (res.ok) {
        const text = await res.text();
        let jsonText = text;
        try { 
           if (text.includes('"contents"')) {
             const wrapper = JSON.parse(text); 
             if (wrapper.contents) jsonText = wrapper.contents; 
           }
        } catch(e) {}
        if (jsonText.trim().startsWith('{')) return JSON.parse(jsonText);
      }
    } catch (e) { continue; }
  }
  return null;
};

// --- EXPORTED FUNCTIONS ---

export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) || /^[A-Z]{1,5}$/.test(symbol);
};

export const searchSymbol = async (query) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  const data = await fetchYahoo(url);
  if (data?.quotes?.[0]) return { symbol: data.quotes[0].symbol, name: data.quotes[0].shortname || data.quotes[0].longname };
  return null;
};

export const fetchQuote = async (symbol) => {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const data = await fetchYahoo(url);
    if (data?.quoteResponse?.result?.[0]) {
      return { valid: true, name: data.quoteResponse.result[0].shortName, symbol };
    }
  } catch (e) {}
  // Soft fail to unblock UI
  return { valid: true, name: symbol, symbol };
};

export const fetchHistoricalData = async (symbol, start, end) => {
  const startTs = Math.floor(new Date(start).getTime() / 1000);
  const endTs = Math.floor(new Date(end).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTs}&period2=${endTs}&interval=1d&events=div`;
  const data = await fetchYahoo(url);
  
  if (!data?.chart?.result?.[0]) return [];
  
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

// --- NEW: BATCH FETCHING (The "Silver Bullet") ---
// Fetches data for MANY symbols in ONE request.
export const fetchSparkData = async (symbols, range = '1mo') => {
  // Join symbols with commas (e.g. "AAPL,MSFT,GOOG")
  const symbolStr = symbols.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbolStr)}&range=${range}&interval=1d`;
  
  try {
    const data = await fetchYahoo(url);
    if (!data?.spark?.result) return null;
    
    return data.spark.result.map(item => {
      const response = item.response[0];
      const meta = response.meta;
      const quotes = response.indicators?.quote?.[0]?.close || [];
      const timestamps = response.timestamp || [];
      
      const history = timestamps.map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        price: quotes[i]
      })).filter(d => d.price != null);

      return {
        symbol: item.symbol,
        name: meta.shortName || meta.longName || item.symbol,
        currentPrice: meta.regularMarketPrice,
        history
      };
    });
  } catch (e) {
    console.warn('Spark fetch failed:', e);
    return null;
  }
};

// --- NEW: MARKET SCREENER (Whole Market) ---
export const fetchScreener = async (scrId = 'day_gainers', count = 25) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}`;
  try {
    const data = await fetchYahoo(url);
    if (!data?.finance?.result?.[0]?.quotes) return null;
    return data.finance.result[0].quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortName || q.longName,
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      marketCap: q.marketCap
    }));
  } catch (e) {
    console.warn('Screener fetch failed:', e);
    return null;
  }
};

export const fetchDividendInfo = async (symbol) => {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 31536000; 
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d&events=div`;
  const data = await fetchYahoo(url);
  if (data?.chart?.result?.[0]) {
    const meta = data.chart.result[0].meta;
    const events = data.chart.result[0].events;
    const price = meta.regularMarketPrice;
    let yieldVal = 0;
    if (events?.dividends) {
      const totalDivs = Object.values(events.dividends).reduce((acc, d) => acc + d.amount, 0);
      yieldVal = price ? (totalDivs / price) : 0;
    }
    return { symbol: meta.symbol, name: meta.shortName, price: price, yield: yieldVal, yieldDisplay: yieldVal * 100 };
  }
  return null;
};

export const fetchAnalystData = async (symbol) => {
  // Use simple Quote API first (lighter)
  const basic = await fetchDividendInfo(symbol);
  if (basic) return { ...basic, currentPrice: basic.price, dividendYield: basic.yield };
  return null;
};

export const fetchOptions = async (symbol, date = null) => {
  let url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  if (date) url += `?date=${date}`;
  try {
    const data = await fetchYahoo(url);
    if (!data?.optionChain?.result?.[0]) return null;
    return {
      symbol: data.optionChain.result[0].underlyingSymbol,
      price: data.optionChain.result[0].quote.regularMarketPrice,
      expirations: data.optionChain.result[0].expirationDates,
      calls: data.optionChain.result[0].options[0].calls || [],
      puts: data.optionChain.result[0].options[0].puts || []
    };
  } catch (e) { return null; }
};
