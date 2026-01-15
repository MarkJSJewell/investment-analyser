// Helper: Wait for a set amount of time
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // 1. Enable Caching (1 hour) to reduce load on Yahoo
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  // 2. Rotate User Agents
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  ];
  
  // 3. Retry Logic (Max 3 attempts)
  let lastErrorStatus = 500;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      
      const externalResponse = await fetch(url, {
        headers: {
          'User-Agent': agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      // If successful, return data immediately
      if (externalResponse.ok) {
        const data = await externalResponse.json();
        return response.status(200).json(data);
      }

      lastErrorStatus = externalResponse.status;

      // If it's NOT a rate limit error (e.g. 404 Not Found), fail immediately
      if (externalResponse.status !== 429) {
        return response.status(externalResponse.status).json({ 
          error: `Yahoo API Error: ${externalResponse.statusText}` 
        });
      }

      // If it IS a 429, wait and retry (Backoff: 1s, 2s, 3s...)
      console.log(`Hit 429 Rate Limit. Retrying attempt ${attempt + 1}...`);
      await sleep(1000 * (attempt + 1));

    } catch (error) {
      console.error('Proxy Fetch Error:', error);
      if (attempt === 2) {
        return response.status(500).json({ error: error.message });
      }
    }
  }

  // If all retries fail
  return response.status(lastErrorStatus).json({ 
    error: `Failed after 3 retries. Status: ${lastErrorStatus}` 
  });
}
