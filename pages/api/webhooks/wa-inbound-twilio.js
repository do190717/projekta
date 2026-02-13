// Twilio WhatsApp Webhook Handler - Inbound Messages
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('=== TWILIO WEBHOOK DEBUG START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  if (req.method === 'GET') {
    // Health check
    return res.status(200).json({ status: 'Twilio WhatsApp webhook active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Twilio signature for security
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `https://${req.headers.host}${req.url}`;
    
    const isValid = twilio.validateRequest(
      twilioAuthToken,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      console.error('Invalid Twilio signature');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Parse Twilio webhook data
    const {
      From: from,          // whatsapp:+1234567890
      To: to,             // whatsapp:+1234567890  
      Body: body,         // Message content
      MessageSid: messageSid,
      ProfileName: profileName,
      MediaUrl0: mediaUrl,
      MediaContentType0: mediaType
    } = req.body;

    console.log('Twilio message data:', {
      from, to, body, messageSid, profileName, mediaUrl, mediaType
    });

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = from.replace('whatsapp:', '');
    
    if (!phoneNumber || !body) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing phone number or message body' });
    }

    // Call Supabase RPC to process the inbound message
    const { data, error } = await supabase.rpc('v2_wa_process_inbound', {
      phone_number: phoneNumber,
      message_content: body,
      message_id: messageSid,
      sender_name: profileName,
      media_url: mediaUrl,
      media_type: mediaType
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({ error: 'Database error', details: error });
    }

    console.log('Message processed successfully:', data);
    
    // Respond to Twilio (empty response = success)
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }

  console.log('=== TWILIO WEBHOOK DEBUG END ===');
}

// Handle form data parsing
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
