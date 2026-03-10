import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface Booking {
  booking_id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  service_name: string;
  duration_minutes: number;
  price: number;
  status: string;
}

const DashboardBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const artistId = 'priya-makeup'; // Hardcoded for MVP

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?artist_id=${artistId}`);
      const data = await response.json();
      setBookings(data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => 
    isSameDay(new Date(b.booking_date), selectedDate)
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200">
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-gray-700 min-w-[140px] text-center">
            {format(selectedDate, 'EEE, MMM d, yyyy')}
          </span>
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Week View Mini Calendar */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            className={`p-4 rounded-xl border transition-all ${
              isSameDay(day, selectedDate)
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
            }`}
          >
            <span className="block text-xs uppercase font-bold opacity-70">{format(day, 'EEE')}</span>
            <span className="block text-lg font-bold">{format(day, 'd')}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily View */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Appointments for Today</h3>
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <div
                key={booking.booking_id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex gap-6"
              >
                <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 rounded-lg px-4 py-2 min-w-[100px]">
                  <Clock size={20} className="mb-1" />
                  <span className="font-bold">{booking.booking_time}</span>
                  <span className="text-xs opacity-70">{booking.duration_minutes}m</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-gray-900">{booking.service_name}</h4>
                    <span className="text-indigo-600 font-bold">₹{booking.price}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      {booking.client_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      {booking.client_phone}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No appointments scheduled for this day.</p>
            </div>
          )}
        </div>

        {/* Upcoming List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {bookings
              .filter(b => new Date(`${b.booking_date}T${b.booking_time}`) > new Date())
              .slice(0, 5)
              .map((booking) => (
                <div key={booking.booking_id} className="p-4 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-gray-900">{booking.service_name}</span>
                    <span className="text-xs text-indigo-600 font-medium">{format(new Date(booking.booking_date), 'MMM d')}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock size={12} />
                    {booking.booking_time} • {booking.client_name}
                  </div>
                </div>
              ))}
            {bookings.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">No upcoming bookings</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardBookings;
