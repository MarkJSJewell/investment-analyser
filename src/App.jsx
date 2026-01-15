import React, { useState, createContext, useContext } from 'react';
import StockInput from './components/StockInput';
import ComparisonSelector from './components/ComparisonSelector';
import PortfolioChart from './components/PortfolioChart';
import SummaryTable from './components/SummaryTable';
import IndexConstituents from './components/IndexConstituents';
import PredictionsCard from './components/PredictionsCard';
import NewsPanel from './components/NewsPanel';
import DividendPanel from './components/DividendPanel'; // NEW COMPONENT
import BondPanel from './components/BondPanel'; // NEW COMPONENT
import { fetchQuote, fetchHistoricalData, fetchAnalystData } from './services/api';
import { calculateDCA, buildChartData } from './utils/calculations';

// Theme Context
export const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

function App() {
  const [activeTab, setActiveTab] = useState('growth'); // 'growth', 'dividends', 'bonds'
  
  // Growth Tab State
  const [stocks, setStocks] = useState([{ symbol: '', status: 'idle', name: '' }]);
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(oneYearAgo);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [investmentAmount, setInvestmentAmount] = useState(500);
  const [investmentDay, setInvestmentDay] = useState(1);
  const [investmentMode, setInvestmentMode] = useState('monthly');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [selectedCommodities, setSelectedCommodities] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState([]);
  const [selectedBonds, setSelectedBonds] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analystData, setAnalystData] = useState({});
  const [loadingAnalyst, setLoadingAnalyst] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hardcoded Light Theme
  const theme = {
    bg: '#f5f5f5',
    cardBg: 'white',
    text: '#333',
    textMuted: '#666',
    border: '#e0e0e0',
    inputBg: 'white',
    headerBg: 'white',
    hoverBg: '#f8f9fa',
    primary: '#1A73E8',
    activeTab: '#E8F0FE'
  };

  // ... (Keep existing helper functions like addStock, validateStock, runAnalysis exactly as they were) ...
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

  // Reusable Tab Button
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

  return (
    <ThemeContext.Provider value={{ darkMode: false, theme }}>
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
        
        {/* Header with Tabs */}
        <header style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{ fontSize: '24px' }}>📈</span> Investment Calculator
            </h1>
            
            {/* Navigation Tabs */}
            <div style={{ display: 'flex', height: '100%' }}>
              <TabButton id="growth" icon="🚀" label="Growth & Returns" />
              <TabButton id="dividends" icon="💰" label="Dividend Income" />
              <TabButton id="bonds" icon="🏛️" label="Fixed Income" />
            </div>
            
            <div style={{ width: '100px' }}></div> {/* Spacer to balance header */}
          </div>
        </header>

        <main style={{ width: '100%', padding: '0', boxSizing: 'border-box' }}>
          
          {/* VIEW: GROWTH (Original Dashboard) */}
          {activeTab === 'growth' && (
             <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: results ? (sidebarCollapsed ? '50px 1fr 320px' : '400px 1fr 320px') : '1fr', gap: '20px', alignItems: 'start' }}>
                {/* ... (Existing Sidebar Code) ... */}
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
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min="1990-01-01" max={endDate} style={{ padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', width: '100%' }} />
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} style={{ padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', width: '100%' }} />
                        </div>
                      </div>
                      {/* ... (Rest of inputs: Investment Type, Amount, DRIP, Compare) ... */}
                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: theme.textMuted }}>Amount</label>
                        <input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} style={{ padding: '8px', border: `1px solid ${theme.border}`, width: '100%' }} />
                      </div>
                      <ComparisonSelector selectedIndexes={selectedIndexes} selectedCommodities={selectedCommodities} selectedCrypto={selectedCrypto} selectedBonds={selectedBonds} onToggleIndex={toggleIndex} onToggleCommodity={toggleCommodity} onToggleCrypto={toggleCrypto} onToggleBond={toggleBond} />
                    </div>
                  )}
                  <div style={{ padding: '16px', borderTop: `1px solid ${theme.border}`, background: theme.cardBg }}>
                    <button onClick={runAnalysis} disabled={loading} style={{ width: '100%', background: '#1A73E8', color: 'white', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Analyzing...' : 'Calculate Returns'}</button>
                  </div>
                </div>

                {/* Growth Results Area */}
                {results ? (
                  <div style={{ minWidth: 0 }}>
                    <PortfolioChart chartData={results.chartData} allSymbols={results.allSymbols} stocks={stocks} theme={theme} />
                    <SummaryTable allSymbols={results.allSymbols} analysis={results.analysis} stocks={stocks} analystData={analystData} loadingAnalyst={loadingAnalyst} theme={theme} />
                    {selectedIndexes.length > 0 && <IndexConstituents selectedIndexes={selectedIndexes} startDate={startDate} endDate={endDate} theme={theme} />}
                    <PredictionsCard symbols={results.allSymbols} stocks={stocks} theme={theme} />
                  </div>
                ) : (
                  <div style={{ background: '#E3F2FD', borderRadius: '8px', padding: '20px', maxWidth: '600px' }}>
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

          {/* VIEW: DIVIDENDS */}
          {activeTab === 'dividends' && <DividendPanel theme={theme} />}

          {/* VIEW: BONDS */}
          {activeTab === 'bonds' && <BondPanel theme={theme} />}

        </main>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
