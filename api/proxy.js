// Helper: Wait for a set amount of time
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // 1. Caching: aggressive caching to prevent hitting Yahoo again for the same data
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  // 2. Browser Masquerade: Rotate User Agents AND add standard browser headers
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
  ];

  let lastErrorStatus = 500;

  // 3. Robust Retry Loop
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      
      const externalResponse = await fetch(url, {
        headers: {
          'User-Agent': agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        },
      });

      if (externalResponse.ok) {
        const data = await externalResponse.json();
        return response.status(200).json(data);
      }

      lastErrorStatus = externalResponse.status;

      // If Rate Limited (429) OR Unauthorized (401), wait and retry
      if (externalResponse.status === 429 || externalResponse.status === 401) {
        console.log(`Hit ${externalResponse.status}. Retrying attempt ${attempt + 1}...`);
        // Exponential backoff: 2s, 4s, 6s
        await sleep(2000 * (attempt + 1));
        continue;
      }
      
      // Other errors (404), fail immediately
      return response.status(externalResponse.status).json({ 
        error: `Yahoo API Error: ${externalResponse.statusText}` 
      });

    } catch (error) {
      console.error('Proxy Fetch Error:', error);
      if (attempt === 2) return response.status(500).json({ error: error.message });
      await sleep(1000);
    }
  }

  return response.status(lastErrorStatus).json({ 
    error: `Failed after 3 retries. Status: ${lastErrorStatus}` 
  });
}
