// PROXY CONFIGURATION
const VERCEL_PROXY = (url) => `/api/proxy?url=${encodeURIComponent(url)}`;

// Helper: Pause execution (Jitter)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Smart fetcher
const fetchYahoo = async (yahooUrl, retryCount = 0) => {
  try {
    const res = await fetch(VERCEL_PROXY(yahooUrl));
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) return JSON.parse(text);
    }
    // Only retry on 429 (Rate Limit), NOT 401 (Blocked/Unauthorized)
    if (res.status === 429 && retryCount < 2) {
      await wait(2000 * (retryCount + 1));
      return fetchYahoo(yahooUrl, retryCount + 1);
    }
    return null; // Return null on 401/500 so we can trigger fallback
  } catch (error) {
    return null;
  }
};

// ... [Keep validateSymbolFormat, searchSymbol, fetchQuote unchanged] ...
export const validateSymbolFormat = (symbol) => {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol) ||
         /^[A-Z]{1,5}$/.test(symbol) || 
         /^\^[A-Z0-9]+$/.test(symbol) || 
         /^[A-Z]+=F$/.test(symbol) || 
         /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);
};

export const searchSymbol = async (query) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0`;
  try {
    const data = await fetchYahoo(url);
    if (data?.quotes?.[0]) {
      return { symbol: data.quotes[0].symbol, name: data.quotes[0].shortname || data.quotes[0].longname };
    }
  } catch (e) { console.log('Search failed:', e); }
  return null;
};

export const fetchQuote = async (symbol) => {
  let targetSymbol = symbol;
  if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(symbol)) {
    const searchResult = await searchSymbol(symbol);
    if (searchResult) targetSymbol = searchResult.symbol;
  }
  
  // Quick chart fetch to validate
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d&range=5d`;
  try {
    const data = await fetchYahoo(url);
    if (data?.chart?.result?.[0]?.meta) {
      return { valid: true, name: data.chart.result[0].meta.shortName, symbol: targetSymbol };
    }
  } catch (e) {}
  return { valid: true, name: `${targetSymbol} (unverified)`, symbol: targetSymbol };
};

// ... [Keep fetchHistoricalData unchanged] ...
export const fetchHistoricalData = async (symbol, start, end) => {
  const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(end).getTime() / 1000);
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=div`;
  
  try {
    await wait(500); 
    const data = await fetchYahoo(yahooUrl);
    if (!data?.chart?.result?.[0]) throw new Error('No data');
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;
    
    const dividends = {};
    if (result.events?.dividends) {
      Object.values(result.events.dividends).forEach(div => {
        dividends[new Date(div.date * 1000).toISOString().split('T')[0]] = div.amount;
      });
    }
    
    if (!timestamps || !adjClose) throw new Error('Missing price data');
    
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: adjClose[i] || quotes.close[i],
      dividend: dividends[new Date(ts * 1000).toISOString().split('T')[0]] || 0
    })).filter(d => d.price !== null);
  } catch (err) { throw new Error(err.message || `Could not fetch ${symbol}`); }
};

// --- NEW HYBRID ANALYST FETCHER ---
export const fetchAnalystData = async (symbol) => {
  await wait(1000); // Courtesy delay

  // STRATEGY 1: Try Rich Data (Often Blocked)
  const t = new Date().getTime();
  const richUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=recommendationTrend,financialData,summaryDetail,price,calendarEvents,defaultKeyStatistics,fundProfile&t=${t}`;
  
  const richData = await fetchYahoo(richUrl);

  if (richData?.quoteSummary?.result?.[0]) {
    // ... [Logic to parse rich data if successful - same as before] ...
    const result = richData.quoteSummary.result[0];
    const financial = result.financialData;
    const summary = result.summaryDetail;
    const price = result.price;
    const keyStats = result.defaultKeyStatistics;
    
    return {
      targetMean: financial?.targetMeanPrice?.raw,
      currentPrice: financial?.currentPrice?.raw || price?.regularMarketPrice?.raw,
      recommendation: financial?.recommendationKey,
      name: price?.shortName || price?.longName,
      currency: price?.currency,
      totalAssets: summary?.totalAssets?.raw || result.fundProfile?.totalAssets?.raw,
      fiftyTwoWeekChange: keyStats?.['52WeekChange']?.raw,
      ytdReturn: keyStats?.ytdReturn?.raw,
      dividendYield: summary?.dividendYield?.raw || summary?.yield?.raw,
      earningsDate: result.calendarEvents?.earnings?.earningsDate?.[0]?.raw ? new Date(result.calendarEvents.earnings.earningsDate[0].raw * 1000).toISOString().split('T')[0] : null
    };
  }

  // STRATEGY 2: Fallback to Chart Data (Open)
  // If Strategy 1 failed (401/429), we calculate yield manually from history
  console.log(`Fallback for ${symbol}: Calculating data from Chart API`);
  
  // Fetch last 365 days to sum dividends
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const startTs = Math.floor(oneYearAgo.getTime() / 1000);
  const endTs = Math.floor(now.getTime() / 1000);
  
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTs}&period2=${endTs}&interval=1d&events=div`;
  const chartData = await fetchYahoo(chartUrl);
  
  if (chartData?.chart?.result?.[0]) {
    const meta = chartData.chart.result[0].meta;
    const events = chartData.chart.result[0].events;
    
    // 1. Get Current Price
    const price = meta.regularMarketPrice;
    
    // 2. Calculate Dividend Yield manually (Sum of last year's divs / Price)
    let totalDividends = 0;
    if (events?.dividends) {
      Object.values(events.dividends).forEach(d => totalDividends += d.amount);
    }
    const calculatedYield = (price && price > 0) ? (totalDividends / price) : 0;

    // 3. Handle Bonds (Yield is usually the price itself for ^TNX)
    let finalYield = calculatedYield;
    if (symbol.startsWith('^')) {
      finalYield = price / 100; // e.g. Price 4.2 -> 4.2% -> 0.042
    }

    return {
      name: meta.shortName || symbol,
      currentPrice: price,
      dividendYield: finalYield,
      currency: meta.currency,
      exchange: meta.exchangeName,
      // Missing fields set to null to prevent UI errors
      recommendation: null,
      targetMean: null, 
      totalAssets: null 
    };
  }

  return null;
};
