import React, { useState, createContext, useContext, useEffect } from 'react';
import StockInput from './components/StockInput';
import ComparisonSelector from './components/ComparisonSelector';
import PortfolioChart from './components/PortfolioChart';
import SummaryTable from './components/SummaryTable';
import IndexConstituents from './components/IndexConstituents';
import PredictionsCard from './components/PredictionsCard';
import NewsPanel from './components/NewsPanel';
import DividendPanel from './components/DividendPanel';
import BondPanel from './components/BondPanel';
import { fetchQuote, fetchHistoricalData, fetchAnalystData } from './services/api';
import { calculateDCA, buildChartData } from './utils/calculations';

export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// Cache Key for Main Dashboard
const STORAGE_KEY = 'inv_app_growth_state';

function App() {
  const [activeTab, setActiveTab] = useState('growth');
  
  // 1. Initialize state with Lazy Initializers (Check localStorage first)
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).stocks : [{ symbol: '', status: 'idle', name: '' }];
  });
  
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).startDate : oneYearAgo;
  });
  
  const [investmentAmount, setInvestmentAmount] = useState(500);
  const [investmentMode, setInvestmentMode] = useState('monthly');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  
  // Additional State
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [investmentDay, setInvestmentDay] = useState(1);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [selectedCommodities, setSelectedCommodities] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState([]);
  const [selectedBonds, setSelectedBonds] = useState([]);
  
  // Results State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analystData, setAnalystData] = useState({});
  const [loadingAnalyst, setLoadingAnalyst] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const theme = {
    bg: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : 'white',
    text: darkMode ? '#e8e8e8' : '#333',
    textMuted: darkMode ? '#a0a0a0' : '#666',
    border: darkMode ? '#2a2a4a' : '#e0e0e0',
    inputBg: darkMode ? '#1a1a2e' : 'white',
    headerBg: darkMode ? '#0f0f1a' : 'white',
    hoverBg: darkMode ? '#2a2a4a' : '#f8f9fa',
    primary: '#1A73E8',
    activeTab: darkMode ? '#2a2a4a' : '#E8F0FE'
  };

  // 2. Save state on change
  useEffect(() => {
    const stateToSave = { stocks, startDate, investmentAmount, investmentMode, reinvestDividends };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [stocks, startDate, investmentAmount, investmentMode, reinvestDividends]);

  const addStock = () => stocks.length < 10 && setStocks([...stocks, { symbol: '', status: 'idle', name: '' }]);
  const removeStock = (index) => stocks.length > 1 && setStocks(stocks.filter((_, i) => i !== index));
  const updateStock = (index, value) => { const n = [...stocks]; n[index] = { symbol: value.toUpperCase(), status: 'idle', name: '' }; setStocks(n); };
  
  const toggleIndex = (s) => setSelectedIndexes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleCommodity = (s) => setSelectedCommodities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleCrypto = (s) => setSelectedCrypto(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleBond = (s) => setSelectedBonds(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const validateStock = async (index) => {
    const stock = stocks[index];
    if (!stock.symbol.trim()) return;
    const n = [...stocks]; n[index] = { ...stock, status: 'validating' }; setStocks(n);
    try {
      const r = await fetchQuote(stock.symbol);
      const u = [...stocks]; 
      if (r.valid) {
        u[index] = { symbol: r.symbol || stock.symbol, status: 'valid', name: r.name };
      } else {
        u[index] = { ...stock, status: 'invalid', name: r.error || 'Invalid' };
      }
      setStocks(u);
    } catch { const u = [...stocks]; u[index] = { ...stock, status: 'invalid', name: 'Could not validate' }; setStocks(u); }
  };

  const runAnalysis = async () => {
    setLoading(true); setError(null); setResults(null); setAnalystData({});
    try {
      const validStocks = stocks.filter(s => s.symbol.trim());
      const allSymbols = [...validStocks.map(s => s.symbol), ...selectedIndexes, ...selectedCrypto, ...selectedBonds, ...selectedCommodities];
      if (allSymbols.length === 0) throw new Error('Please enter at least one stock symbol');
      
      const analysisResults = {};
      for (const symbol of allSymbols) {
        try {
          const priceData = await fetchHistoricalData(symbol, startDate, endDate);
          if (priceData.length === 0) throw new Error(`No data for ${symbol}`);
          analysisResults[symbol] = calculateDCA(priceData, investmentAmount, investmentDay, investmentMode, startDate, reinvestDividends);
        } catch (err) { analysisResults[symbol] = { error: err.message }; }
      }
      const chartData = buildChartData(analysisResults, allSymbols, investmentMode, investmentAmount);
      setResults({ analysis: analysisResults, chartData, allSymbols });
      
      setLoadingAnalyst(true);
      const analystResults = {};
      for (const symbol of allSymbols) { 
        try { const d = await fetchAnalystData(symbol); if (d) analystResults[symbol] = d; } catch (e) { console.log(e); }
      }
      setAnalystData(analystResults); 
      setLoadingAnalyst(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const TabButton = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 24px',
        background: activeTab === id ? theme.activeTab : 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? `3px solid ${theme.primary}` : '3px solid transparent',
        color: activeTab === id ? theme.primary : theme.textMuted,
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  const inputStyle = { padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px', outline: 'none', width: '100%', background: theme.inputBg, color: theme.text };

  return (
    <ThemeContext.Provider value={{ darkMode, theme }}>
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
        <header style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, padding: '0 24px' }}>
          <div style={{ maxWidth: '1900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{ fontSize: '24px' }}>📈</span> Investment Calculator
            </h1>
            
            {/* 3. Navigation Tabs */}
            <div style={{ display: 'flex', height: '100%' }}>
              <TabButton id="growth" icon="🚀" label="Growth & Returns" />
              <TabButton id="dividends" icon="💰" label="Dividend Income" />
              <TabButton id="bonds" icon="🏛️" label="Fixed Income" />
            </div>
            
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? '#333' : '#f0f0f0', border: 'none', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', color: theme.text }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '1900px', margin: '0 auto', padding: '0', boxSizing: 'border-box' }}>
          
          {activeTab === 'growth' && (
             <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: results ? (sidebarCollapsed ? '50px 1fr 320px' : '400px 1fr 320px') : '1fr', gap: '20px', alignItems: 'start' }}>
                <div style={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.border}`, position: results ? 'sticky' : 'static', top: '20px', display: 'flex', flexDirection: 'column', maxHeight: results ? 'calc(100vh - 40px)' : 'none', overflow: 'hidden' }}>
                  {results && (
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ width: '100%', padding: '8px', background: theme.hoverBg, border: 'none', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', fontSize: '12px', color: theme.textMuted }}>{sidebarCollapsed ? '▶' : '◀ Collapse'}</button>
                  )}
                  {!sidebarCollapsed && (
                    <div style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                      <StockInput stocks={stocks} onUpdate={updateStock} onRemove={removeStock} onAdd={addStock} onValidate={validateStock} theme={theme} />
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>Date Range</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min="1990-01-01" max={endDate} style={inputStyle} />
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <div className="toggle-container" style={{ fontSize: '12px' }}>
                          <button className={`toggle-btn ${investmentMode === 'monthly' ? 'active' : ''}`} onClick={() => setInvestmentMode('monthly')} style={{ padding: '6px 12px' }}>Monthly (DCA)</button>
                          <button className={`toggle-btn ${investmentMode === 'oneoff' ? 'active' : ''}`} onClick={() => setInvestmentMode('oneoff')} style={{ padding: '6px 12px' }}>One-off</button>
                        </div>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Amount (USD)</label>
                        <input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} style={inputStyle} />
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                          <input type="checkbox" checked={reinvestDividends} onChange={(e) => setReinvestDividends(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1A73E8' }} />
                          <span>💰 Reinvest dividends (DRIP)</span>
                        </label>
                      </div>
                      <ComparisonSelector selectedIndexes={selectedIndexes} selectedCommodities={selectedCommodities} selectedCrypto={selectedCrypto} selectedBonds={selectedBonds} onToggleIndex={toggleIndex} onToggleCommodity={toggleCommodity} onToggleCrypto={toggleCrypto} onToggleBond={toggleBond} />
                      {error && <div style={{ marginTop: '12px', padding: '10px', background: '#FFEBEE', borderRadius: '4px', color: '#C62828', fontSize: '12px' }}>⚠️ {error}</div>}
                    </div>
                  )}
                  <div style={{ padding: '16px', borderTop: `1px solid ${theme.border}`, background: theme.cardBg }}>
                    <button onClick={runAnalysis} disabled={loading} style={{ width: '100%', background: '#1A73E8', color: 'white', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Analyzing...' : 'Calculate Returns'}</button>
                  </div>
                </div>

                {results ? (
                  <div style={{ minWidth: 0 }}>
                    <PortfolioChart chartData={results.chartData} allSymbols={results.allSymbols} stocks={stocks} theme={theme} />
                    <SummaryTable allSymbols={results.allSymbols} analysis={results.analysis} stocks={stocks} analystData={analystData} loadingAnalyst={loadingAnalyst} theme={theme} />
                    {selectedIndexes.length > 0 && <IndexConstituents selectedIndexes={selectedIndexes} startDate={startDate} endDate={endDate} theme={theme} />}
                    <PredictionsCard symbols={results.allSymbols} stocks={stocks} theme={theme} />
                  </div>
                ) : (
                  <div style={{ background: darkMode ? '#1e3a5f' : '#E3F2FD', borderRadius: '8px', padding: '20px', maxWidth: '600px' }}>
                    <strong>ℹ️ Growth Mode</strong>
                    <p style={{ marginTop: '8px', fontSize: '13px' }}>Calculate Historical Return on Investment (ROI) and DCA strategies.</p>
                  </div>
                )}

                {results && (
                  <div style={{ position: 'sticky', top: '20px', height: 'fit-content', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
                    <NewsPanel symbols={results.allSymbols} stocks={stocks} theme={theme} />
                  </div>
                )}
             </div>
          )}

          {activeTab === 'dividends' && <DividendPanel theme={theme} />}
          {activeTab === 'bonds' && <BondPanel theme={theme} />}

        </main>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
