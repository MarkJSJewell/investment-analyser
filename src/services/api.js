// PROXY CONFIGURATION
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

const PUBLIC_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`, 
];

// Helper: Pause execution for a random time (Jitter)
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

// Helper: Smart fetcher with fallback
const fetchYahoo = async (yahooUrl) => {
  try {
    const res = await fetch(VERCEL_PROXY(yahooUrl));
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
    }
    // If Vercel proxy returns 429, throw specifically so we can handle or log it
    if (res.status === 429) throw new Error('Rate Limited (429)');
    throw new Error(`Local proxy failed with ${res.status}`);
  } catch (localError) {
    // Fallback to public proxies
    for (const proxyFn of PUBLIC_PROXIES) {
      try {
        await delay(1000, 2000); // Wait before hitting public proxies too
        const res = await fetch(proxyFn(yahooUrl));
        if (!res.ok) continue;
        const text = await res.text();
        let jsonText = text;
        if (text.includes('"contents"')) {
           try {
             const wrapper = JSON.parse(text);
             if (wrapper.contents) jsonText = wrapper.contents;
           } catch(e) {}
        }
        if (jsonText.trim().startsWith('{')) return JSON.parse(jsonText);
      } catch (e) { continue; }
    }
  }
  throw new Error('All proxy attempts failed');
};

export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) ||
         /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

export const searchSymbol = async (query) => {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  try {
    const data = await fetchYahoo(url);
    if (data.quotes && data.quotes.length > 0) {
      const bestMatch = data.quotes[0];
      return {
        symbol: bestMatch.symbol,
        name: bestMatch.shortname || bestMatch.longname,
        type: bestMatch.quoteType
      };
    }
  } catch (e) {
    console.log('Search failed:', e);
  }
  return null;
};

export const fetchQuote = async (symbol) => {
  let targetSymbol = symbol;
  if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol)) {
    const searchResult = await searchSymbol(symbol);
    if (searchResult) targetSymbol = searchResult.symbol;
  }

  if (!validateSymbolFormat(targetSymbol)) {
    return { valid: false, error: 'Invalid format.' };
  }
  
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`;
  
  try {
    const data = await fetchYahoo(url);
    if (data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      return { 
        valid: true, 
        name: meta.shortName || meta.longName || meta.symbol || targetSymbol,
        symbol: targetSymbol 
      };
    } else if (data.chart?.error) {
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
  const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=div`;
  
  try {
    await delay(500, 1500); // Slight delay for charts
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

export const fetchAnalystData = async (symbol) => {
  // 1. CRITICAL: Wait 1-2 seconds before requesting. 
  // This prevents the "429 Too Many Requests" error when loading lists.
  await delay(1000, 2000);

  const t = new Date().getTime();
  const yahooUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
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
