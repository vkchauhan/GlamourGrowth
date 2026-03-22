import { IncomeEntry, SmartNudge, Language } from "../types";
import { format, subDays, isSameDay, parseISO } from "date-fns";

export const nudgeService = {
  generateNudges: (bookings: IncomeEntry[], artistProfile?: any): SmartNudge[] => {
    const nudges: SmartNudge[] = [];
    const today = new Date();
    const yesterday = subDays(today, 1);
    const artistName = artistProfile?.name || "Glamour Growth";
    
    bookings.forEach(booking => {
      const bookingDate = parseISO(booking.date);
      
      // 1. Follow up for yesterday's event
      if (isSameDay(bookingDate, yesterday)) {
        const id = `followup-${booking.clientName}-${format(bookingDate, 'yyyy-MM-dd')}`;
        // Check if we already have a follow-up for this client on this day
        if (!nudges.some(n => n.id === id)) {
          nudges.push({
            id,
            type: 'follow_up',
            title_en: "Follow up with " + booking.clientName,
            title_hi: booking.clientName + " से फीडबैक लें",
            message_en: `${booking.clientName}'s event was yesterday. Send a 'Thank You' and ask for a review?`,
            message_hi: `${booking.clientName} का इवेंट कल था। क्या आप उन्हें 'Thank You' मैसेज भेजकर रिव्यू मांगना चाहेंगे?`,
            whatsapp_text_en: `Hi ${booking.clientName}, it was a pleasure working with you yesterday! I hope you loved the look. Would you mind sharing a quick review or a photo? It helps my small business grow! - ${artistName}`,
            whatsapp_text_hi: `नमस्ते ${booking.clientName}, कल आपके साथ काम करके बहुत अच्छा लगा! मुझे उम्मीद है कि आपको अपना लुक पसंद आया होगा। क्या आप एक छोटा सा रिव्यू या फोटो शेयर कर सकते हैं? इससे मेरे बिजनेस को बढ़ने में मदद मिलेगी! - ${artistName}`,
            client_name: booking.clientName,
            client_phone: booking.clientPhone,
            date: booking.date
          });
        }
      }
      
      // 2. Review request for bookings from 3 days ago
      const threeDaysAgo = subDays(today, 3);
      if (isSameDay(bookingDate, threeDaysAgo)) {
        const id = `review-${booking.clientName}-${format(bookingDate, 'yyyy-MM-dd')}`;
        if (!nudges.some(n => n.id === id)) {
          nudges.push({
            id,
            type: 'review_request',
            title_en: "Ask for Review: " + booking.clientName,
            title_hi: "रिव्यू मांगें: " + booking.clientName,
            message_en: `It's been 3 days since ${booking.clientName}'s session. Perfect time to ask for a Google/Instagram review!`,
            message_hi: `${booking.clientName} के सेशन को 3 दिन हो गए हैं। गूगल या इंस्टाग्राम पर रिव्यू मांगने का यह सही समय है!`,
            whatsapp_text_en: `Hi ${booking.clientName}, hope you're doing well! If you enjoyed my service, I'd love it if you could leave a review on my profile. Your support means a lot! - ${artistName}`,
            whatsapp_text_hi: `नमस्ते ${booking.clientName}, आशा है कि आप ठीक होंगे! अगर आपको मेरी सर्विस पसंद आई, तो मुझे खुशी होगी अगर आप मेरे प्रोफाइल पर एक रिव्यू दे सकें। आपका सपोर्ट मेरे लिए बहुत मायने रखता है! - ${artistName}`,
            client_name: booking.clientName,
            client_phone: booking.clientPhone,
            date: booking.date
          });
        }
      }

      // 3. Upcoming event reminder (for tomorrow)
      const tomorrow = subDays(today, -1);
      if (isSameDay(bookingDate, tomorrow)) {
        const id = `reminder-${booking.clientName}-${format(bookingDate, 'yyyy-MM-dd')}`;
        if (!nudges.some(n => n.id === id)) {
          nudges.push({
            id,
            type: 'upcoming_reminder',
            title_en: "Reminder: " + booking.clientName,
            title_hi: "रिमाइंडर: " + booking.clientName,
            message_en: `${booking.clientName} has a session tomorrow. Send a quick reminder?`,
            message_hi: `${booking.clientName} का कल सेशन है। क्या आप उन्हें एक रिमाइंडर भेजना चाहेंगे?`,
            whatsapp_text_en: `Hi ${booking.clientName}, just a quick reminder for our session tomorrow! I'm looking forward to it. See you then! - ${artistName}`,
            whatsapp_text_hi: `नमस्ते ${booking.clientName}, कल के हमारे सेशन के लिए एक छोटा सा रिमाइंडर! मैं इसके लिए बहुत उत्साहित हूँ। कल मिलते हैं! - ${artistName}`,
            client_name: booking.clientName,
            client_phone: booking.clientPhone,
            date: booking.date
          });
        }
      }
    });

    // Sort nudges by date (most recent first) and return only the most relevant nudges (limit to 2)
    return nudges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2);
  }
};
