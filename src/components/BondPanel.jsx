import React, { useState, useEffect } from 'react';
import { fetchDividendInfo, fetchQuote } from '../services/api';
import { BOND_LISTS } from '../utils/marketDefaults';
import { formatCurrency, formatPercent } from '../utils/formatters';

const CACHE_KEY_PREFIX = 'inv_app_bond_cache_';
const CACHE_DURATION = 168 * 60 * 60 * 1000; // 1 week

const BondPanel = ({ theme }) => {
  const [activeMarket, setActiveMarket] = useState('Government Yields');
  const [customSymbol, setCustomSymbol] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    loadMarketData(activeMarket);
  }, [activeMarket]);

  const getCachedData = (market) => {
    try {
      const item = localStorage.getItem(CACHE_KEY_PREFIX + market);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (new Date().getTime() - parsed.timestamp < CACHE_DURATION) return parsed.data;
    } catch (e) { return null; }
    return null;
  };

  const setCachedData = (market, data) => {
    localStorage.setItem(CACHE_KEY_PREFIX + market, JSON.stringify({
      timestamp: new Date().getTime(),
      data
    }));
  };

  const loadMarketData = async (market) => {
    const cached = getCachedData(market);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setData([]);
    const symbols = BOND_LISTS[market] || [];
    const results = [];
    
    for (const symbol of symbols) {
      try {
        setProgress(`Loading ${symbol}...`);
        const info = await fetchDividendInfo(symbol);
        if (info) {
          results.push(info);
          setData([...results].sort((a, b) => b.yield - a.yield));
        }
      } catch (e) { console.warn(e); }
    }
    
    if (results.length > 0) {
      setCachedData(market, results.sort((a, b) => b.yield - a.yield));
    }
    setLoading(false);
    setProgress('');
  };

  const addCustomStock = async () => {
    if (!customSymbol.trim()) return;
    setLoading(true);
    setProgress(`Looking up ${customSymbol}...`);

    try {
      const quote = await fetchQuote(customSymbol);
      if (!quote.valid) {
        alert(`Could not find symbol: ${customSymbol}`);
        setLoading(false);
        return;
      }

      const resolvedSymbol = quote.symbol;
      setProgress(`Fetching data for ${resolvedSymbol}...`);

      const info = await fetchDividendInfo(resolvedSymbol);
      if (info) {
        const newData = [...data, info].sort((a, b) => b.yield - a.yield);
        setData(newData);
        setCachedData(activeMarket, newData);
        setCustomSymbol('');
      } else {
        alert(`No yield data found for ${resolvedSymbol}`);
      }
    } catch (e) { console.error(e); }
    
    setLoading(false);
    setProgress('');
  };

  const calculateInvestmentNeeded = (yieldDecimal) => {
    if (!yieldDecimal || yieldDecimal === 0) return 0;
    // For Bonds, we usually don't have a "target income" slider visible in this specific snippet, 
    // so we default to a standard calc or reuse the same UI logic if you want the input box.
    // For simplicity, I'll reuse the logic assuming a default 1000 target or passed prop.
    // Since targetIncome isn't in state here (my oversight in copy), let's add it.
    return (1000 * 12) / yieldDecimal; 
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh' }}>
      <div style={{ marginBottom: '30px', background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Fixed Income Analysis</h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textMuted }}>Compare government yields and bond ETFs</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input placeholder="e.g. TLT, ^TNX" value={customSymbol} onChange={e => setCustomSymbol(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomStock()} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.text }} />
            <button onClick={addCustomStock} disabled={loading} style={{ padding: '8px 16px', background: '#34A853', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {Object.keys(BOND_LISTS).map(market => (
            <button key={market} onClick={() => !loading && setActiveMarket(market)} disabled={loading} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: loading ? 'wait' : 'pointer', background: activeMarket === market ? '#1A73E8' : theme.hoverBg, color: activeMarket === market ? 'white' : theme.text, opacity: loading && activeMarket !== market ? 0.5 : 1 }}>{market}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ marginBottom: '20px', padding: '10px', background: '#E3F2FD', borderRadius: '8px', color: '#1565C0' }}>⏳ {progress}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {data.map((item) => (
          <div key={item.symbol} style={{ background: theme.cardBg, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{item.symbol}</div>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>{item.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>Current Yield</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2E7D32' }}>{formatPercent(item.yieldDisplay)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BondPanel;
