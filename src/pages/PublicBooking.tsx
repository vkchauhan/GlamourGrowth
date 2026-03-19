import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, Phone, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';

interface Service {
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price: number;
}

interface Artist {
  name: string;
  city: string;
}

import { getServices, getAvailability, saveBooking } from '../services/bookingService';

const PublicBooking: React.FC = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    fetchArtistData();
  }, [artistId]);

  useEffect(() => {
    if (selectedDate && artistId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, artistId, selectedService]);

  const fetchArtistData = async () => {
    try {
      // Mock artist data for now as we don't have an artist collection yet
      setArtist({ name: 'Priya Makeup Artist', city: 'Mumbai' });
      const servicesData = await getServices();
      setServices(servicesData as Service[]);
    } catch (error) {
      console.error('Error fetching artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const availability = await getAvailability();
      const dayOfWeek = selectedDate.getDay();
      const dayConfig = availability?.find((a: any) => a.day_of_week === dayOfWeek);

      if (dayConfig) {
        // Generate slots between start_time and end_time
        const slots = [];
        let current = new Date(`2024-01-01T${dayConfig.start_time}`);
        const end = new Date(`2024-01-01T${dayConfig.end_time}`);
        const duration = selectedService?.duration_minutes || 60;

        while (current < end) {
          slots.push(format(current, 'HH:mm'));
          current = new Date(current.getTime() + duration * 60000);
        }
        setAvailableSlots(slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots(['10:00', '11:00', '12:00', '14:00', '15:00', '16:00']);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await saveBooking({
        client_name: clientName,
        client_phone: clientPhone,
        date: format(selectedDate, 'yyyy-MM-dd'),
        booking_time: selectedTime,
        services: selectedService ? [selectedService] : [],
        price: selectedService?.price || 0,
        artist_id: artistId,
        client_notes: clientNotes.trim()
      });
      setConfirmed(true);
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-8">
            Your appointment with {artist?.name} has been successfully booked. You will receive a confirmation SMS shortly.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service:</span>
              <span className="font-bold text-gray-900">{selectedService?.service_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-bold text-gray-900">{format(selectedDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time:</span>
              <span className="font-bold text-gray-900">{selectedTime}</span>
            </div>
            {clientNotes && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Your Notes:</span>
                <p className="text-xs text-gray-600 italic">"{clientNotes}"</p>
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{artist?.name}</h1>
          <p className="text-gray-500 flex items-center justify-center gap-2">
            Professional Makeup Artist • {artist?.city}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress Bar */}
          <div className="flex h-1 bg-gray-100">
            <div 
              className="bg-indigo-600 transition-all duration-500" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">1</span>
                  Select a Service
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {services.map((service) => (
                    <button
                      key={service.service_id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className={`p-6 rounded-xl border text-left transition-all hover:shadow-md ${
                        selectedService?.service_id === service.service_id
                          ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-900 text-lg">{service.service_name}</span>
                        <span className="text-indigo-600 font-bold">₹{service.price}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock size={14} />
                        {service.duration_minutes} minutes
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">2</span>
                    Choose Date & Time
                  </h2>
                  <button onClick={() => setStep(1)} className="text-indigo-600 text-sm font-medium hover:underline">Change Service</button>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Select Date</label>
                  <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {nextDays.map((day) => (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`flex-shrink-0 w-16 h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSameDay(day, selectedDate)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold opacity-70">{format(day, 'EEE')}</span>
                        <span className="text-lg font-bold">{format(day, 'd')}</span>
                        <span className="text-[10px] uppercase font-bold opacity-70">{format(day, 'MMM')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Available Slots</label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => {
                            setSelectedTime(time);
                            setStep(3);
                          }}
                          className={`py-3 rounded-xl border font-bold transition-all ${
                            selectedTime === time
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No slots available for this date.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm">3</span>
                    Your Details
                  </h2>
                  <button onClick={() => setStep(2)} className="text-indigo-600 text-sm font-medium hover:underline">Change Time</button>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-indigo-700 font-medium">Selected Appointment</span>
                  </div>
                  <div className="flex items-center gap-4 text-indigo-900 font-bold">
                    <div className="flex items-center gap-1"><Calendar size={16} /> {format(selectedDate, 'MMM d')}</div>
                    <div className="flex items-center gap-1"><Clock size={16} /> {selectedTime}</div>
                    <div className="flex items-center gap-1"><ChevronRight size={16} /> {selectedService?.service_name}</div>
                  </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter your mobile number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (Optional)</label>
                    <textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                      placeholder="Any allergies, skin sensitivity, or preferences?"
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] ${clientNotes.length >= 500 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {clientNotes.length}/500
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? <Loader2 className="animate-spin" size={24} /> : 'Confirm Booking'}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    By confirming, you agree to receive an SMS notification.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;
