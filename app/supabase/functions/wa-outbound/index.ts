// ===========================================
// Projekta — WhatsApp Outbound Sender
// ===========================================
// Supabase Edge Function
// Triggered when a new message is inserted in v2_chat_messages
// Sends it to all WA-connected project members
//
// Can be called by:
// 1. Supabase Database Webhook (on INSERT to v2_chat_messages)
// 2. Direct HTTP call from the app
//
// Deploy: supabase functions deploy wa-outbound
// ===========================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  sendWhatsAppMessage, 
  formatOutboundMessage,
  formatSystemMessage 
} from '../shared/wa-client.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // ====== Source 1: Database Webhook ======
    // Supabase sends { type: "INSERT", table: "v2_chat_messages", record: {...} }
    if (body.type === 'INSERT' && body.table === 'v2_chat_messages') {
      const record = body.record
      return await handleNewMessage(record)
    }

    // ====== Source 2: Direct call ======
    // { message_id: "uuid" }
    if (body.message_id) {
      const supabase = getAdminClient()
      const { data: record } = await supabase
        .from('v2_chat_messages')
        .select('*')
        .eq('id', body.message_id)
        .single()

      if (!record) {
        return jsonResponse({ error: 'message_not_found' }, 404)
      }

      return await handleNewMessage(record)
    }

    return jsonResponse({ error: 'invalid_request' }, 400)
  } catch (err) {
    console.error('[WA Outbound] Error:', err)
    return jsonResponse({ error: 'internal', details: String(err) }, 500)
  }
})


// ====== Core: Handle new message → send to WA ======
async function handleNewMessage(record: any) {
  const supabase = getAdminClient()
  
  const { 
    id: messageId, 
    project_id: projectId, 
    user_id: userId, 
    content, 
    message_type: messageType,
    metadata 
  } = record

  // Skip if message came FROM WhatsApp (avoid echo loop!)
  if (metadata?.source === 'whatsapp') {
    console.log('[WA Outbound] Skipping WA-origin message:', messageId)
    return jsonResponse({ skipped: true, reason: 'wa_origin' })
  }

  // Skip AI cards and system messages (optional: can send summaries)
  if (messageType === 'ai_card') {
    console.log('[WA Outbound] Skipping AI card:', messageId)
    return jsonResponse({ skipped: true, reason: 'ai_card' })
  }

  // Check if WA is enabled for this project
  const { data: waEnabled } = await supabase.rpc('v2_wa_is_enabled', {
    p_project_id: projectId,
  })

  if (!waEnabled) {
    return jsonResponse({ skipped: true, reason: 'wa_disabled' })
  }

  // Get project name
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  const projectName = project?.name || 'פרויקט'

  // Get sender name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  const senderName = senderProfile?.full_name || 'משתמש'

  // Get recipients (all verified WA users except sender)
  const { data: recipients } = await supabase.rpc('v2_wa_get_recipients', {
    p_project_id: projectId,
    p_exclude_user_id: userId,
  })

  if (!recipients || recipients.length === 0) {
    return jsonResponse({ skipped: true, reason: 'no_recipients' })
  }

  // Format message
  let formattedMsg: string
  if (messageType === 'system') {
    formattedMsg = formatSystemMessage(projectName, content)
  } else {
    formattedMsg = formatOutboundMessage(projectName, senderName, content)
  }

  // Send to each recipient
  const results = []
  for (const recipient of recipients) {
    const result = await sendWhatsAppMessage(recipient.phone_number, formattedMsg)

    // Log to DB
    await supabase.rpc('v2_wa_log_outbound', {
      p_chat_message_id: messageId,
      p_project_id: projectId,
      p_phone: recipient.phone_number,
      p_wa_message_id: result.messageId || null,
      p_status: result.success ? 'sent' : 'failed',
      p_error: result.error || null,
    })

    results.push({
      phone: recipient.phone_number,
      success: result.success,
      messageId: result.messageId,
    })

    console.log(
      `[WA Outbound] ${result.success ? '✓' : '✗'} → ${recipient.phone_number}` +
      (result.error ? ` (${result.error})` : '')
    )
  }

  return jsonResponse({ 
    success: true, 
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results 
  })
}


// ====== Helpers ======

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  )
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json' 
    },
  })
}
