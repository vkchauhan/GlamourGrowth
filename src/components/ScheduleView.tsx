import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Filter,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { Booking } from '../types';
import { subscribeToUpcomingBookings, updateBookingStatus } from '../services/bookingService';
import { format, parseISO, isToday, isTomorrow, addDays, startOfToday } from 'date-fns';

interface ScheduleViewProps {
  onBack: () => void;
  onAddBooking: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onBack, onAddBooking }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'inquiry'>('all');

  useEffect(() => {
    const unsubscribe = subscribeToUpcomingBookings((data) => {
      setBookings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const getDayLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  const handleStatusChange = async (id: string, status: Booking['status']) => {
    if (id) {
      await updateBookingStatus(id, status);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Schedule</h1>
          </div>
          <button 
            onClick={onAddBooking}
            className="bg-indigo-600 text-white p-2 rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'confirmed', 'inquiry'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Loading your schedule...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <CalendarIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No upcoming appointments</h3>
            <p className="text-slate-500 mb-8 max-w-xs">
              Your schedule is clear! Start recording new bookings to see them here.
            </p>
            <button
              onClick={onAddBooking}
              className="bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-all"
            >
              Add New Booking
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group by date */}
            {Array.from(new Set(filteredBookings.map(b => b.date))).sort().map(date => (
              <div key={date} className="space-y-3">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  {getDayLabel(date)}
                </h2>
                
                <div className="space-y-3">
                  {filteredBookings.filter(b => b.date === date).map(booking => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={booking.booking_id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                            {booking.client_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{booking.client_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {booking.time || 'Time not set'}
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{booking.location || 'At Studio'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{booking.client_phone || 'No phone'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="text-xs font-medium text-slate-400">
                          {booking.services.length} Services • ₹{booking.total_amount}
                        </div>
                        <div className="flex gap-2">
                          {booking.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(booking.booking_id!, 'completed')}
                              className="flex items-center gap-1 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Mark Done
                            </button>
                          )}
                          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
