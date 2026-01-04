import React, { useState, useEffect } from 'react';

const PredictionsCard = ({ symbols, stocks }) => {
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  const fetchPredictions = async (symbol) => {
    const modules = 'financialData,earningsTrend,recommendationTrend,upgradeDowngradeHistory';
    const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
    
    for (const proxyFn of CORS_PROXIES) {
      try {
        const response = await fetch(proxyFn(yahooUrl));
        if (!response.ok) continue;
        const text = await response.text();
        if (!text.trim().startsWith('{')) continue;
        const data = JSON.parse(text);
        const result = data.quoteSummary?.result?.[0];
        if (result) {
          const financial = result.financialData;
          const earningsTrend = result.earningsTrend?.trend || [];
          const recommendations = result.recommendationTrend?.trend || [];
          const upgrades = result.upgradeDowngradeHistory?.history || [];
          const currentQtr = earningsTrend.find(t => t.period === '0q');
          const nextQtr = earningsTrend.find(t => t.period === '+1q');
          const currentYear = earningsTrend.find(t => t.period === '0y');
          const nextYear = earningsTrend.find(t => t.period === '+1y');
          const recentUpgrades = upgrades.slice(0, 5).map(u => ({
            firm: u.firm, toGrade: u.toGrade, fromGrade: u.fromGrade, action: u.action,
            date: new Date(u.epochGradeDate * 1000).toLocaleDateString()
          }));
          const currentRec = recommendations[0] || {};
          return {
            currentPrice: financial?.currentPrice?.raw,
            targetLow: financial?.targetLowPrice?.raw,
            targetMean: financial?.targetMeanPrice?.raw,
            targetMedian: financial?.targetMedianPrice?.raw,
            targetHigh: financial?.targetHighPrice?.raw,
            numberOfAnalysts: financial?.numberOfAnalystOpinions?.raw,
            recommendationKey: financial?.recommendationKey,
            currentQtrEstimate: currentQtr?.earningsEstimate?.avg?.raw,
            nextQtrEstimate: nextQtr?.earningsEstimate?.avg?.raw,
            currentYearEstimate: currentYear?.earningsEstimate?.avg?.raw,
            nextYearEstimate: nextYear?.earningsEstimate?.avg?.raw,
            strongBuy: currentRec.strongBuy || 0, buy: currentRec.buy || 0,
            hold: currentRec.hold || 0, sell: currentRec.sell || 0, strongSell: currentRec.strongSell || 0,
            recentUpgrades
          };
        }
      } catch (e) { continue; }
    }
    return null;
  };

  useEffect(() => {
    const loadPredictions = async () => {
      if (symbols.length === 0) return;
      setLoading(true);
      const results = {};
      const stockSymbols = symbols.filter(s => !s.startsWith('^') && !s.includes('=F') && !s.includes('.SS'));
      for (const symbol of stockSymbols) {
        const data = await fetchPredictions(symbol);
        if (data) results[symbol] = data;
      }
      setPredictions(results);
      setLoading(false);
    };
    loadPredictions();
  }, [symbols]);

  const toggleExpanded = (symbol) => setExpanded(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  const getGradeColor = (g) => { const gl = g?.toLowerCase() || ''; if (gl.includes('buy') || gl.includes('outperform')) return '#34A853'; if (gl.includes('sell') || gl.includes('underperform')) return '#EA4335'; return '#FF9800'; };

  if (Object.keys(predictions).length === 0 && !loading) return null;

  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>📊 Analyst Predictions & Forecasts</h2>
      {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading predictions...</div>}
      {!loading && Object.entries(predictions).map(([symbol, data]) => (
        <div key={symbol} style={{ marginBottom: '16px' }}>
          <button onClick={() => toggleExpanded(symbol)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: expanded[symbol] ? '8px 8px 0 0' : '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>{symbol}</span>
              {data.currentPrice && data.targetMean && <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: '#E8F5E9', color: '#2E7D32' }}>Target: ${data.targetMean.toFixed(2)} ({((data.targetMean - data.currentPrice) / data.currentPrice * 100).toFixed(1)}%)</span>}
              {data.recommendationKey && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: data.recommendationKey.includes('buy') ? '#E8F5E9' : '#FFF3E0', color: data.recommendationKey.includes('buy') ? '#2E7D32' : '#E65100', textTransform: 'uppercase', fontWeight: '600' }}>{data.recommendationKey}</span>}
            </div>
            <span style={{ color: '#666' }}>{expanded[symbol] ? '▼' : '▶'}</span>
          </button>
          {expanded[symbol] && (
            <div style={{ padding: '16px', background: '#fafafa', borderRadius: '0 0 8px 8px', border: '1px solid #e0e0e0', borderTop: 'none' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>🎯 Price Targets {data.numberOfAnalysts && `(${data.numberOfAnalysts} analysts)`}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>${data.targetLow?.toFixed(2)}</span>
                  <div style={{ flex: 1, height: '8px', background: 'linear-gradient(to right, #EA4335, #FBBC04, #34A853)', borderRadius: '4px', position: 'relative' }}>
                    {data.currentPrice && data.targetLow && data.targetHigh && <div style={{ position: 'absolute', left: `${Math.min(100, Math.max(0, ((data.currentPrice - data.targetLow) / (data.targetHigh - data.targetLow)) * 100))}%`, top: '-4px', width: '16px', height: '16px', background: '#1A73E8', borderRadius: '50%', transform: 'translateX(-50%)', border: '2px solid white' }} />}
                  </div>
                  <span style={{ fontSize: '12px', color: '#666' }}>${data.targetHigh?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Current: <strong>${data.currentPrice?.toFixed(2)}</strong></span>
                  <span>Mean: <strong style={{ color: '#34A853' }}>${data.targetMean?.toFixed(2)}</strong></span>
                </div>
              </div>
              {(data.currentQtrEstimate || data.nextYearEstimate) && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>💰 Earnings Estimates (EPS)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {data.currentQtrEstimate && <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}><div style={{ fontSize: '10px', color: '#666' }}>Current Qtr</div><div style={{ fontSize: '16px', fontWeight: '600' }}>${data.currentQtrEstimate.toFixed(2)}</div></div>}
                    {data.nextQtrEstimate && <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}><div style={{ fontSize: '10px', color: '#666' }}>Next Qtr</div><div style={{ fontSize: '16px', fontWeight: '600' }}>${data.nextQtrEstimate.toFixed(2)}</div></div>}
                    {data.currentYearEstimate && <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}><div style={{ fontSize: '10px', color: '#666' }}>This Year</div><div style={{ fontSize: '16px', fontWeight: '600' }}>${data.currentYearEstimate.toFixed(2)}</div></div>}
                    {data.nextYearEstimate && <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e0e0e0' }}><div style={{ fontSize: '10px', color: '#666' }}>Next Year</div><div style={{ fontSize: '16px', fontWeight: '600' }}>${data.nextYearEstimate.toFixed(2)}</div></div>}
                  </div>
                </div>
              )}
              {(data.strongBuy + data.buy + data.hold + data.sell + data.strongSell) > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>👥 Analyst Ratings</h4>
                  <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    {data.strongBuy > 0 && <div style={{ flex: data.strongBuy, background: '#0d7d0d' }} />}
                    {data.buy > 0 && <div style={{ flex: data.buy, background: '#34A853' }} />}
                    {data.hold > 0 && <div style={{ flex: data.hold, background: '#FBBC04' }} />}
                    {data.sell > 0 && <div style={{ flex: data.sell, background: '#EA4335' }} />}
                    {data.strongSell > 0 && <div style={{ flex: data.strongSell, background: '#9d0d0d' }} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#0d7d0d' }}>Strong Buy: {data.strongBuy}</span>
                    <span style={{ color: '#34A853' }}>Buy: {data.buy}</span>
                    <span style={{ color: '#FBBC04' }}>Hold: {data.hold}</span>
                    <span style={{ color: '#EA4335' }}>Sell: {data.sell}</span>
                  </div>
                </div>
              )}
              {data.recentUpgrades?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>📋 Recent Actions</h4>
                  {data.recentUpgrades.map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #e0e0e0', marginBottom: '6px', fontSize: '12px' }}>
                      <span style={{ fontWeight: '500' }}>{u.firm}</span>
                      <div><span style={{ color: getGradeColor(u.fromGrade) }}>{u.fromGrade}</span> → <span style={{ color: getGradeColor(u.toGrade), fontWeight: '500' }}>{u.toGrade}</span> <span style={{ color: '#999' }}>{u.date}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PredictionsCard;
