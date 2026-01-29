import React, { useState, useEffect } from 'react';
import { fetchHistoricalData, fetchOptions, fetchQuote } from '../services/api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Popular Futures for "Quick Select"
const QUICK_FUTURES = [
  { symbol: 'ES=F', name: 'S&P 500' },
  { symbol: 'NQ=F', name: 'Nasdaq' },
  { symbol: 'YM=F', name: 'Dow Jones' },
  { symbol: 'CL=F', name: 'Crude Oil' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'SI=F', name: 'Silver' },
  { symbol: 'BTC=F', name: 'Bitcoin' },
  { symbol: 'ETH=F', name: 'Ether' },
  { symbol: 'ZS=F', name: 'Soybean' },
  { symbol: 'ZC=F', name: 'Corn' }
];

const DerivativesPanel = ({ theme }) => {
  const [view, setView] = useState('futures');
  
  // --- FUTURES STATE ---
  const [futureSymbol, setFutureSymbol] = useState('ES=F');
  const [futureName, setFutureName] = useState('S&P 500 Futures');
  const [timeRange, setTimeRange] = useState('1mo'); // 1d, 5d, 1mo, 6mo, ytd, 1y
  const [chartData, setChartData] = useState([]);
  const [loadingFutures, setLoadingFutures] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);

  // --- OPTIONS STATE ---
  const [optSymbol, setOptSymbol] = useState('MSFT');
  const [chain, setChain] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load Futures Data when Symbol or Range changes
  useEffect(() => {
    if (view === 'futures') loadFuturesChart();
  }, [view, futureSymbol, timeRange]);

  // --- FUTURES LOGIC ---
  const loadFuturesChart = async () => {
    setLoadingFutures(true);
    
    // Calculate Date Range
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '1d': start.setDate(end.getDate() - 2); break; // Fetch slightly more for context
      case '5d': start.setDate(end.getDate() - 5); break;
      case '1mo': start.setMonth(end.getMonth() - 1); break;
      case '6mo': start.setMonth(end.getMonth() - 6); break;
      case 'ytd': start.setMonth(0, 1); break;
      case '1y': start.setFullYear(end.getFullYear() - 1); break;
      default: start.setMonth(end.getMonth() - 1);
    }

    try {
      // 1. Get Quote Name
      const quote = await fetchQuote(futureSymbol);
      if (quote.valid) setFutureName(quote.name);

      // 2. Get Chart Data
      const data = await fetchHistoricalData(futureSymbol, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
      
      if (data && data.length > 0) {
        setChartData(data);
        const latest = data[data.length - 1];
        const first = data[0];
        setCurrentPrice(latest.price);
        setPriceChange({
          diff: latest.price - first.price,
          percent: ((latest.price - first.price) / first.price) * 100
        });
      }
    } catch (e) {
      console.error("Futures load failed", e);
    }
    setLoadingFutures(false);
  };

  // --- OPTIONS LOGIC ---
  const searchOptions = async (date = null) => {
    if (!optSymbol) return;
    setLoadingOptions(true);
    setChain(null);
    
    try {
      // 1. Fetch Data
      const data = await fetchOptions(optSymbol, date);
      
      if (data) {
        // 2. Auto-Select Nearest Expiration (FIXED: Added Delay to prevent 429)
        if (!date && data.expirations && data.expirations.length > 0) {
            const firstExp = data.expirations[0];
            setSelectedDate(firstExp);
            
            // Wait 1.5 seconds before second call to avoid Rate Limit
            await new Promise(r => setTimeout(r, 1500));
            
            await searchOptions(firstExp); 
            return; 
        }
        setChain(data);
      }
    } catch (e) { console.error(e); }
    setLoadingOptions(false);
  };

  // --- RENDER HELPERS ---
  const RangeBtn = ({ r, label }) => (
    <button 
      onClick={() => setTimeRange(r)}
      style={{
        padding: '4px 12px',
        fontSize: '12px',
        borderRadius: '4px',
        border: `1px solid ${timeRange === r ? theme.primary : theme.border}`,
        background: timeRange === r ? theme.primary : 'transparent',
        color: timeRange === r ? 'white' : theme.text,
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh' }}>
      
      {/* Tab Selection */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
        <button onClick={() => setView('futures')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', color: view === 'futures' ? theme.primary : theme.textMuted, borderBottom: view === 'futures' ? `2px solid ${theme.primary}` : 'none' }}>🌏 Futures</button>
        <button onClick={() => setView('options')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', color: view === 'options' ? theme.primary : theme.textMuted, borderBottom: view === 'options' ? `2px solid ${theme.primary}` : 'none' }}>⛓️ Options</button>
      </div>

      {/* --- FUTURES VIEW --- */}
      {view === 'futures' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
          
          {/* Main Chart Area */}
          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
            
            {/* Header: Input & Price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      value={futureSymbol} 
                      onChange={e => setFutureSymbol(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && loadFuturesChart()}
                      style={{ fontSize: '24px', fontWeight: 'bold', width: '120px', background: 'transparent', border: 'none', borderBottom: `1px solid ${theme.border}`, color: theme.text }}
                    />
                    <button onClick={loadFuturesChart} style={{ padding: '4px 12px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go</button>
                 </div>
                 <div style={{ color: theme.textMuted, marginTop: '4px' }}>{futureName}</div>
              </div>
              
              {currentPrice && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.text }}>{formatCurrency(currentPrice)}</div>
                  <div style={{ 
                    color: priceChange?.diff >= 0 ? '#2E7D32' : '#C62828', 
                    fontSize: '14px', fontWeight: '500' 
                  }}>
                    {priceChange?.diff >= 0 ? '+' : ''}{formatCurrency(priceChange?.diff)} ({formatPercent(priceChange?.percent)})
                  </div>
                </div>
              )}
            </div>

            {/* Range Selectors */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
               <RangeBtn r="1d" label="1D" />
               <RangeBtn r="5d" label="5D" />
               <RangeBtn r="1mo" label="1M" />
               <RangeBtn r="6mo" label="6M" />
               <RangeBtn r="ytd" label="YTD" />
               <RangeBtn r="1y" label="1Y" />
            </div>

            {/* Chart */}
            <div style={{ height: '400px', width: '100%' }}>
              {loadingFutures ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted }}>Loading Chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={d => {
                         const date = new Date(d);
                         return timeRange === '1d' ? date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : date.toLocaleDateString(undefined, {month:'short', day:'numeric'});
                      }} 
                      stroke={theme.textMuted} 
                      fontSize={12} 
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke={theme.textMuted} 
                      fontSize={12} 
                      tickFormatter={val => val.toLocaleString()}
                    />
                    <Tooltip 
                      contentStyle={{ background: theme.cardBg, borderColor: theme.border }} 
                      formatter={(val) => [formatCurrency(val), 'Price']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={theme.primary} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sidebar: Quick Select */}
          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, fontSize: '14px', color: theme.textMuted }}>Quick Futures</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {QUICK_FUTURES.map(item => (
                <button
                  key={item.symbol}
                  onClick={() => setFutureSymbol(item.symbol)}
                  style={{
                    textAlign: 'left',
                    padding: '10px',
                    borderRadius: '6px',
                    border: futureSymbol === item.symbol ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    background: futureSymbol === item.symbol ? '#E8F0FE' : 'transparent',
                    cursor: 'pointer',
                    color: theme.text,
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{item.name}</span>
                  <span style={{ color: theme.textMuted }}>{item.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- OPTIONS VIEW (Keep existing logic with fixed Search) --- */}
      {view === 'options' && (
        <div>
          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
             <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Symbol</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input value={optSymbol} onChange={e => setOptSymbol(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && searchOptions()} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
                        <button onClick={() => searchOptions()} disabled={loadingOptions} style={{ padding: '8px 16px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{loadingOptions ? '...' : 'Load'}</button>
                    </div>
                </div>
                {chain && (
                    <div style={{ flex: 1, minWidth: '200px' }}>
                         <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Expiration</label>
                         <select value={selectedDate || ''} onChange={(e) => { setSelectedDate(e.target.value); searchOptions(e.target.value); }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }}>
                            {chain.expirations.map(ts => ( <option key={ts} value={ts}>{new Date(ts * 1000).toLocaleDateString()}</option> ))}
                         </select>
                    </div>
                )}
             </div>
             {chain && <div style={{ marginTop: '15px', fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(chain.price)} <span style={{fontSize:'12px', color:theme.textMuted, fontWeight:'normal'}}>Underlying Price</span></div>}
          </div>
          {chain && (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px', background: '#E8F5E9', borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center' }}>CALLS</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead><tr style={{ color: theme.textMuted }}><th style={{ padding: '6px' }}>Strike</th><th style={{ padding: '6px' }}>Bid</th><th style={{ padding: '6px' }}>Ask</th><th style={{ padding: '6px' }}>Vol</th></tr></thead>
                          <tbody>{chain.calls.map(o => ( <tr key={o.contractSymbol} style={{ borderBottom: '1px solid #eee', background: o.strike < chain.price ? '#f9f9f9' : 'transparent' }}><td style={{ padding: '6px', fontWeight: 'bold' }}>{o.strike}</td><td style={{ padding: '6px' }}>{o.bid}</td><td style={{ padding: '6px' }}>{o.ask}</td><td style={{ padding: '6px' }}>{o.volume}</td></tr> ))}</tbody>
                      </table>
                    </div>
                </div>
                <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px', background: '#FFEBEE', borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: '#C62828', textAlign: 'center' }}>PUTS</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead><tr style={{ color: theme.textMuted }}><th style={{ padding: '6px' }}>Strike</th><th style={{ padding: '6px' }}>Bid</th><th style={{ padding: '6px' }}>Ask</th><th style={{ padding: '6px' }}>Vol</th></tr></thead>
                          <tbody>{chain.puts.map(o => ( <tr key={o.contractSymbol} style={{ borderBottom: '1px solid #eee', background: o.strike > chain.price ? '#f9f9f9' : 'transparent' }}><td style={{ padding: '6px', fontWeight: 'bold' }}>{o.strike}</td><td style={{ padding: '6px' }}>{o.bid}</td><td style={{ padding: '6px' }}>{o.ask}</td><td style={{ padding: '6px' }}>{o.volume}</td></tr> ))}</tbody>
                      </table>
                    </div>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
export default DerivativesPanel;
