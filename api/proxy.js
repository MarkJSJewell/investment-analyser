export default async function handler(request, response) {
  const { url } = request.query;
  if (!url) return response.status(400).json({ error: 'Missing url' });

  // Always use query1
  const targetUrl = url.replace('query2.finance.yahoo.com', 'query1.finance.yahoo.com');

  try {
    const externalResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finance.yahoo.com',
      }
    });

    // Pass the status code through (401, 429, 200)
    // We let the client handle the fallback logic
    const data = await externalResponse.json();
    response.status(externalResponse.status).json(data);

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
