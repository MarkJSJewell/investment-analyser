import React, { useState, useEffect } from 'react';
import { fetchDividendInfo } from '../services/api';
import { BOND_LISTS } from '../utils/marketDefaults';
import { formatCurrency, formatPercent } from '../utils/formatters';

const BondPanel = ({ theme }) => {
  const [activeMarket, setActiveMarket] = useState('Government Yields');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    loadMarketData(BOND_LISTS[activeMarket]);
  }, [activeMarket]);

  const loadMarketData = async (symbols) => {
    setLoading(true);
    setData([]);
    const results = [];
    
    for (const symbol of symbols) {
      try {
        setProgress(`Loading ${symbol}...`);
        const info = await fetchDividendInfo(symbol); // Uses the new robust fetcher
        if (info) {
          results.push(info);
          setData([...results].sort((a, b) => b.yield - a.yield));
        }
      } catch (e) { console.warn(e); }
    }
    setLoading(false);
    setProgress('');
  };

  return (
    <div style={{ padding: '20px', background: theme.bg, minHeight: '80vh' }}>
      <div style={{ marginBottom: '20px', background: theme.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
        <h3 style={{ marginTop: 0 }}>Fixed Income</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          {Object.keys(BOND_LISTS).map(market => (
            <button key={market} onClick={() => !loading && setActiveMarket(market)} disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: activeMarket === market ? '#1A73E8' : theme.hoverBg,
                color: activeMarket === market ? 'white' : theme.text,
                opacity: loading && activeMarket !== market ? 0.5 : 1
              }}>
              {market}
            </button>
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
