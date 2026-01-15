import React, { useState, createContext, useContext } from 'react';
import StockInput from './components/StockInput';
import ComparisonSelector from './components/ComparisonSelector';
import PortfolioChart from './components/PortfolioChart';
import SummaryTable from './components/SummaryTable';
import IndexConstituents from './components/IndexConstituents';
import PredictionsCard from './components/PredictionsCard';
import NewsPanel from './components/NewsPanel';
import { fetchQuote, fetchHistoricalData, fetchAnalystData } from './services/api';
import { calculateDCA, buildChartData } from './utils/calculations';

// Theme Context
export const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

function App() {
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
  const [darkMode, setDarkMode] = useState(false);

  // Theme colors
  const theme = {
    bg: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : 'white',
    text: darkMode ? '#e8e8e8' : '#333',
    textMuted: darkMode ? '#a0a0a0' : '#666',
    border: darkMode ? '#2a2a4a' : '#e0e0e0',
    inputBg: darkMode ? '#1a1a2e' : 'white',
    headerBg: darkMode ? '#0f0f1a' : 'white',
    hoverBg: darkMode ? '#2a2a4a' : '#f8f9fa',
  };

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
    
    const n = [...stocks]; 
    n[index] = { ...stock, status: 'validating' }; 
    setStocks(n);
    
    try {
      const r = await fetchQuote(stock.symbol);
      const u = [...stocks]; 
      
      if (r.valid) {
        // If ISIN resolution found a new symbol (e.g. GB00... -> GB00...L), update it
        u[index] = { 
          symbol: r.symbol || stock.symbol, // Use resolved symbol
          status: 'valid', 
          name: r.name 
        };
      } else {
        u[index] = { ...stock, status: 'invalid', name: r.error || 'Invalid' };
      }
      setStocks(u);
    } catch { 
      const u = [...stocks]; 
      u[index] = { ...stock, status: 'invalid', name: 'Could not validate' }; 
      setStocks(u); 
    }
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
      
      // Fetch analyst data in background
      setLoadingAnalyst(true);
      const analystResults = {};
      for (const symbol of allSymbols) { 
        try {
          const d = await fetchAnalystData(symbol); 
          if (d) analystResults[symbol] = d;
        } catch (e) {
          console.log(`Analyst data failed for ${symbol}:`, e);
        }
      }
      setAnalystData(analystResults); 
      setLoadingAnalyst(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const inputStyle = { 
    padding: '10px 12px', 
    border: `1px solid ${theme.border}`, 
    borderRadius: '4px', 
    fontSize: '14px', 
    outline: 'none', 
    width: '100%',
    background: theme.inputBg,
    color: theme.text
  };

  return (
    <ThemeContext.Provider value={{ darkMode, theme }}>
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
        <header style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 24px' }}>
          <div style={{ maxWidth: '1900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📈</span> Investment Calculator
            </h1>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: darkMode ? '#333' : '#f0f0f0',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: theme.text
              }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '1900px', margin: '0 auto', padding: '20px' }}>
          {/* Main Layout - responsive grid */}
          <div style={{ 
            display: 'grid', 
            // If results exist: On wide screens use 3 cols, on medium use 2 cols, on small 1 col
            // If no results: 1 column centered
            gridTemplateColumns: results 
              ? (sidebarCollapsed 
                  ? '50px 1fr minmax(300px, 320px)' 
                  : 'repeat(auto-fit, minmax(350px, 1fr))') 
              : 'minmax(300px, 600px)', 
            gap: '20px',
            justifyContent: results ? 'stretch' : 'center'
          }}>
            
            {/* Left Sidebar - Input Controls */}
            <div style={{ 
              background: theme.cardBg, 
              borderRadius: '8px', 
              border: `1px solid ${theme.border}`, 
              position: results ? 'sticky' : 'static', 
              top: '20px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: results ? 'calc(100vh - 40px)' : 'none',
              overflow: 'hidden'
            }}>
              {/* Collapse/Expand Button */}
              {results && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: theme.hoverBg,
                    border: 'none',
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: theme.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    flexShrink: 0
                  }}
                >
                  {sidebarCollapsed ? '▶ Expand' : '◀ Collapse'}
                </button>
              )}
              
              {!sidebarCollapsed && (
                <div style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                  <StockInput stocks={stocks} onUpdate={updateStock} onRemove={removeStock} onAdd={addStock} onValidate={validateStock} theme={theme} />
                  
                  <div style={{ marginTop: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>Date Range</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>Start</div>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min="1990-01-01" max={endDate} style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>End</div>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} max={new Date().toISOString().split('T')[0]} style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '6px' }}>Investment Type</div>
                    <div className="toggle-container" style={{ fontSize: '12px' }}>
                      <button className={`toggle-btn ${investmentMode === 'monthly' ? 'active' : ''}`} onClick={() => setInvestmentMode('monthly')} style={{ padding: '6px 12px' }}>Monthly (DCA)</button>
                      <button className={`toggle-btn ${investmentMode === 'oneoff' ? 'active' : ''}`} onClick={() => setInvestmentMode('oneoff')} style={{ padding: '6px 12px' }}>One-off</button>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>Amount (USD)</div>
                        <input type="number" value={investmentAmount} onChange={(e) => setInvestmentAmount(Number(e.target.value))} min="1" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }} />
                      </div>
                      {investmentMode === 'monthly' && (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>Day</div>
                          <select value={investmentDay} onChange={(e) => setInvestmentDay(Number(e.target.value))} style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dividend Reinvestment Toggle */}
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={reinvestDividends} 
                        onChange={(e) => setReinvestDividends(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#1A73E8' }}
                      />
                      <span>💰 Reinvest dividends (DRIP)</span>
                    </label>
                  </div>

                  <ComparisonSelector selectedIndexes={selectedIndexes} selectedCommodities={selectedCommodities} selectedCrypto={selectedCrypto} selectedBonds={selectedBonds} onToggleIndex={toggleIndex} onToggleCommodity={toggleCommodity} onToggleCrypto={toggleCrypto} onToggleBond={toggleBond} />
                  
                  {error && <div style={{ marginTop: '12px', padding: '10px', background: '#FFEBEE', borderRadius: '4px', color: '#C62828', fontSize: '12px' }}>⚠️ {error}</div>}
                </div>
              )}
              
              {/* Fixed Calculate Button at Bottom */}
              <div style={{ 
                padding: sidebarCollapsed ? '8px' : '16px 20px',
                borderTop: `1px solid ${theme.border}`,
                background: theme.cardBg,
                flexShrink: 0
              }}>
                {!sidebarCollapsed && (
                  <button 
                    onClick={runAnalysis} 
                    disabled={loading} 
                    style={{ 
                      width: '100%', 
                      background: '#1A73E8', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      padding: '14px', 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      cursor: loading ? 'wait' : 'pointer', 
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 2px 8px rgba(26, 115, 232, 0.3)'
                    }}
                  >
                    {loading ? <span><span className="spinner"></span>Analyzing...</span> : '🔍 Calculate Returns'}
                  </button>
                )}
                {sidebarCollapsed && (
                  <button 
                    onClick={runAnalysis} 
                    disabled={loading}
                    title="Calculate Returns"
                    style={{ 
                      width: '100%', 
                      background: '#1A73E8', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      padding: '10px', 
                      fontSize: '16px', 
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? '⏳' : '🔍'}
                  </button>
                )}
              </div>
            </div>

            {/* Middle Content Area */}
            {results && (
              <div>
                {/* Chart */}
                <PortfolioChart chartData={results.chartData} allSymbols={results.allSymbols} stocks={stocks} theme={theme} />
                
                {/* Summary Table */}
                <SummaryTable 
                  allSymbols={results.allSymbols} 
                  analysis={results.analysis} 
                  stocks={stocks} 
                  analystData={analystData}
                  loadingAnalyst={loadingAnalyst}
                  theme={theme}
                />
                
                {/* Index Constituents - Under summary table */}
                {selectedIndexes.length > 0 && (
                  <IndexConstituents selectedIndexes={selectedIndexes} startDate={startDate} endDate={endDate} theme={theme} />
                )}
                
                {/* Predictions Card */}
                <PredictionsCard symbols={results.allSymbols} stocks={stocks} theme={theme} />
              </div>
            )}

            {/* Right Sidebar - News Panel */}
            {results && (
              <div style={{ position: 'sticky', top: '20px', height: 'fit-content', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
                <NewsPanel symbols={results.allSymbols} stocks={stocks} theme={theme} />
              </div>
            )}

            {/* Show info box when no results */}
            {!results && (
              <div style={{ background: darkMode ? '#1e3a5f' : '#E3F2FD', borderRadius: '8px', padding: '20px', fontSize: '13px' }}>
                <strong>ℹ️ How to use</strong>
                <p style={{ marginTop: '8px', lineHeight: '1.5' }}>1. Enter stock symbols (e.g., AAPL, MSFT)</p>
                <p style={{ marginTop: '4px', lineHeight: '1.5' }}>2. Select indexes, crypto or commodities to compare</p>
                <p style={{ marginTop: '4px', lineHeight: '1.5' }}>3. Set your date range and investment amount</p>
                <p style={{ marginTop: '4px', lineHeight: '1.5' }}>4. Click "Calculate Returns"</p>
                <p style={{ marginTop: '12px', color: theme.textMuted, fontSize: '12px' }}>Data from Yahoo Finance. Toggle DRIP to include/exclude dividend reinvestment.</p>
              </div>
            )}
          </div>
        </main>
        
        <footer style={{ textAlign: 'center', padding: '16px', color: theme.textMuted, fontSize: '11px' }}>
          Data provided by Yahoo Finance • For educational purposes only • Past performance does not guarantee future results
        </footer>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
