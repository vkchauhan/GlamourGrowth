import { BookingInsights, DailyGrowthTask } from "../types";
import { differenceInDays, parseISO } from "date-fns";

export class PersonalizedTaskGenerator {
  static generate(insights: BookingInsights, genericTasks: DailyGrowthTask[]): Partial<DailyGrowthTask> {
    // Logic based on requirements
    
    // 1. No bookings this week
    if (insights.bookings_last_7_days === 0) {
      return {
        task_id: "insight_no_bookings_7d",
        title_en: "Promote your services",
        title_hi: "अपनी सेवाओं को प्रमोट करें",
        body_en: "Promote your makeup services today by posting a bridal look on Instagram.",
        body_hi: "आज इंस्टाग्राम पर ब्राइडल मेकअप पोस्ट करें और नए क्लाइंट आकर्षित करें।",
        trigger_type: "booking_insight",
        trigger_condition: "no_recent_bookings",
        points: 10
      };
    }

    // 2. Many bookings recently
    if (insights.bookings_last_30_days > 5) {
      return {
        task_id: "insight_many_bookings_30d",
        title_en: "Showcase your work",
        title_hi: "अपना काम दिखाएं",
        body_en: "You had many clients recently. Post a transformation reel to showcase your work.",
        body_hi: "हाल ही में आपके कई क्लाइंट रहे हैं। अपने काम का ट्रांसफॉर्मेशन रील पोस्ट करें।",
        trigger_type: "booking_insight",
        trigger_condition: "high_activity",
        points: 10
      };
    }

    // 3. Last booking was yesterday
    if (insights.last_booking_date) {
      const daysSinceLast = differenceInDays(new Date(), parseISO(insights.last_booking_date));
      if (daysSinceLast === 1) {
        return {
          task_id: "insight_last_booking_yesterday",
          title_en: "Ask for a review",
          title_hi: "रिव्यू मांगें",
          body_en: "Ask yesterday’s client for a review to build trust with new customers.",
          body_hi: "कल के क्लाइंट से रिव्यू मांगें ताकि नए क्लाइंट का भरोसा बढ़े।",
          trigger_type: "booking_insight",
          trigger_condition: "last_booking_yesterday",
          points: 10
        };
      }
    }

    // 4. Most common service is Bridal
    if (insights.most_common_service?.toLowerCase().includes("bridal")) {
      return {
        task_id: "insight_bridal_focus",
        title_en: "Bridal Promotion",
        title_hi: "ब्राइडल प्रमोशन",
        body_en: "Promote your bridal package today to attract wedding clients.",
        body_hi: "आज अपने ब्राइडल पैकेज को प्रमोट करें ताकि शादी के क्लाइंट मिल सकें।",
        trigger_type: "booking_insight",
        trigger_condition: "bridal_focus",
        points: 10
      };
    }

    // 5. Repeat clients
    if (insights.repeat_clients_count > 2) {
      return {
        task_id: "insight_loyalty",
        title_en: "Loyalty Offer",
        title_hi: "लॉयल्टी ऑफर",
        body_en: "Send a loyalty offer to your repeat clients.",
        body_hi: "अपने पुराने क्लाइंट को लॉयल्टी ऑफर भेजें।",
        trigger_type: "booking_insight",
        trigger_condition: "repeat_clients",
        points: 10
      };
    }

    // Fallback to generic tasks
    if (genericTasks.length > 0) {
      const randomIndex = Math.floor(Math.random() * genericTasks.length);
      return genericTasks[randomIndex];
    }

    // Absolute fallback
    return {
      task_id: "generic_fallback",
      title_en: "Update your portfolio",
      title_hi: "अपना पोर्टफोलियो अपडेट करें",
      body_en: "Add your latest work to your portfolio to attract more clients.",
      body_hi: "अधिक क्लाइंट्स को आकर्षित करने के लिए अपने पोर्टफोलियो में अपना नवीनतम काम जोड़ें।",
      trigger_type: "generic",
      points: 10
    };
  }
}
