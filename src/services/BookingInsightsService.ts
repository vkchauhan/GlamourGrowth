import { Booking, BookingInsights } from "../types";
import { differenceInDays, parseISO, isAfter, subDays } from "date-fns";

export class BookingInsightsService {
  static analyze(bookings: Booking[]): BookingInsights {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    const recent7 = bookings.filter(b => isAfter(parseISO(b.date), sevenDaysAgo));
    const recent30 = bookings.filter(b => isAfter(parseISO(b.date), thirtyDaysAgo));

    // Most common service
    const serviceCounts: Record<string, number> = {};
    bookings.forEach(b => {
      b.services.forEach(s => {
        const name = s.name || "Unknown";
        serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      });
    });

    let mostCommonService = null;
    let maxCount = 0;
    for (const [name, count] of Object.entries(serviceCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonService = name;
      }
    }

    // Repeat clients
    const clientBookings: Record<string, number> = {};
    bookings.forEach(b => {
      const key = b.client_phone || b.client_name;
      clientBookings[key] = (clientBookings[key] || 0) + 1;
    });
    const repeatClientsCount = Object.values(clientBookings).filter(count => count > 1).length;

    // Specific categories
    const bridalCount = recent30.filter(b => 
      b.services.some(s => s.name?.toLowerCase().includes("bridal"))
    ).length;

    const partyCount = recent30.filter(b => 
      b.services.some(s => s.name?.toLowerCase().includes("party"))
    ).length;

    // Last booking date
    const sortedBookings = [...bookings].sort((a, b) => 
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );
    const lastBookingDate = sortedBookings.length > 0 ? sortedBookings[0].date : null;

    return {
      bookings_last_7_days: recent7.length,
      bookings_last_30_days: recent30.length,
      last_booking_date: lastBookingDate,
      most_common_service: mostCommonService,
      repeat_clients_count: repeatClientsCount,
      bridal_bookings_last_30_days: bridalCount,
      party_makeup_last_30_days: partyCount
    };
  }
}
