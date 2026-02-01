import React, { useState, useEffect } from 'react';
import { fetchSparkData, fetchScreener } from '../services/api';
import { formatPercent, formatCurrency } from '../utils/formatters';
import NewsPanel from './NewsPanel';

// The "Safety List" of major stocks to always scan in Watchlist mode
const CORE_WATCHLIST = [
  'AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'INTC', 'NFLX', 
  'SPY', 'QQQ', 'IWM', 'DIA', 'PLTR', 'COIN', 'MSTR', 'HOOD', 'SOFI', 'DKNG',
  'LCID', 'RIVN', 'NIO', 'GME', 'AMC', 'ROKU', 'U', 'RBLX', 'PATH', 'AI'
];

// Yahoo's Pre-defined Screener IDs
const MARKET_SCREENS = [
  { id: 'day_gainers', label: '🚀 Top Gainers', desc: 'Highest % change today' },
  { id: 'day_losers', label: '🔻 Top Losers', desc: 'Lowest % change today' },
  { id: 'most_actives', label: '🔥 Most Active', desc: 'Highest trading volume' },
  { id: 'undervalued_growth_stocks', label: '💎 Undervalued Growth', desc: 'Low PE with high growth' },
  { id: 'tech_stocks', label: '💻 Technology', desc: 'Tech sector leaders' },
  { id: 'growth_technology_stocks', label: '📈 High Growth Tech', desc: 'Fastest growing tech' },
  { id: 'aggressive_small_caps', label: '⚡ Small Caps', desc: 'High volatility small caps' },
  { id: 'undervalued_large_caps', label: 'bm Blue Chips', desc: 'Stable, undervalued giants' }
];

const MarketScanner = ({ theme, userStocks }) => {
  const [scanType, setScanType] = useState('market'); // 'list' or 'market'
  const [activeScreen, setActiveScreen] = useState('day_gainers'); // Default screen
  const [days, setDays] = useState(5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Auto-run when switching screens
  useEffect(() => {
    if (scanType === 'market') runScan();
  }, [activeScreen, scanType]);

  const runScan = async () => {
    setLoading(true);
    setResults([]);
    setSelectedStock(null);

    try {
      if (scanType === 'market') {
        // --- 1. MARKET SCAN (Using Yahoo Presets) ---
        // This scans the ENTIRE market (10,000+ stocks) using Yahoo's engine
        const data = await fetchScreener(activeScreen, 50);
        if (data) {
          setResults(data.map(item => ({
            symbol: item.symbol,
            name: item.name,
            currentPrice: item.price,
            growth: item.changePercent * 100, // Screener returns decimal (0.05 = 5%)
            volume: item.volume
          })));
          if(data.length > 0) setSelectedStock(data[0].symbol);
        }

      } else {
        // --- 2. WATCHLIST SCAN (Custom Sparkline) ---
        // Scans ONLY your specific list but calculates exact X-day growth
        const userSymbols = userStocks.map(s => s.symbol).filter(s => s);
        const uniqueSymbols = [...new Set([...CORE_WATCHLIST, ...userSymbols])];
        
        const data = await fetchSparkData(uniqueSymbols, days <= 5 ? '5d' : '1mo');
        
        if (data) {
          const processed = data.map(item => {
            const history = item.history;
            if (!history || history.length < 2) return null;
            
            const current = history[history.length - 1].price;
            const startIdx = Math.max(0, history.length - 1 - days);
            const start = history[startIdx].price;
            const growth = ((current - start) / start) * 100;

            return {
              symbol: item.symbol,
              name: item.name,
              currentPrice: current,
              growth
            };
          }).filter(item => item !== null)
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 50);

          setResults(processed);
          if(processed.length > 0) setSelectedStock(processed[0].symbol);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      
      {/* LEFT: Controls & Results */}
      <div>
        <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
          
          {/* Header & Mode Switch */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>📡 Market Scanner</h3>
            <div style={{ display: 'flex', gap: '10px', background: theme.bg, padding: '4px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
               <button onClick={() => setScanType('market')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: scanType === 'market' ? theme.cardBg : 'transparent', color: theme.text, cursor: 'pointer', fontWeight: '600', boxShadow: scanType === 'market' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>🌍 Whole Market</button>
               <button onClick={() => setScanType('list')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: scanType === 'list' ? theme.cardBg : 'transparent', color: theme.text, cursor: 'pointer', fontWeight: '600', boxShadow: scanType === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>📋 My Watchlist</button>
            </div>
          </div>

          {/* Mode Specific Controls */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {scanType === 'market' ? (
              // MARKET MODE: Preset Buttons
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                {MARKET_SCREENS.map(screen => (
                  <button
                    key={screen.id}
                    onClick={() => setActiveScreen(screen.id)}
                    title={screen.desc}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '20px',
                      border: `1px solid ${activeScreen === screen.id ? theme.primary : theme.border}`,
                      background: activeScreen === screen.id ? '#E8F0FE' : 'transparent',
                      color: activeScreen === screen.id ? theme.primary : theme.textMuted,
                      cursor: 'pointer',
                      fontWeight: activeScreen === screen.id ? '600' : 'normal'
                    }}
                  >
                    {screen.label}
                  </button>
                ))}
              </div>
            ) : (
              // WATCHLIST MODE: Day Input
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '14px', color: theme.textMuted }}>Find best performers over last</span>
                <input 
                  type="number" 
                  min="1" 
                  max="30" 
                  value={days} 
                  onChange={e => setDays(Number(e.target.value))} 
                  style={{ width: '60px', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text, textAlign: 'center' }} 
                />
                <span style={{ fontSize: '14px', color: theme.textMuted }}>days</span>
                <button onClick={runScan} disabled={loading} style={{ marginLeft: 'auto', padding: '10px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {loading ? 'Scanning...' : 'Run Scan'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((item, index) => (
              <div 
                key={item.symbol} 
                onClick={() => setSelectedStock(item.symbol)}
                style={{ 
                  background: theme.cardBg, padding: '15px', borderRadius: '8px', 
                  border: `1px solid ${selectedStock === item.symbol ? theme.primary : theme.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  boxShadow: selectedStock === item.symbol ? '0 0 0 2px rgba(26, 115, 232, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ 
                    background: item.growth >= 0 ? '#E8F5E9' : '#FFEBEE', 
                    color: item.growth >= 0 ? '#166534' : '#C62828', 
                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' 
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.symbol}</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '16px', fontWeight: 'bold', color: item.growth >= 0 ? '#166534' : '#C62828' }}>
                     {item.growth > 0 ? '+' : ''}{formatPercent(item.growth)}
                   </div>
                   <div style={{ fontSize: '12px', color: theme.textMuted }}>
                     {formatCurrency(item.currentPrice)}
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>{scanType === 'market' ? 'Loading market data...' : 'No results found.'}</div>
        )}
      </div>

      {/* RIGHT: News */}
      <div>
        {selectedStock ? (
          <div style={{ position: 'sticky', top: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: theme.textMuted }}>News for {selectedStock}</h4>
            <NewsPanel symbols={[selectedStock]} stocks={[]} theme={theme} />
          </div>
        ) : (
          <div style={{ padding: '20px', border: `1px dashed ${theme.border}`, borderRadius: '8px', textAlign: 'center', color: theme.textMuted }}>
            Select a stock to see news
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketScanner;
