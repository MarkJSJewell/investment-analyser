// PROXY CONFIGURATION
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Backup Public Proxies (Rotated on failure)
// 1. AllOrigins (JSON Mode) - Most reliable, bypasses CORS
// 2. CodeTabs - Good fallback
const PUBLIC_PROXIES = [
  (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Helper: Pause execution
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Clean symbols (removes encoding mess like %3D)
const cleanSymbol = (s) => decodeURIComponent(s).replace('%3D', '=');

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

// Helper: Smart fetcher with robust fallback
const fetchYahoo = async (yahooUrl, retryCount = 0) => {
  // 1. Try Vercel Proxy (Primary)
  try {
    const res = await fetchWithTimeout(VERCEL_PROXY(yahooUrl));
    if (res.ok) {
      const text = await res.text();
      try {
        if (text.trim().startsWith('{')) return JSON.parse(text);
      } catch (e) { /* Invalid JSON, try backups */ }
    }
    if (res.status === 429) {
      console.warn(`Rate limit (429) on Vercel Proxy. Switching to fallbacks...`);
    }
  } catch (e) { 
    console.warn(`Vercel Proxy failed: ${e.message}`);
  }

  // 2. Try Public Proxies (Fallback Rotation)
  for (const proxyFn of PUBLIC_PROXIES) {
    try {
      await wait(1000 + Math.random() * 1500); // Random delay
      
      const res = await fetchWithTimeout(proxyFn(yahooUrl));
      if (res.ok) {
        const text = await res.text();
        let jsonText = text;
        
        // SPECIAL HANDLING: AllOrigins returns JSON with a "contents" field
        try {
           const wrapper = JSON.parse(text);
           if (wrapper.contents) {
             // If contents is a string (double encoded), parse it again
             if (typeof wrapper.contents === 'string' && wrapper.contents.trim().startsWith('{')) {
                jsonText = wrapper.contents;
             } else {
                return wrapper.contents; 
             }
           }
        } catch(e) { /* Not a wrapper, use raw text */ }

        if (typeof jsonText === 'string' && jsonText.trim().startsWith('{')) {
           return JSON.parse(jsonText);
        }
      }
    } catch (e) { 
      console.warn(`Fallback proxy failed: ${e.message}`);
      continue; 
    }
  }
  return null;
};

// --- EXPORTED FUNCTIONS ---

export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) || 
         /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

export const searchSymbol = async (query) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  const data = await fetchYahoo(url);
  if (data?.quotes?.[0]) return { symbol: data.quotes[0].symbol, name: data.quotes[0].shortname || data.quotes[0].longname };
  return null;
};

export const fetchQuote = async (symbol) => {
  let target = cleanSymbol(symbol);
  
  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(target)}`;
    const data = await fetchYahoo(quoteUrl);

    if (data?.quoteResponse?.result?.[0]) {
      const quote = data.quoteResponse.result[0];
      return { 
        valid: true, 
        name: quote.shortName || quote.longName, 
        symbol: quote.symbol 
      };
    }
  } catch (e) {}

  // Soft Fail: Assume valid to unblock UI
  return { valid: true, name: target, symbol: target };
};

export const fetchHistoricalData = async (symbol, start, end) => {
  const cleanSym = cleanSymbol(symbol);
  const startTs = Math.floor(new Date(start).getTime() / 1000);
  const endTs = Math.floor(new Date(end).getTime() / 1000);
  
  // Use V8 endpoint which is most robust
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?period1=${startTs}&period2=${endTs}&interval=1d&events=div`;
  
  await wait(500); 
  const data = await fetchYahoo(url);
  
  if (!data?.chart?.result?.[0]) {
    console.warn(`No chart data for ${cleanSym}`);
    return []; 
  }
  
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

// --- BATCH FETCHING ---
export const fetchSparkData = async (symbols, range = '1mo') => {
  const symbolStr = symbols.map(cleanSymbol).join(',');
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
  } catch (e) { return null; }
};

// --- MARKET SCREENER ---
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
  } catch (e) { return null; }
};

export const fetchDividendInfo = async (symbol) => {
  await wait(1500); 
  const end = Math.floor(Date.now() / 1000);
  const start = end - 31536000; 
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol(symbol))}?period1=${start}&period2=${end}&interval=1d&events=div`;
  
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
  const t = new Date().getTime();
  const cleanSym = cleanSymbol(symbol);
  const richUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(cleanSym)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
  const richData = await fetchYahoo(richUrl);

  if (richData?.quoteSummary?.result?.[0]) {
    const result = richData.quoteSummary.result[0];
    const summary = result.summaryDetail;
    const price = result.price;
    const keyStats = result.defaultKeyStatistics;
    
    return {
      targetMean: result.financialData?.targetMeanPrice?.raw,
      currentPrice: result.financialData?.currentPrice?.raw || price?.regularMarketPrice?.raw,
      recommendation: result.financialData?.recommendationKey,
      name: price?.shortName || price?.longName,
      currency: price?.currency,
      totalAssets: summary?.totalAssets?.raw || result.fundProfile?.totalAssets?.raw,
      fiftyTwoWeekChange: keyStats?.['52WeekChange']?.raw,
      ytdReturn: keyStats?.ytdReturn?.raw,
      dividendYield: summary?.dividendYield?.raw || summary?.yield?.raw,
      peRatio: summary?.trailingPE?.raw || summary?.forwardPE?.raw,
      earningsDate: result.calendarEvents?.earnings?.earningsDate?.[0]?.raw ? new Date(result.calendarEvents.earnings.earningsDate[0].raw * 1000).toISOString().split('T')[0] : null
    };
  }

  const basic = await fetchDividendInfo(symbol);
  if (basic) {
    return { ...basic, currentPrice: basic.price, dividendYield: basic.yield };
  }
  return null;
};

export const fetchOptions = async (symbol, date = null) => {
  let url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(cleanSymbol(symbol))}`;
  if (date) url += `?date=${date}`;

  try {
    const data = await fetchYahoo(url);
    if (!data?.optionChain?.result?.[0]) return null;
    
    const result = data.optionChain.result[0];
    const options = result.options[0];

    return {
      symbol: result.underlyingSymbol,
      price: result.quote.regularMarketPrice,
      expirations: result.expirationDates, // Array of timestamps
      calls: options.calls || [],
      puts: options.puts || []
    };
  } catch (e) { return null; }
};
