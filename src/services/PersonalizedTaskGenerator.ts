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
        title_hi: "Apni services promote karein",
        body_en: "Promote your makeup services today by posting a bridal look on Instagram.",
        body_hi: "Aaj Instagram par bridal makeup post karein aur naye clients attract karein.",
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
        title_hi: "Apna kaam dikhayein",
        body_en: "You had many clients recently. Post a transformation reel to showcase your work.",
        body_hi: "Haal hi mein aapke kai clients rahe hain. Apne kaam ka transformation reel post karein.",
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
          title_hi: "Review maangein",
          body_en: "Ask yesterday’s client for a review to build trust with new customers.",
          body_hi: "Kal ke client se review maangein taaki naye clients ka bharosa badhe.",
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
        title_hi: "Bridal Promotion",
        body_en: "Promote your bridal package today to attract wedding clients.",
        body_hi: "Aaj apne bridal package ko promote karein taaki shaadi ke clients mil sakein.",
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
        title_hi: "Loyalty Offer",
        body_en: "Send a loyalty offer to your repeat clients.",
        body_hi: "Apne purane clients ko loyalty offer bhejein.",
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
      title_hi: "Apna portfolio update karein",
      body_en: "Add your latest work to your portfolio to attract more clients.",
      body_hi: "Zyada clients ko attract karne ke liye apne portfolio mein apna latest kaam jodein.",
      trigger_type: "generic",
      points: 10
    };
  }
}
