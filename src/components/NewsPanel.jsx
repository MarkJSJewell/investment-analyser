import React, { useState, useEffect } from 'react';
import { getSymbolName, getSymbolColor } from '../utils/formatters';

const NewsPanel = ({ symbols, stocks, theme = {} }) => {
  const [news, setNews] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Default theme values
  const cardBg = theme.cardBg || 'white';
  const text = theme.text || '#333';
  const textMuted = theme.textMuted || '#666';
  const border = theme.border || '#e0e0e0';
  const hoverBg = theme.hoverBg || '#f8f9fa';

  const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  const fetchNews = async (symbol) => {
    // Clean symbol for news search
    const searchSymbol = symbol.replace('.L', '').replace('.DE', '').replace('.PA', '')
      .replace('^', '').replace('=F', '').replace('-USD', '');
    
    const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchSymbol)}&newsCount=5&quotesCount=0`;
    
    for (const proxyFn of CORS_PROXIES) {
      try {
        const response = await fetch(proxyFn(yahooUrl));
        if (!response.ok) continue;
        
        const text = await response.text();
        if (!text.trim().startsWith('{')) continue;
        
        const data = JSON.parse(text);
        if (data.news && data.news.length > 0) {
          return data.news.slice(0, 3).map(item => ({
            title: item.title,
            publisher: item.publisher,
            link: item.link,
            publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000) : null,
            thumbnail: item.thumbnail?.resolutions?.[0]?.url
          }));
        }
      } catch (e) {
        continue;
      }
    }
    return [];
  };

  useEffect(() => {
    const loadNews = async () => {
      if (symbols.length === 0) return;
      
      setLoading(true);
      const results = {};
      
      // Fetch news for all symbols (up to 8)
      const symbolsToFetch = symbols.slice(0, 8);
      
      for (const symbol of symbolsToFetch) {
        const newsItems = await fetchNews(symbol);
        if (newsItems.length > 0) {
          results[symbol] = newsItems;
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      setNews(results);
      // Auto-expand first 3 symbols with news
      const withNews = Object.keys(results).slice(0, 3);
      const autoExpand = {};
      withNews.forEach(s => autoExpand[s] = true);
      setExpanded(autoExpand);
      setLoading(false);
    };
    
    loadNews();
  }, [symbols]);

  const toggleExpanded = (symbol) => {
    setExpanded(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (Object.keys(news).length === 0 && !loading) {
    return (
      <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${border}`, padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: text }}>
          📰 Latest News
        </h3>
        <div style={{ color: textMuted, fontSize: '12px', textAlign: 'center', padding: '20px' }}>
          {loading ? 'Loading news...' : 'No news available'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${border}`, padding: '16px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: text }}>
        📰 Latest News
        {loading && <span style={{ fontSize: '11px', color: textMuted, fontWeight: '400' }}>(loading...)</span>}
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(news).map(([symbol, items]) => (
          <div key={symbol}>
            <button
              onClick={() => toggleExpanded(symbol)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: hoverBg,
                border: `1px solid ${border}`,
                borderRadius: expanded[symbol] ? '6px 6px 0 0' : '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                color: text
              }}
            >
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: getSymbolColor(symbol, stocks),
                flexShrink: 0
              }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{getSymbolName(symbol)}</span>
              <span style={{ color: textMuted, fontSize: '10px' }}>{items.length} articles</span>
              <span style={{ color: textMuted }}>{expanded[symbol] ? '▼' : '▶'}</span>
            </button>
            
            {expanded[symbol] && (
              <div style={{ 
                border: `1px solid ${border}`, 
                borderTop: 'none', 
                borderRadius: '0 0 6px 6px',
                background: hoverBg
              }}>
                {items.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      padding: '10px 12px',
                      textDecoration: 'none',
                      borderBottom: idx < items.length - 1 ? `1px solid ${border}` : 'none',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ 
                      fontSize: '12px', 
                      color: text, 
                      lineHeight: '1.4',
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.title}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '10px', 
                      color: textMuted 
                    }}>
                      <span>{item.publisher}</span>
                      <span>{formatTimeAgo(item.publishedAt)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPanel;
