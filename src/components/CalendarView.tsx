import React, { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWeekend,
  getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  bookings: Booking[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  bookings, 
  currentMonth, 
  onMonthChange, 
  onDateSelect 
}) => {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(new Date(b.date), day));
  };

  const isWeddingSeason = (date: Date) => {
    const month = getMonth(date);
    // Nov (10) to Feb (1)
    return month === 10 || month === 11 || month === 0 || month === 1;
  };

  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-50">
        <h2 className="text-lg font-bold text-slate-900">
          {format(currentMonth, 'MMMM yyyy')}
          {isWeddingSeason(currentMonth) && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-600 uppercase tracking-wider">
              Wedding Season
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-slate-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayBookings = getBookingsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isBusy = dayBookings.length > 0;
          const isSoldOut = dayBookings.length >= 2; // Artist defined "Sold Out" as 2+ bookings
          const isWeekendDay = isWeekend(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={`
                relative h-24 p-2 border-r border-b border-slate-50 transition-all hover:bg-slate-50 text-left flex flex-col gap-1
                ${!isCurrentMonth ? 'bg-slate-50/50 opacity-30' : ''}
                ${isToday ? 'bg-indigo-50/30' : ''}
              `}
            >
              <span className={`
                text-sm font-bold 
                ${isToday ? 'text-indigo-600' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}
              `}>
                {format(day, 'd')}
              </span>

              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {isSoldOut ? (
                  <div className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm w-fit tracking-tighter">
                    Sold Out
                  </div>
                ) : isBusy ? (
                  <div className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm w-fit tracking-tighter">
                    {dayBookings.length} Booking{dayBookings.length > 1 ? 's' : ''}
                  </div>
                ) : isWeekendDay && isWeddingSeason(day) ? (
                  <div className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter opacity-60">
                    High Demand
                  </div>
                ) : null}

                {/* Dots for bookings */}
                <div className="flex gap-0.5 mt-auto">
                  {dayBookings.map((b, i) => (
                    <div 
                      key={b.booking_id || i} 
                      className={`w-1.5 h-1.5 rounded-full ${
                        b.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-50/50 flex flex-wrap gap-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Confirmed
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="w-3 h-3 rounded-full bg-amber-500" /> Inquiry
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="w-3 h-1 bg-rose-200 rounded-sm" /> Sold Out (2+ Bookings)
        </div>
      </div>
    </div>
  );
};
