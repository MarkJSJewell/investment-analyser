import React, { useState, useEffect } from 'react';
import { fetchSparkData, fetchScreener } from '../services/api';
import { formatPercent, formatCurrency } from '../utils/formatters';
import NewsPanel from './NewsPanel';

// --- STATIC CORE LIST (Always Scan These) ---
// Includes Major ETFs, Big Tech, and Sector Leaders to ensure stability
const CORE_WATCHLIST = [
  // MAJOR ETFs (The Market)
  'SPY', 'QQQ', 'DIA', 'IWM', 'TLT', 'AGG', 'GLD', 'SLV', 'USO', // Indices/Bonds/Commodities
  'TQQQ', 'SQQQ', 'SOXL', 'SOXS', 'UVXY', 'ARKK', // Leveraged/Volatility
  'XLE', 'XLF', 'XLK', 'XLV', 'XLY', 'XLP', // Sectors
  'SMH', 'TAN', 'JETS', 'PEJ', // Industry Specific

  // MAGNIFICENT 7 & MEGA CAP
  'AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'BRK-B', 'LLY', 'AVGO',

  // POPULAR / VOLATILE (Retail Favorites)
  'AMD', 'INTC', 'PLTR', 'COIN', 'MSTR', 'HOOD', 'SOFI', 'DKNG', 'LCID', 'RIVN', 'NIO',
  'GME', 'AMC', 'ROKU', 'U', 'RBLX', 'PATH', 'AI', 'CVNA', 'UPST', 'AFRM', 'MARA', 'RIOT'
];

// Helper to split array into chunks (avoids API limits)
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const MarketScanner = ({ theme, userStocks }) => {
  const [days, setDays] = useState(7);
  const [threshold, setThreshold] = useState(5); // % Growth
  const [limit, setLimit] = useState(20);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [selectedStock, setSelectedStock] = useState(null); 

  const runScan = async () => {
    setLoading(true);
    setResults([]);
    setSelectedStock(null);
    setProgress('Fetching active market movers...');

    try {
      // 1. DYNAMIC FETCH: Get the top 100 "Most Active" stocks right now
      // This catches whatever is hot TODAY (e.g. LCID, earnings winners, news breakouts)
      let dynamicSymbols = [];
      try {
        const activeStocks = await fetchScreener('most_actives', 100);
        if (activeStocks) {
          dynamicSymbols = activeStocks.map(s => s.symbol);
        }
      } catch (e) {
        console.warn('Could not fetch active stocks, falling back to static list.');
      }

      // 2. COMBINE: User Watchlist + Core Static List + Dynamic Active List
      const userSymbols = userStocks.map(s => s.symbol).filter(s => s);
      const uniqueSymbols = [...new Set([
        ...userSymbols,
        ...CORE_WATCHLIST,
        ...dynamicSymbols
      ])];

      console.log(`Scanning ${uniqueSymbols.length} total symbols...`);
      setProgress(`Scanning ${uniqueSymbols.length} assets (Static + Active)...`);

      // 3. DETERMINE RANGE for Spark API
      // If user wants 5 days, we fetch '1mo' to be safe and slice locally.
      // 1mo covers up to ~30 days, 3mo covers up to ~90 days.
      const range = days <= 5 ? '1mo' : (days <= 25 ? '3mo' : '6mo');

      // 4. BATCH REQUESTS (Chunks of 20 to prevent 429 errors)
      const chunks = chunkArray(uniqueSymbols, 20);
      let allBatchData = [];

      for (let i = 0; i < chunks.length; i++) {
        // Update progress bar
        setProgress(`Analyzing batch ${i + 1} of ${chunks.length}...`);
        
        // Fetch chunk
        const chunkData = await fetchSparkData(chunks[i], range);
        if (chunkData) {
          allBatchData = [...allBatchData, ...chunkData];
        }
        
        // Tiny delay between chunks to be polite to the API
        await new Promise(r => setTimeout(r, 200));
      }

      if (allBatchData.length === 0) throw new Error('Failed to fetch market data');

      // 5. PROCESS & FILTER
      const processed = allBatchData.map(item => {
        const history = item.history;
        if (!history || history.length < 2) return null;

        const current = history[history.length - 1];
        
        // Find price N days ago
        // We look backwards from the end
        // e.g. if we have 30 days of data and want 5 day growth:
        // index = length - 1 - 5
        const lookbackIndex = Math.max(0, history.length - 1 - days);
        const start = history[lookbackIndex];
        
        if (!start || !current) return null;

        const growth = ((current.price - start.price) / start.price) * 100;

        return {
          symbol: item.symbol,
          name: item.name,
          startPrice: start.price,
          currentPrice: current.price,
          startDate: start.date,
          growth
        };
      }).filter(item => item && item.growth >= threshold);

      // 6. SORT & LIMIT
      const topMovers = processed.sort((a, b) => b.growth - a.growth).slice(0, limit);
      
      setResults(topMovers);
      if (topMovers.length > 0) setSelectedStock(topMovers[0].symbol);
      setProgress('');

    } catch (e) {
      console.error(e);
      setProgress('Scan failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* LEFT COLUMN: Controls & Results */}
      <div>
        {/* Controls */}
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>🚀 Dynamic Market Scanner</h3>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Timeframe (Days)</label>
              <input type="number" min="1" max="60" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Min Growth (%)</label>
              <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Limit Results</label>
              <input type="number" min="1" max="50" value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <button onClick={runScan} disabled={loading} style={{ padding: '10px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '12px', color: theme.textMuted }}>
            {progress || 'Scans Top 100 Active Stocks + 60 Major ETFs & Blue Chips + Your Watchlist'}
          </div>
        </div>

        {/* Results Table */}
        {results.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((item, index) => (
              <div 
                key={item.symbol} 
                onClick={() => setSelectedStock(item.symbol)}
                style={{ 
                  background: theme.cardBg, padding: '15px', borderRadius: '8px', border: `1px solid ${selectedStock === item.symbol ? theme.primary : theme.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  boxShadow: selectedStock === item.symbol ? '0 0 0 2px rgba(26, 115, 232, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ background: '#E8F5E9', color: '#166534', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.symbol}</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>{item.name}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>+{formatPercent(item.growth)}</div>
                   <div style={{ fontSize: '12px', color: theme.textMuted }}>
                     {formatCurrency(item.startPrice)} ➜ {formatCurrency(item.currentPrice)} ({days}d)
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>No stocks found matching your criteria. Try lowering the threshold or increasing the days.</div>
        )}
      </div>

      {/* RIGHT COLUMN: News */}
      <div>
        {selectedStock ? (
          <div style={{ position: 'sticky', top: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: theme.textMuted }}>News for {selectedStock}</h4>
            <NewsPanel symbols={[selectedStock]} stocks={[]} theme={theme} />
          </div>
        ) : (
          <div style={{ padding: '20px', border: `1px dashed ${theme.border}`, borderRadius: '8px', textAlign: 'center', color: theme.textMuted }}>
            Click a stock to see news
          </div>
        )}
      </div>

    </div>
  );
};

export default MarketScanner;
