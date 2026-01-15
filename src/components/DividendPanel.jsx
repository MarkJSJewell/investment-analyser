// ... existing imports ...
import { fetchAnalystData } from '../services/api';
// ... other imports ...

// Helper for strict sequential delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ... Inside component ...
  const loadMarketData = async (symbols) => {
    setLoading(true);
    setData([]); 
    const results = [];
    
    for (const symbol of symbols) {
      try {
        setProgress(`Loading ${symbol}...`);
        
        // 1. Fetch data
        const info = await fetchAnalystData(symbol);
        
        // 2. Extra safety pause: 2 seconds per stock
        // This ensures the 429/401 error has time to clear on the server
        await wait(2000); 

        if (info && info.dividendYield) {
          results.push({
            symbol: symbol,
            name: info.name,
            price: info.currentPrice,
            yield: info.dividendYield,
            yieldDisplay: info.dividendYield * 100
          });
          setData([...results].sort((a, b) => b.yield - a.yield));
        }
      } catch (e) {
        console.warn(`Failed to fetch ${symbol}`, e);
      }
    }
    
    setLoading(false);
    setProgress('');
  };
// ... rest of component ...
