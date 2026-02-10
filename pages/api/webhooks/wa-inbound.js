import { createClient } from '@supabase/supabase-js'

// Parse WhatsApp webhook payload
function parseWebhookPayload(body) {
  const messages = []
  
  try {
    const entries = body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        const value = change?.value
        if (!value?.messages) continue

        for (const msg of value.messages) {
          if (msg.type === 'text') {
            messages.push({
              from: '+' + msg.from,
              messageId: msg.id,
              text: msg.text?.body || '',
              timestamp: msg.timestamp,
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing webhook:', err)
  }

  return messages
}

export default async function handler(req, res) {
  // שם את זה בהתחלה של הפונקציה
  console.log('=== WEBHOOK DEBUG START ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Query params:', JSON.stringify(req.query))
  console.log('Headers:', JSON.stringify({
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
  }))
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  console.log('=== WA WEBHOOK START ===')
  console.log('Method:', req.method)
  console.log('Query:', req.query)

  if (req.method === 'OPTIONS') {
    return res.status(200).json({})
  }

  // Webhook verification (GET)
 if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query
    console.log('GET REQUEST - Mode:', mode, 'Token:', token, 'Challenge:', challenge)
    
    const verifyToken = process.env.WA_VERIFY_TOKEN || 'hello123'
    console.log('Expected verify token:', verifyToken)
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Verification SUCCESS')
      res.setHeader('Content-Type', 'text/plain')
      return res.status(200).send(challenge || '')
    } else {
      console.log('❌ Verification FAILED')
      return res.status(403).send('Forbidden')
    }
  }

  // Process incoming messages (POST)
  if (req.method === 'POST') {
    try {
      console.log('Processing WhatsApp message...')
      
      const body = req.body
      const messages = parseWebhookPayload(body)
      console.log('Parsed messages:', messages.length)

      if (messages.length === 0) {
        return res.status(200).json({ ok: true })
      }

      // Create Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const results = []
      
      for (const msg of messages) {
        console.log(`Processing message from ${msg.from}: ${msg.text}`)

        // Use the DB function to process inbound
        const { data, error } = await supabase.rpc('v2_wa_process_inbound', {
          p_phone_number: msg.from,
          p_content: msg.text,
          p_wa_message_id: msg.messageId,
        })

        if (error) {
          console.error('RPC error:', error)
          results.push({ phone: msg.from, error: error.message })
          continue
        }

        if (!data?.success) {
          console.warn('Process failed:', data?.error)
          results.push({ phone: msg.from, error: data?.error })
          continue
        }

        console.log(`Message saved: ${data.message_id} → project ${data.project_id}`)
        results.push({ phone: msg.from, success: true, project: data.project_id })
      }

      return res.status(200).json({ ok: true, results })

    } catch (err) {
      console.error('WA Inbound error:', err)
      return res.status(200).json({ ok: true, error: 'internal' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}