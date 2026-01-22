import React, { useState } from 'react';
import { fetchSparkData } from '../services/api';
import { formatPercent, formatCurrency } from '../utils/formatters';
import NewsPanel from './NewsPanel';

// Hardcoded candidates to scan (Mix of Tech, Finance, Crypto-related, Autos)
const SCAN_CANDIDATES = [
  'AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'INTC',
  'JPM', 'BAC', 'GS', 'V', 'MA', 
  'DIS', 'NKE', 'KO', 'PEP', 'WMT', 'COST',
  'PLTR', 'COIN', 'MSTR', 'RIOT', 'MARA', 
  'PFE', 'LLY', 'JNJ', 'UNH', 
  'F', 'GM', 'TM'
];

// Helper to split array into chunks
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
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null); 

  const runScan = async () => {
    setLoading(true);
    setResults([]);
    setSelectedStock(null);

    // 1. Prepare unique symbol list
    const userSymbols = userStocks.map(s => s.symbol).filter(s => s);
    const uniqueSymbols = [...new Set([...SCAN_CANDIDATES, ...userSymbols])];

    // 2. Determine Range
    const range = days <= 5 ? '5d' : (days <= 25 ? '1mo' : '3mo');

    try {
      // 3. Batch Request in Chunks of 10 (Fixes 429/400 errors)
      const chunks = chunkArray(uniqueSymbols, 10);
      let allBatchData = [];

      for (const chunk of chunks) {
        // Fetch each chunk sequentially to be polite
        const chunkData = await fetchSparkData(chunk, range);
        if (chunkData) {
          allBatchData = [...allBatchData, ...chunkData];
        }
      }
      
      if (allBatchData.length === 0) throw new Error('Failed to fetch market data');

      // 4. Process & Filter
      const processed = allBatchData.map(item => {
        const history = item.history;
        if (!history || history.length < 2) return null;

        const current = history[history.length - 1];
        
        // Find the price "N days ago"
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

      // 5. Sort & Limit
      const topMovers = processed.sort((a, b) => b.growth - a.growth).slice(0, limit);
      
      setResults(topMovers);
      if (topMovers.length > 0) setSelectedStock(topMovers[0].symbol);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* LEFT COLUMN: Controls & Results */}
      <div>
        {/* Controls */}
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>🚀 Top Movers Scanner</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'end' }}>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Timeframe (Days)</label>
              <input type="number" min="1" max="30" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Min Growth (%)</label>
              <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Limit Results</label>
              <input type="number" min="1" max="30" value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            </div>

            <button onClick={runScan} disabled={loading} style={{ padding: '10px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Scanning...' : 'Scan Market'}
            </button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: theme.textMuted }}>
            Scanning {SCAN_CANDIDATES.length + userStocks.length} major stocks & your watchlist.
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
                     {formatCurrency(item.startPrice)} ➜ {formatCurrency(item.currentPrice)}
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>No stocks found matching your criteria. Try lowering the threshold.</div>
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
