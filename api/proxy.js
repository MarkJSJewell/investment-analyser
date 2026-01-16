export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  const targetUrl = url.replace('query2.finance.yahoo.com', 'query1.finance.yahoo.com');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://finance.yahoo.com',
    'Origin': 'https://finance.yahoo.com'
  };

  try {
    const externalResponse = await fetch(targetUrl, { headers });

    // Handle non-200 responses gracefully
    if (!externalResponse.ok) {
      return response.status(externalResponse.status).json({ 
        error: `Yahoo API Error: ${externalResponse.statusText}` 
      });
    }

    const data = await externalResponse.json();
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
