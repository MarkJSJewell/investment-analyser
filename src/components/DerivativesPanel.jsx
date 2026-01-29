import React, { useState, useEffect } from 'react';
import { fetchSparkData, fetchOptions } from '../services/api';
import { formatCurrency, formatPercent } from '../utils/formatters';

// Major Futures Tickers
const FUTURE_CATEGORIES = {
  'Indices': ['ES=F', 'NQ=F', 'YM=F', 'RTY=F'],  // S&P, Nasdaq, Dow, Russell
  'Energy': ['CL=F', 'NG=F', 'RB=F'],            // Oil, Nat Gas, Gasoline
  'Metals': ['GC=F', 'SI=F', 'HG=F', 'PL=F'],    // Gold, Silver, Copper
  'Currencies': ['6E=F', '6J=F', '6B=F', 'DX-Y.NYB'], // Euro, Yen, Pound, DXY
  'Crypto': ['BTC=F', 'ETH=F']                   // Bitcoin/Ether Futures
};

const DerivativesPanel = ({ theme }) => {
  const [view, setView] = useState('futures'); // 'futures' or 'options'
  
  // Futures State
  const [futuresData, setFuturesData] = useState({});
  const [loadingFutures, setLoadingFutures] = useState(false);

  // Options State
  const [optSymbol, setOptSymbol] = useState('SPY');
  const [chain, setChain] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // --- FUTURES LOGIC ---
  useEffect(() => {
    if (view === 'futures') loadFutures();
  }, [view]);

  const loadFutures = async () => {
    setLoadingFutures(true);
    const allTickers = Object.values(FUTURE_CATEGORIES).flat();
    const data = await fetchSparkData(allTickers, '1d'); // Fetch 1 day of data for sparklines
    if (data) {
      const map = {};
      data.forEach(item => map[item.symbol] = item);
      setFuturesData(map);
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
        // 2. Set Default Date if none selected
        if (!date && data.expirations && data.expirations.length > 0) {
            // Recurse: Fetch data for the nearest expiration immediately
            const firstExp = data.expirations[0];
            setSelectedDate(firstExp);
            await searchOptions(firstExp); // Recursive call for data
            return; 
        }
        setChain(data);
      }
    } catch (e) { console.error(e); }
    setLoadingOptions(false);
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh' }}>
      
      {/* Sub-Navigation */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
        <button 
          onClick={() => setView('futures')}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600',
            color: view === 'futures' ? theme.primary : theme.textMuted,
            borderBottom: view === 'futures' ? `2px solid ${theme.primary}` : 'none'
          }}
        >
          🌏 Futures Market
        </button>
        <button 
          onClick={() => setView('options')}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600',
            color: view === 'options' ? theme.primary : theme.textMuted,
            borderBottom: view === 'options' ? `2px solid ${theme.primary}` : 'none'
          }}
        >
          ⛓️ Options Chain
        </button>
      </div>

      {/* --- VIEW 1: FUTURES DASHBOARD --- */}
      {view === 'futures' && (
        <div style={{ display: 'grid', gap: '30px' }}>
          {loadingFutures && <div style={{ color: theme.textMuted }}>Loading Global Markets...</div>}
          
          {Object.entries(FUTURE_CATEGORIES).map(([category, tickers]) => (
            <div key={category}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: theme.textMuted, letterSpacing: '1px' }}>{category}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                {tickers.map(ticker => {
                  const item = futuresData[ticker];
                  if (!item) return null;
                  
                  // Calculate daily change from history
                  const startPrice = item.history[0]?.price || item.currentPrice;
                  const change = item.currentPrice - startPrice;
                  const changePct = (change / startPrice) * 100;
                  const isUp = change >= 0;

                  return (
                    <div key={ticker} style={{ background: theme.cardBg, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{item.name.replace(' Futures', '').replace('Jun 25', '')}</span>
                        <span style={{ fontSize: '12px', color: theme.textMuted }}>{ticker}</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.text }}>
                        {formatCurrency(item.currentPrice)}
                      </div>
                      <div style={{ fontSize: '14px', color: isUp ? '#2E7D32' : '#C62828', fontWeight: '500' }}>
                        {isUp ? '▲' : '▼'} {formatCurrency(Math.abs(change))} ({formatPercent(changePct)})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- VIEW 2: OPTIONS CHAIN --- */}
      {view === 'options' && (
        <div>
          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
             <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Underlying Symbol</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            value={optSymbol} 
                            onChange={e => setOptSymbol(e.target.value.toUpperCase())} 
                            onKeyDown={e => e.key === 'Enter' && searchOptions()}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} 
                        />
                        <button onClick={() => searchOptions()} disabled={loadingOptions} style={{ padding: '8px 16px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                           {loadingOptions ? '...' : 'Load'}
                        </button>
                    </div>
                </div>

                {chain && (
                    <div style={{ flex: 1, minWidth: '200px' }}>
                         <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Expiration Date</label>
                         <select 
                            value={selectedDate || ''} 
                            onChange={(e) => {
                                const newDate = e.target.value;
                                setSelectedDate(newDate);
                                searchOptions(newDate);
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }}
                         >
                            {chain.expirations.map(ts => (
                                <option key={ts} value={ts}>
                                    {new Date(ts * 1000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </option>
                            ))}
                         </select>
                    </div>
                )}
             </div>
             
             {chain && (
                 <div style={{ marginTop: '15px' }}>
                     <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(chain.price)}</span>
                     <span style={{ marginLeft: '10px', color: theme.textMuted }}>Current Price</span>
                 </div>
             )}
          </div>

          {chain && (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* CALLS */}
                <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px', background: 'rgba(46, 125, 50, 0.1)', borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center' }}>CALLS</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Strike</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Bid</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Ask</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Vol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chain.calls.map(opt => {
                                    const isITM = opt.strike < chain.price;
                                    return (
                                        <tr key={opt.contractSymbol} style={{ background: isITM ? 'rgba(46, 125, 50, 0.05)' : 'transparent', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{opt.strike}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.bid}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.ask}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.volume}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PUTS */}
                <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px', background: 'rgba(198, 40, 40, 0.1)', borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: '#C62828', textAlign: 'center' }}>PUTS</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Strike</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Bid</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Ask</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Vol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chain.puts.map(opt => {
                                    const isITM = opt.strike > chain.price;
                                    return (
                                        <tr key={opt.contractSymbol} style={{ background: isITM ? 'rgba(198, 40, 40, 0.05)' : 'transparent', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{opt.strike}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.bid}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.ask}</td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{opt.volume}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
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
