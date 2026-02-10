export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://zzaltqnpdsgjcifohjmk.supabase.co/functions/v1/wa-inbound'
    
    // Forward the request to Supabase Edge Function
    const response = await fetch(supabaseUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })
    
    const data = await response.text()
    
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