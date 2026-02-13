// Twilio WhatsApp Webhook Handler - Inbound Messages
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

    // Find user by phone number in v2_wa_user_phones
    const { data: userPhone, error: userPhoneError } = await supabase
      .from('v2_wa_user_phones')
      .select(`
        user_id,
        phone_number,
        profiles!inner(id, full_name),
        project_members!inner(project_id, projects!inner(id, name))
      `)
      .eq('phone_number', phoneNumber)
      .limit(1);

    if (userPhoneError) {
      console.error('Error finding user:', userPhoneError);
      return res.status(500).json({ error: 'Database error', details: userPhoneError });
    }

    if (!userPhone || userPhone.length === 0) {
      console.log('No user found for phone:', phoneNumber);
      return res.status(200).send('OK - No user found');
    }

    const user = userPhone[0];
    const projectId = user.project_members[0]?.project_id;

    if (!projectId) {
      console.log('No project found for user:', phoneNumber);
      return res.status(200).send('OK - No project');
    }

    // Save message to v2_chat_messages
    const { data: savedMessage, error: saveError } = await supabase
      .from('v2_chat_messages')
      .insert({
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: user.user_id,
        content: body,
        created_at: new Date().toISOString(),
        metadata: {
          source: 'whatsapp',
          twilio_message_id: messageSid,
          sender_name: profileName,
          phone_number: phoneNumber,
          media_url: mediaUrl,
          media_type: mediaType
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
      return res.status(500).json({ error: 'Save error', details: saveError });
    }

    console.log('Message saved successfully:', savedMessage.id);
    
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