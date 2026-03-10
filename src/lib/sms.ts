/**
 * SMS Utility for Glamour Growth using MSG91
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID_CLIENT = process.env.MSG91_TEMPLATE_ID_CLIENT;
const MSG91_TEMPLATE_ID_ARTIST = process.env.MSG91_TEMPLATE_ID_ARTIST;

export async function sendSMS(to: string, message: string, templateId?: string) {
  console.log(`[SMS Mock] Sending to ${to}: ${message}`);

  if (!MSG91_AUTH_KEY) {
    console.warn('MSG91_AUTH_KEY is not set. SMS will not be sent.');
    return;
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: '0',
        recipients: [
          {
            mobiles: to,
            // Add variables based on your MSG91 template
            message: message,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log('MSG91 Response:', data);
    return data;
  } catch (error) {
    console.error('Error sending SMS via MSG91:', error);
  }
}

export async function sendBookingConfirmationToClient(
  clientPhone: string,
  artistName: string,
  serviceName: string,
  date: string,
  time: string
) {
  const message = `Your booking with ${artistName} is confirmed for ${serviceName} on ${date} at ${time}.`;
  return sendSMS(clientPhone, message, MSG91_TEMPLATE_ID_CLIENT);
}

export async function sendBookingNotificationToArtist(
  artistPhone: string,
  clientName: string,
  serviceName: string,
  date: string,
  time: string
) {
  const message = `New booking received from ${clientName} for ${serviceName} on ${date} at ${time}.`;
  return sendSMS(artistPhone, message, MSG91_TEMPLATE_ID_ARTIST);
}
