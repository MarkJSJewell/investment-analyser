export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // 1. CRITICAL: Enable Caching
  // This tells Vercel: "Save this response for 1 hour (3600s)".
  // Subsequent requests won't hit Yahoo at all, preventing 429 errors.
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  // 2. Rotate User Agents to look like different real browsers
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
  ];
  const agent = agents[Math.floor(Math.random() * agents.length)];

  try {
    const externalResponse = await fetch(url, {
      headers: {
        'User-Agent': agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!externalResponse.ok) {
      // If we still get a 429, pass it through so the app knows to wait
      return response.status(externalResponse.status).json({ 
        error: `Yahoo API Error: ${externalResponse.statusText}` 
      });
    }

    const data = await externalResponse.json();
    response.status(200).json(data);

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
