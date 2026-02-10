// ===========================================
// Projekta — WhatsApp API Client
// ===========================================
// Handles all communication with Meta's WhatsApp Cloud API
// Used by both inbound (webhook) and outbound (send) functions
// ===========================================

const WA_API_VERSION = 'v21.0'

interface WAConfig {
  phoneNumberId: string   // WhatsApp Business phone number ID
  accessToken: string     // Permanent access token
  verifyToken: string     // Webhook verification token
}

interface WASendResult {
  success: boolean
  messageId?: string
  error?: string
}

// Get config from environment
export function getWAConfig(): WAConfig {
  return {
    phoneNumberId: Deno.env.get('WA_PHONE_NUMBER_ID') || '',
    accessToken: Deno.env.get('WA_ACCESS_TOKEN') || '',
    verifyToken: Deno.env.get('WA_VERIFY_TOKEN') || '',
  }
}

// ===========================================
// SEND MESSAGE
// ===========================================

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  config?: WAConfig
): Promise<WASendResult> {
  const cfg = config || getWAConfig()
  
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { success: false, error: 'WhatsApp API not configured' }
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${cfg.phoneNumberId}/messages`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace('+', ''), // API expects without +
        type: 'text',
        text: { body: text },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`
      console.error('WA API error:', data)
      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id
    return { success: true, messageId }
  } catch (err) {
    console.error('WA send error:', err)
    return { success: false, error: String(err) }
  }
}

// ===========================================
// SEND TEMPLATE MESSAGE (for OTP, welcome)
// ===========================================

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'he',
  parameters: string[] = [],
  config?: WAConfig
): Promise<WASendResult> {
  const cfg = config || getWAConfig()
  
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { success: false, error: 'WhatsApp API not configured' }
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${cfg.phoneNumberId}/messages`

  const components = parameters.length > 0 ? [{
    type: 'body',
    parameters: parameters.map(p => ({ type: 'text', text: p }))
  }] : undefined

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
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

// ===========================================
// PARSE INCOMING WEBHOOK
// ===========================================

export interface WAInboundMessage {
  from: string           // Phone number (e.g., "972501234567")
  messageId: string      // WhatsApp message ID
  text: string           // Message text
  timestamp: string      // Unix timestamp
  type: string           // "text", "image", etc.
}

export function parseWebhookPayload(body: any): WAInboundMessage[] {
  const messages: WAInboundMessage[] = []

  try {
    const entries = body?.entry || []
    for (const entry of entries) {
      const changes = entry?.changes || []
      for (const change of changes) {
        const value = change?.value
        if (!value?.messages) continue

        for (const msg of value.messages) {
          // Only handle text messages for now
          if (msg.type === 'text') {
            messages.push({
              from: '+' + msg.from,  // Add + prefix for E.164
              messageId: msg.id,
              text: msg.text?.body || '',
              timestamp: msg.timestamp,
              type: msg.type,
            })
          }
          // TODO: Handle image, audio, document messages
        }
      }
    }
  } catch (err) {
    console.error('Error parsing webhook:', err)
  }

  return messages
}

// ===========================================
// VERIFY WEBHOOK (GET request from Meta)
// ===========================================

export function verifyWebhook(
  searchParams: URLSearchParams,
  config?: WAConfig
): { status: number; body: string } {
  const cfg = config || getWAConfig()
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === cfg.verifyToken) {
    console.log('Webhook verified!')
    return { status: 200, body: challenge || '' }
  }

  console.warn('Webhook verification failed')
  return { status: 403, body: 'Forbidden' }
}

// ===========================================
// FORMAT MESSAGE FOR WA
// ===========================================

export function formatOutboundMessage(
  projectName: string,
  senderName: string,
  content: string
): string {
  return `🏗️ *${projectName}*\n*${senderName}:* ${content}`
}

export function formatSystemMessage(
  projectName: string,
  content: string
): string {
  return `🏗️ *${projectName}*\n📋 ${content}`
}
