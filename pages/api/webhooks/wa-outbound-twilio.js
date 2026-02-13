// Twilio WhatsApp Webhook Handler - Outbound Messages
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER; // whatsapp:+14155238886

const supabase = createClient(supabaseUrl, supabaseKey);
const client = twilio(twilioAccountSid, twilioAuthToken);

export default async function handler(req, res) {
  console.log('=== TWILIO OUTBOUND WEBHOOK START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This is triggered by Supabase Database Webhook on v2_chat_messages INSERT
    const { record } = req.body;
    const messageId = record?.id;

    if (!messageId) {
      console.error('No message ID provided');
      return res.status(400).json({ error: 'Missing message ID' });
    }

    console.log('Processing message ID:', messageId);

    // Get message details from Supabase
    const { data: messageData, error: messageError } = await supabase
      .from('v2_chat_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      console.error('Failed to fetch message:', messageError);
      return res.status(404).json({ error: 'Message not found' });
    }

    // Skip messages that originated from WhatsApp (prevent loops)
    if (messageData.metadata?.source === 'whatsapp') {
      console.log('Skipping WA-origin message');
      return res.status(200).json({ message: 'WhatsApp message skipped' });
    }

    // Check if WhatsApp is enabled for this project
    const { data: isEnabled, error: enableError } = await supabase.rpc('v2_wa_is_enabled', {
      project_id: messageData.project_id
    });

    if (enableError) {
      console.error('Error checking WA status:', enableError);
      return res.status(500).json({ error: 'Failed to check WhatsApp status' });
    }

    if (!isEnabled) {
      console.log('WhatsApp not enabled for project:', messageData.project_id);
      return res.status(200).json({ message: 'WhatsApp not enabled' });
    }

    // Get WhatsApp recipients
    const { data: recipients, error: recipientsError } = await supabase.rpc('v2_wa_get_recipients', {
      project_id: messageData.project_id
    });

    if (recipientsError) {
      console.error('Error getting recipients:', recipientsError);
      return res.status(500).json({ error: 'Failed to get recipients' });
    }

    if (!recipients || recipients.length === 0) {
      console.log('No WhatsApp recipients found');
      return res.status(200).json({ message: 'No recipients' });
    }

    // Get project and sender info
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', messageData.project_id)
      .single();

    const { data: senderData, error: senderError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', messageData.user_id)
      .single();

    const projectName = projectData?.name || 'פרויקט';
    const senderName = senderData?.full_name || 'מישהו';

    // Format message for WhatsApp
    const formattedMessage = `🏗️ *${projectName}*\n*${senderName}:* ${messageData.content}`;

    // Send to all recipients via Twilio
    const sendPromises = recipients.map(async (recipient) => {
      try {
        const phoneNumber = recipient.phone_number.startsWith('+') 
          ? recipient.phone_number 
          : `+${recipient.phone_number}`;

        console.log(`Sending to: ${phoneNumber}`);

        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: `whatsapp:${phoneNumber}`,
          body: formattedMessage
        });

        console.log(`Twilio send SUCCESS to ${phoneNumber}: ${message.sid}`);
        
        return {
          phone: phoneNumber,
          status: 'success',
          sid: message.sid
        };
      } catch (error) {
        console.error(`Twilio send FAILED to ${recipient.phone_number}:`, error.message);
        
        return {
          phone: recipient.phone_number,
          status: 'failed',
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    
    console.log('Send results:', results);
    
    return res.status(200).json({
      message: 'Messages processed',
      recipients: recipients.length,
      results: results.map(r => r.value || r.reason)
    });

  } catch (error) {
    console.error('Outbound webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }

  console.log('=== TWILIO OUTBOUND WEBHOOK END ===');
}
