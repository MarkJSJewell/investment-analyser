import React, { useState, useEffect } from 'react';

const IndexConstituents = ({ selectedIndexes, startDate, endDate }) => {
  const [constituentsData, setConstituentsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const INDEX_CONSTITUENTS = {
    '^GSPC': { name: 'S&P 500', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ', 'JPM', 'V', 'PG', 'XOM', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'PEP'] },
    '^DJI': { name: 'Dow Jones', symbols: ['AAPL', 'MSFT', 'UNH', 'GS', 'HD', 'MCD', 'CAT', 'AMGN', 'V', 'BA', 'CRM', 'HON', 'TRV', 'AXP', 'JPM', 'IBM', 'JNJ', 'WMT', 'PG', 'CVX'] },
    '^IXIC': { name: 'NASDAQ', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'COST', 'PEP', 'CSCO', 'ADBE', 'NFLX', 'AMD', 'CMCSA', 'INTC', 'INTU', 'QCOM', 'TXN', 'AMGN'] },
    '^RUT': { name: 'Russell 2000', symbols: ['PLTR', 'SOFI', 'COIN', 'DKNG', 'RBLX', 'CRWD', 'SNOW', 'NET', 'DDOG', 'ZS', 'MDB', 'OKTA', 'ROKU', 'SQ', 'SHOP'] },
    '^FTSE': { name: 'FTSE 100', symbols: ['SHEL.L', 'AZN.L', 'HSBA.L', 'ULVR.L', 'BP.L', 'RIO.L', 'GSK.L', 'DGE.L', 'BATS.L', 'REL.L'] },
    '^GDAXI': { name: 'DAX', symbols: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'DTE.DE', 'AIR.DE', 'MBG.DE', 'BMW.DE', 'MUV2.DE', 'BAS.DE', 'BAYN.DE'] },
    '^FCHI': { name: 'CAC 40', symbols: ['MC.PA', 'OR.PA', 'TTE.PA', 'SAN.PA', 'AI.PA', 'AIR.PA', 'SU.PA', 'BN.PA', 'CS.PA', 'DG.PA'] },
    '^STOXX50E': { name: 'Euro Stoxx 50', symbols: ['ASML.AS', 'MC.PA', 'SAP.DE', 'TTE.PA', 'SIE.DE', 'OR.PA', 'SAN.PA', 'AIR.PA', 'ALV.DE', 'AI.PA'] },
    '^N225': { name: 'Nikkei 225', symbols: ['7203.T', '6758.T', '9984.T', '8306.T', '6861.T', '7267.T', '4502.T', '6501.T', '7974.T', '9432.T'] },
    '^HSI': { name: 'Hang Seng', symbols: ['0700.HK', '9988.HK', '0941.HK', '1299.HK', '0005.HK', '3690.HK', '2318.HK', '9618.HK', '1398.HK', '2388.HK'] },
    '000001.SS': { name: 'Shanghai', symbols: ['601398.SS', '601939.SS', '601288.SS', '600036.SS', '601318.SS', '600519.SS', '601857.SS', '600900.SS', '600028.SS', '601988.SS'] }
  };

  const fetchWithProxy = async (url) => {
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];
    
    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('{')) {
            return JSON.parse(text);
          }
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  };

  const fetchPerformanceData = async (symbol, start, end) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj.getFullYear() < 1970) {
      return null;
    }
    
    const startTimestamp = Math.floor(startDateObj.getTime() / 1000);
    const endTimestamp = Math.floor(endDateObj.getTime() / 1000);
    
    if (startTimestamp <= 0 || endTimestamp <= 0 || startTimestamp >= endTimestamp) {
      return null;
    }
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;
    
    const daysDiff = (endTimestamp - startTimestamp) / (60 * 60 * 24);
    const yearsFraction = Math.max(0.1, daysDiff / 365);
    const maxReasonableReturn = Math.pow(5, yearsFraction) * 100 - 100;
    
    try {
      const data = await fetchWithProxy(yahooUrl);
      
      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const quotes = result.indicators?.quote?.[0];
        const closes = quotes?.close;
        const name = result.meta?.shortName || result.meta?.symbol || symbol;
        
        if (closes && closes.length > 1) {
          let startPrice = null;
          for (let i = 0; i < Math.min(10, closes.length); i++) {
            if (closes[i] !== null && closes[i] > 0) {
              startPrice = closes[i];
              break;
            }
          }
          
          let endPrice = null;
          for (let i = closes.length - 1; i >= Math.max(0, closes.length - 10); i--) {
            if (closes[i] !== null && closes[i] > 0) {
              endPrice = closes[i];
              break;
            }
          }
          
          if (startPrice && endPrice && startPrice > 0.01) {
            const returnPct = ((endPrice - startPrice) / startPrice) * 100;
            
            if (returnPct > maxReasonableReturn || returnPct < -95) {
              return null;
            }
            
            return { symbol, name, returnPct, startPrice, endPrice };
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
    return null;
  };

  // Fetch in parallel batches
  const fetchBatch = async (symbols, start, end, batchSize = 5) => {
    const results = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => fetchPerformanceData(symbol, start, end));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  };

  useEffect(() => {
    const fetchAllConstituents = async () => {
      if (selectedIndexes.length === 0) {
        setConstituentsData({});
        return;
      }

      setLoading(true);
      const results = {};

      for (const indexSymbol of selectedIndexes) {
        const indexInfo = INDEX_CONSTITUENTS[indexSymbol];
        if (!indexInfo) continue;

        // Fetch only top 15 for speed
        const symbolsToFetch = indexInfo.symbols.slice(0, 15);
        const performances = await fetchBatch(symbolsToFetch, startDate, endDate, 5);
        
        performances.sort((a, b) => b.returnPct - a.returnPct);
        
        results[indexSymbol] = {
          name: indexInfo.name,
          top5: performances.slice(0, 5),
          bottom5: performances.slice(-5).sort((a, b) => a.returnPct - b.returnPct)
        };
      }

      setConstituentsData(results);
      const autoExpand = {};
      selectedIndexes.forEach(idx => autoExpand[idx] = true);
      setExpanded(autoExpand);
      setLoading(false);
    };

    fetchAllConstituents();
  }, [selectedIndexes, startDate, endDate]);

  const toggleExpanded = (indexSymbol) => {
    setExpanded(prev => ({ ...prev, [indexSymbol]: !prev[indexSymbol] }));
  };

  if (selectedIndexes.length === 0) return null;

  const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
        Index Constituents Performance
        <span style={{ fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '12px' }}>
          (Top 5 & Bottom 5 over selected period)
        </span>
      </h2>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <span className="spinner" style={{ borderColor: '#1A73E8', borderTopColor: 'transparent' }}></span>
          Loading constituent data...
        </div>
      )}

      {!loading && Object.keys(constituentsData).length === 0 && selectedIndexes.length > 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Click "Calculate Returns" to load constituent performance data
        </div>
      )}

      {!loading && Object.entries(constituentsData).map(([indexSymbol, data]) => (
        <div key={indexSymbol} style={{ marginBottom: '20px' }}>
          <button
            onClick={() => toggleExpanded(indexSymbol)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: expanded[indexSymbol] ? '8px 8px 0 0' : '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            <span>{data.name}</span>
            <span style={{ color: '#666' }}>{expanded[indexSymbol] ? '▼' : '▶'}</span>
          </button>

          {expanded[indexSymbol] && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', padding: '16px', background: '#fafafa', borderRadius: '0 0 8px 8px' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '500', color: '#2E7D32', marginBottom: '12px' }}>🚀 Top 5 Performers</h4>
                {data.top5.length === 0 && <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No data available</div>}
                {data.top5.map((stock, idx) => (
                  <div key={stock.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', borderRadius: '4px', marginBottom: '6px', border: '1px solid #e8f5e9' }}>
                    <div>
                      <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', background: '#E8F5E9', color: '#2E7D32', textAlign: 'center', lineHeight: '20px', fontSize: '11px', fontWeight: '600', marginRight: '8px' }}>{idx + 1}</span>
                      <span style={{ fontWeight: '500', fontSize: '13px' }}>{stock.symbol}</span>
                      <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>{stock.name?.substring(0, 20)}{stock.name?.length > 20 ? '...' : ''}</span>
                    </div>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', background: '#E8F5E9', color: '#2E7D32' }}>{formatPercent(stock.returnPct)}</span>
                  </div>
                ))}
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '500', color: '#C62828', marginBottom: '12px' }}>📉 Bottom 5 Performers</h4>
                {data.bottom5.length === 0 && <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>No data available</div>}
                {data.bottom5.map((stock, idx) => (
                  <div key={stock.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', borderRadius: '4px', marginBottom: '6px', border: '1px solid #ffebee' }}>
                    <div>
                      <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', background: '#FFEBEE', color: '#C62828', textAlign: 'center', lineHeight: '20px', fontSize: '11px', fontWeight: '600', marginRight: '8px' }}>{idx + 1}</span>
                      <span style={{ fontWeight: '500', fontSize: '13px' }}>{stock.symbol}</span>
                      <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>{stock.name?.substring(0, 20)}{stock.name?.length > 20 ? '...' : ''}</span>
                    </div>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', background: stock.returnPct >= 0 ? '#E8F5E9' : '#FFEBEE', color: stock.returnPct >= 0 ? '#2E7D32' : '#C62828' }}>{formatPercent(stock.returnPct)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default IndexConstituents;
