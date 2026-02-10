export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://zzaltqnpdsgjcifohjmk.supabase.co/functions/v1/wa-inbound'
    
    // Build URL with query parameters for GET requests  
    let targetUrl = supabaseUrl
    if (req.method === 'GET' && Object.keys(req.query).length > 0) {
      const searchParams = new URLSearchParams()
      Object.keys(req.query).forEach(key => {
        searchParams.append(key, req.query[key])
      })
      targetUrl = `${supabaseUrl}?${searchParams.toString()}`
    }
    
    console.log('Method:', req.method)
    console.log('Query:', req.query)  
    console.log('Proxying to:', targetUrl)
    
    // Forward the request to Supabase Edge Function
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'User-Agent': req.headers['user-agent'] || 'Projekta-Webhook-Proxy',
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
    })
    
    const data = await response.text()
    
    console.log('Supabase response status:', response.status)
    console.log('Supabase response body:', data.substring(0, 200))
    
    // Return the same status and response from Supabase
    res.status(response.status)
    
    // For webhook verification, return plain text
    if (req.query.hub_challenge || req.query['hub.challenge']) {
      return res.send(data)
    }
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data)
      res.json(jsonData)
    } catch {
      res.send(data)
    }
    
  } catch (error) {
    console.error('Webhook proxy error:', error)
    res.status(500).json({ error: 'Webhook proxy failed', details: error.message })
  }
}