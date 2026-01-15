export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // 1. Force use of query1 (often less strict than query2)
  // We replace any reference to query2 with query1
  const targetUrl = url.replace('query2.finance.yahoo.com', 'query1.finance.yahoo.com');

  // 2. Add "Stealth" Headers
  // Yahoo checks the 'Referer' to ensure the request comes from finance.yahoo.com
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://finance.yahoo.com/quote/AAPL', 
    'Origin': 'https://finance.yahoo.com',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-site',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
  };

  try {
    const externalResponse = await fetch(targetUrl, { headers });

    // 3. Handle Errors Gracefully
    if (!externalResponse.ok) {
      // If we get a 404, it might just be an invalid symbol, so we return 404
      // If we get 429/401, we pass that status back so the client knows to wait
      return response.status(externalResponse.status).json({ 
        error: `Yahoo API Error: ${externalResponse.statusText}` 
      });
    }

    const data = await externalResponse.json();
    
    // 4. Cache Success for 1 hour to save API calls
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
