// Calculate DCA or one-off investment returns
export const calculateDCA = (priceData, amount, day, mode, oneOffDate, reinvestDividends = true) => {
  const investments = [];
  let totalShares = 0;
  let totalInvested = 0;
  let totalDividends = 0;
  
  if (mode === 'oneoff') {
    // One-off investment on start date
    const investDate = priceData.find(d => d.date >= oneOffDate) || priceData[0];
    if (investDate) {
      const sharesBought = amount / investDate.price;
      totalShares = sharesBought;
      totalInvested = amount;
      investments.push({ 
        date: investDate.date, 
        price: investDate.price, 
        sharesBought, 
        totalShares, 
        totalInvested 
      });
    }
    
    // Process dividends
    priceData.forEach(d => {
      if (d.date > investDate.date && d.dividend > 0 && totalShares > 0) {
        const dividendAmount = d.dividend * totalShares;
        totalDividends += dividendAmount;
        if (reinvestDividends) {
          const newShares = dividendAmount / d.price;
          totalShares += newShares;
        }
      }
    });
  } else {
    // Monthly DCA
    const monthlyPrices = {};
    priceData.forEach(d => {
      const monthKey = d.date.substring(0, 7);
      const dayOfMonth = parseInt(d.date.split('-')[2]);
      
      if (!monthlyPrices[monthKey] || 
          Math.abs(dayOfMonth - day) < Math.abs(parseInt(monthlyPrices[monthKey].date.split('-')[2]) - day)) {
        monthlyPrices[monthKey] = d;
      }
    });
    
    // Track dividends by date for reinvestment
    const dividendsByDate = {};
    priceData.forEach(d => {
      if (d.dividend > 0) {
        dividendsByDate[d.date] = d;
      }
    });
    
    Object.keys(monthlyPrices).sort().forEach(monthKey => {
      const { date, price } = monthlyPrices[monthKey];
      
      // Check for dividends before this investment date
      Object.keys(dividendsByDate).forEach(divDate => {
        if (divDate <= date && totalShares > 0) {
          const divData = dividendsByDate[divDate];
          const dividendAmount = divData.dividend * totalShares;
          totalDividends += dividendAmount;
          if (reinvestDividends) {
            const newShares = dividendAmount / divData.price;
            totalShares += newShares;
          }
          delete dividendsByDate[divDate];
        }
      });
      
      const sharesBought = amount / price;
      totalShares += sharesBought;
      totalInvested += amount;
      
      investments.push({ date, price, sharesBought, totalShares, totalInvested });
    });
    
    // Process any remaining dividends
    Object.keys(dividendsByDate).forEach(divDate => {
      if (totalShares > 0) {
        const divData = dividendsByDate[divDate];
        const dividendAmount = divData.dividend * totalShares;
        totalDividends += dividendAmount;
        if (reinvestDividends) {
          const newShares = dividendAmount / divData.price;
          totalShares += newShares;
        }
      }
    });
  }
  
  const valueOverTime = priceData.map(d => {
    const relevantInvestments = investments.filter(inv => inv.date <= d.date);
    let sharesOwned = relevantInvestments.length > 0 
      ? relevantInvestments[relevantInvestments.length - 1].totalShares : 0;
    const invested = relevantInvestments.length > 0
      ? relevantInvestments[relevantInvestments.length - 1].totalInvested : 0;
    
    // Add dividend shares up to this date
    let divShares = 0;
    priceData.forEach(pd => {
      if (pd.date <= d.date && pd.dividend > 0 && sharesOwned > 0) {
        const prevInv = investments.filter(inv => inv.date <= pd.date);
        if (prevInv.length > 0) {
          const sharesAtDiv = prevInv[prevInv.length - 1].totalShares;
          divShares += (pd.dividend * sharesAtDiv) / pd.price;
        }
      }
    });
    
    return { date: d.date, value: (sharesOwned + divShares) * d.price, invested };
  });
  
  const finalInvestment = investments[investments.length - 1];
  const lastPrice = priceData[priceData.length - 1]?.price || 0;
  const firstTradeDate = investments.length > 0 ? investments[0].date : null;
  
  return {
    totalInvested: finalInvestment?.totalInvested || 0,
    totalShares,
    totalDividends,
    finalValue: totalShares * lastPrice,
    returnPercent: finalInvestment 
      ? ((totalShares * lastPrice - finalInvestment.totalInvested) / finalInvestment.totalInvested * 100) 
      : 0,
    valueOverTime,
    firstTradeDate
  };
};

// Build chart data from analysis results
export const buildChartData = (analysisResults, allSymbols, investmentMode, investmentAmount) => {
  const allDates = new Set();
  Object.values(analysisResults).forEach(r => {
    if (r.valueOverTime) {
      r.valueOverTime.forEach(v => allDates.add(v.date));
    }
  });
  
  const chartData = Array.from(allDates).sort().map(date => {
    const point = { date };
    Object.entries(analysisResults).forEach(([symbol, data]) => {
      if (data.valueOverTime) {
        const dayData = data.valueOverTime.find(v => v.date === date);
        if (dayData) {
          point[symbol] = Math.round(dayData.value * 100) / 100;
        }
      }
    });
    return point;
  });
  
  // Interpolate missing values (carry forward)
  allSymbols.forEach(symbol => {
    let lastKnownValue = null;
    chartData.forEach(point => {
      if (point[symbol] !== undefined) {
        lastKnownValue = point[symbol];
      } else if (lastKnownValue !== null) {
        point[symbol] = lastKnownValue;
      }
    });
  });
  
  // Add invested baseline
  if (chartData.length > 0) {
    let earliestDate = null;
    Object.values(analysisResults).forEach(r => {
      if (r.valueOverTime && r.valueOverTime.length > 0) {
        const firstDate = r.valueOverTime[0].date;
        if (!earliestDate || firstDate < earliestDate) {
          earliestDate = firstDate;
        }
      }
    });
    
    if (earliestDate) {
      chartData.forEach((point) => {
        if (investmentMode === 'oneoff') {
          point.invested = point.date >= earliestDate ? investmentAmount : 0;
        } else {
          const pointDate = new Date(point.date);
          const startDateObj = new Date(earliestDate);
          const monthsDiff = (pointDate.getFullYear() - startDateObj.getFullYear()) * 12 
            + (pointDate.getMonth() - startDateObj.getMonth());
          const investmentCount = Math.max(0, monthsDiff + 1);
          point.invested = investmentCount * investmentAmount;
        }
      });
    }
  }
  
  return chartData;
};
