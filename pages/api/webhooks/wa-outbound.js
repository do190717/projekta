import { createClient } from '@supabase/supabase-js'

// Send WhatsApp message via Meta Graph API
async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID
  const accessToken = process.env.WA_ACCESS_TOKEN
  
  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'WhatsApp API not configured' }
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: text },
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data?.error?.message || `HTTP ${response.status}` }
    }

    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export default async function handler(req, res) {
    console.log('=== WA OUTBOUND DEBUG ===')
    console.log('Body:', JSON.stringify(req.body, null, 2))
    console.log('Extracted message_id:', message_id)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Supabase sends webhook in this format: { type: "INSERT", table: "v2_chat_messages", record: {...} }
    const message_id = req.body?.record?.id || req.body?.message_id
    
    if (!message_id) {
      return res.status(400).json({ error: 'message_id required' })
    }

    console.log('Processing message for WhatsApp:', message_id)

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get message details
    const { data: message } = await supabase
      .from('v2_chat_messages')
      .select('id, project_id, user_id, content, message_type, metadata')
      .eq('id', message_id)
      .single()

    if (!message) {
      console.log('Message not found:', message_id)
      return res.status(404).json({ error: 'message_not_found' })
    }

    // Skip if from WhatsApp (avoid loop)
    if (message.metadata?.source === 'whatsapp') {
      console.log('Skipping WA-origin message')
      return res.status(200).json({ skipped: true, reason: 'wa_origin' })
    }

    // Check if WA enabled for project
    const { data: waEnabled } = await supabase.rpc('v2_wa_is_enabled', {
      p_project_id: message.project_id,
    })

    if (!waEnabled) {
      console.log('WA disabled for project:', message.project_id)
      return res.status(200).json({ skipped: true, reason: 'wa_disabled' })
    }

    // Get recipients (excluding sender)
    const { data: recipients } = await supabase.rpc('v2_wa_get_recipients', {
      p_project_id: message.project_id,
      p_exclude_user_id: message.user_id,
    })

    if (!recipients || recipients.length === 0) {
      console.log('No WA recipients for project:', message.project_id)
      return res.status(200).json({ skipped: true, reason: 'no_recipients' })
    }

    // Get project and sender info
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', message.project_id)
      .single()

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', message.user_id)
      .single()

    // Format message
    const projectName = project?.name || 'פרויקט'
    const senderName = senderProfile?.full_name || 'משתמש'
    const formattedMsg = `🏗️ *${projectName}*\n*${senderName}:* ${message.content}`

    console.log(`Sending to ${recipients.length} WA recipients`)

    // Send to all recipients
    const results = []
    for (const recipient of recipients) {
      const result = await sendWhatsAppMessage(recipient.phone_number, formattedMsg)
      results.push({
        phone: recipient.phone_number,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      })
      
      console.log(`WA send to ${recipient.phone_number}:`, result.success ? 'SUCCESS' : result.error)
    }

    return res.status(200).json({ 
      success: true, 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    })

  } catch (err) {
    console.error('WA Outbound error:', err)
    return res.status(500).json({ error: String(err) })
  }
}