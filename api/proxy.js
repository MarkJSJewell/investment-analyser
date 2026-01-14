// This function acts as a secure middleman.
// It runs on Vercel's servers, fetching data from Yahoo and passing it to your app.
// Yahoo trusts it because we add a real "User-Agent" browser header.

export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    // 1. Fetch from Yahoo using a real browser User-Agent to bypass the 401 blocks
    const externalResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // 2. Check if Yahoo failed
    if (!externalResponse.ok) {
      return response.status(externalResponse.status).json({ 
        error: `Yahoo API Error: ${externalResponse.statusText}` 
      });
    }

    // 3. Return the data to your frontend
    const data = await externalResponse.json();
    response.status(200).json(data);

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
