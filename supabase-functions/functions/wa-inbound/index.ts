// ===========================================
// Projekta — WhatsApp Inbound Webhook
// ===========================================
// Supabase Edge Function
// Receives messages FROM WhatsApp → inserts into Projekta chat
//
// Deploy: supabase functions deploy wa-inbound
// Set secrets:
//   supabase secrets set WA_VERIFY_TOKEN=your_token
//   supabase secrets set WA_PHONE_NUMBER_ID=your_id
//   supabase secrets set WA_ACCESS_TOKEN=your_token
//
// Webhook URL: https://<project>.supabase.co/functions/v1/wa-inbound
// ===========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  parseWebhookPayload, 
  verifyWebhook, 
  getWAConfig 
} from '../shared/wa-client.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ====== GET: Webhook verification ======
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const result = verifyWebhook(url.searchParams)
    return new Response(result.body, { 
      status: result.status,
      headers: corsHeaders 
    })
  }

  // ====== POST: Incoming message ======
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      
      // Parse WhatsApp webhook payload
      const messages = parseWebhookPayload(body)

      if (messages.length === 0) {
        // Could be a status update, not a message — acknowledge
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create Supabase admin client (service role)
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      )

      const results = []

      for (const msg of messages) {
        console.log(`[WA Inbound] From: ${msg.from}, Text: ${msg.text.substring(0, 50)}`)

        // Use the DB function to process inbound
        const { data, error } = await supabase.rpc('v2_wa_process_inbound', {
          p_phone_number: msg.from,
          p_content: msg.text,
          p_wa_message_id: msg.messageId,
        })

        if (error) {
          console.error('[WA Inbound] RPC error:', error)
          results.push({ phone: msg.from, error: error.message })
          continue
        }

        if (!data?.success) {
          console.warn('[WA Inbound] Process failed:', data?.error)
          results.push({ phone: msg.from, error: data?.error })
          continue
        }

        console.log(`[WA Inbound] Message saved: ${data.message_id} → project ${data.project_id}`)

        // Now broadcast to other project members via WA
        // (the message is already in DB, so other app users see it via Realtime)
        // We need to send it to WA users who are NOT the sender
        await broadcastToProject(supabase, data.project_id, data.user_name, msg.text, msg.from)

        results.push({ phone: msg.from, success: true, project: data.project_id })
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('[WA Inbound] Error:', err)
      // Always return 200 to WhatsApp to prevent retries
      return new Response(JSON.stringify({ ok: true, error: 'internal' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
})


// ====== Helper: Broadcast message to all WA users in project ======
async function broadcastToProject(
  supabase: any,
  projectId: string,
  senderName: string,
  content: string,
  excludePhone: string
) {
  // Dynamic import to avoid circular deps in Deno
  const { sendWhatsAppMessage, formatOutboundMessage } = await import('./shared/wa-client.js')

  // Get project name
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  const projectName = project?.name || 'פרויקט'

  // Get recipients
  const { data: recipients } = await supabase.rpc('v2_wa_get_recipients', {
    p_project_id: projectId,
  })

  if (!recipients || recipients.length === 0) return

  const formattedMsg = formatOutboundMessage(projectName, senderName || 'משתמש', content)

  for (const recipient of recipients) {
    // Don't send back to the sender
    if (recipient.phone_number === excludePhone) continue

    const result = await sendWhatsAppMessage(recipient.phone_number, formattedMsg)

    // Log
    await supabase.rpc('v2_wa_log_outbound', {
      p_chat_message_id: null,
      p_project_id: projectId,
      p_phone: recipient.phone_number,
      p_wa_message_id: result.messageId || null,
      p_status: result.success ? 'sent' : 'failed',
      p_error: result.error || null,
    })
  }
}
