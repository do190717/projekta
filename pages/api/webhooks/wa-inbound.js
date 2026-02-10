export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://zzaltqnpdsgjcifohjmk.supabase.co/functions/v1/wa-inbound'
    
    // Build URL with query parameters for GET requests
    let targetUrl = supabaseUrl
    if (req.method === 'GET' && Object.keys(req.query).length > 0) {
      const searchParams = new URLSearchParams(req.query)
      targetUrl = `${supabaseUrl}?${searchParams.toString()}`
    }
    
    console.log('Proxying to:', targetUrl)
    
    // Forward the request to Supabase Edge Function
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })
    
    const data = await response.text()
    
    console.log('Supabase response:', response.status, data)
    
    // Return the same status and response from Supabase
    res.status(response.status)
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data)
      res.json(jsonData)
    } catch {
      res.send(data)
    }
    
  } catch (error) {
    console.error('Webhook proxy error:', error)
    res.status(500).json({ error: 'Webhook proxy failed' })
  }
}