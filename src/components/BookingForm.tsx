import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  Filter,
  MoreVertical,
  ArrowLeft,
  LayoutList,
  CalendarDays,
  X,
  Camera,
  FileText,
  Clock,
  MapPin,
  Search,
  Check,
  ChevronDown,
  IndianRupee,
  Loader2,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { saveBooking, searchClients } from '../services/bookingService';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Booking, Service, BookingService, Client } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BookingFormProps {
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
  language: 'en' | 'hi';
  translations: any;
  initialDate?: string;
  mode?: 'create' | 'complete';
  initialData?: Booking;
}

const LAST_PRICES_KEY = 'glamour_growth_service_prices';

export default function BookingForm({ 
  onClose, 
  onSuccess, 
  language, 
  translations: t, 
  initialDate,
  mode = 'create',
  initialData
}: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [lastUsedPrices, setLastUsedPrices] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const saved = localStorage.getItem(LAST_PRICES_KEY);
    if (saved) {
      try {
        setLastUsedPrices(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing last used prices:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  const [formData, setFormData] = useState({
    booking_id: initialData?.booking_id || '',
    client_id: initialData?.client_id || '',
    client_name: initialData?.client_name || '',
    client_phone: initialData?.client_phone || '',
    date: initialData?.date || initialDate || new Date().toISOString().split('T')[0],
    time: initialData?.time || '',
    location: initialData?.location || '',
    status: mode === 'complete' ? 'completed' : (initialData?.status || 'confirmed') as Booking['status'],
    advance_paid: initialData?.advance_paid || 0,
    selectedServices: initialData?.services || [] as BookingService[],
    sessionNotes: initialData?.sessionNotes || '',
    photos: initialData?.photos || [] as string[]
  });

  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  const getTimelineEvents = () => {
    const events = [];
    if (initialData?.created_at) {
      events.push({
        label: "Appointment Created",
        date: initialData.created_at.toDate ? initialData.created_at.toDate() : new Date(initialData.created_at),
        icon: <Plus className="w-3 h-3" />,
        color: "bg-blue-500"
      });
    }
    if (initialData?.status === 'confirmed') {
      events.push({
        label: "Appointment Confirmed",
        date: initialData.updated_at?.toDate ? initialData.updated_at.toDate() : new Date(),
        icon: <CheckCircle2 className="w-3 h-3" />,
        color: "bg-premium-gold"
      });
    }
    if (initialData?.status === 'completed') {
      events.push({
        label: "Appointment Completed",
        date: initialData.updated_at?.toDate ? initialData.updated_at.toDate() : new Date(),
        icon: <CheckCircle2 className="w-3 h-3" />,
        color: "bg-green-500"
      });
    }
    if (initialData?.status === 'cancelled') {
      events.push({
        label: "Appointment Cancelled",
        date: initialData.updated_at?.toDate ? initialData.updated_at.toDate() : new Date(),
        icon: <X className="w-3 h-3" />,
        color: "bg-red-500"
      });
    }
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timelineEvents = useMemo(() => getTimelineEvents(), [initialData]);

  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    };

    if (showClientSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientSuggestions]);

  const handleClientNameChange = (name: string) => {
    setFormData({ ...formData, client_name: name, client_id: '' }); // Reset client_id if name changes manually
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (name.length >= 2) {
      setIsSearchingClients(true);
      setShowClientSuggestions(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Use the API endpoint for searching
          const response = await fetch(`/api/clients/search?query=${encodeURIComponent(name)}`);
          if (response.ok) {
            const data = await response.json();
            setClientSuggestions(data);
          } else {
            // Fallback to direct service call if API fails
            const data = await searchClients(name);
            setClientSuggestions(data || []);
          }
        } catch (error) {
          console.error('Error searching clients:', error);
        } finally {
          setIsSearchingClients(false);
        }
      }, 300);
    } else {
      setClientSuggestions([]);
      setShowClientSuggestions(false);
    }
  };

  const selectClient = (client: Client) => {
    setFormData({
      ...formData,
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone || ''
    });
    setShowClientSuggestions(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (phone: string) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, client_phone: digits });
    if (digits && digits.length !== 10) {
      setPhoneError(t.invalidPhone || "Please enter a valid 10-digit phone number");
    } else {
      setPhoneError('');
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Try to fetch from Firestore if services collection exists, 
        // otherwise fallback to defaults as requested in Step 1
        const querySnapshot = await getDocs(collection(db, 'services'));
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs.map(doc => ({
            service_id: doc.id,
            ...doc.data()
          })) as Service[];
          setServices(data);
        } else {
          // Fallback to defaults
          const mockServices: Service[] = [
            { service_id: 'pedicure_id', name: 'Pedicure', default_price: 600, category: 'Nails' },
            { service_id: 'manicure_id', name: 'Manicure', default_price: 700, category: 'Nails' },
            { service_id: 'waxing_id', name: 'Waxing', default_price: 1200, category: 'Hair Removal' },
            { service_id: 'threading_id', name: 'Threading', default_price: 200, category: 'Hair Removal' },
            { service_id: 'makeup_id', name: 'Party Makeup', default_price: 2500, category: 'Makeup' },
            { service_id: 'bridal_makeup_id', name: 'Bridal Makeup', default_price: 15000, category: 'Makeup' },
            { service_id: 'facial_id', name: 'Facial', default_price: 1500, category: 'Skin Care' },
            { service_id: 'hair_styling_id', name: 'Hair Styling', default_price: 1000, category: 'Hair' },
          ];
          setServices(mockServices);
        }
      } catch (error) {
        console.error('Failed to fetch services', error);
        // Fallback to defaults
        const mockServices: Service[] = [
          { service_id: 'pedicure_id', name: 'Pedicure', default_price: 600, category: 'Nails' },
          { service_id: 'manicure_id', name: 'Manicure', default_price: 700, category: 'Nails' },
          { service_id: 'waxing_id', name: 'Waxing', default_price: 1200, category: 'Hair Removal' },
          { service_id: 'threading_id', name: 'Threading', default_price: 200, category: 'Hair Removal' },
          { service_id: 'makeup_id', name: 'Party Makeup', default_price: 2500, category: 'Makeup' },
          { service_id: 'bridal_makeup_id', name: 'Bridal Makeup', default_price: 15000, category: 'Makeup' },
          { service_id: 'facial_id', name: 'Facial', default_price: 1500, category: 'Skin Care' },
          { service_id: 'hair_styling_id', name: 'Hair Styling', default_price: 1000, category: 'Hair' },
        ];
        setServices(mockServices);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [services, searchQuery]);

  const toggleService = (service: Service) => {
    const isSelected = formData.selectedServices.some(s => s.service_id === service.service_id);
    
    if (isSelected) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter(s => s.service_id !== service.service_id)
      });
    } else {
      // Use last used price from state or fallback to default
      const price = lastUsedPrices[service.service_id] ?? service.default_price;

      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, {
          service_id: service.service_id,
          name: service.name,
          price: price
        }]
      });
    }
  };

  const updateServicePrice = (serviceId: string, newPrice: number) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.map(s => 
        s.service_id === serviceId ? { ...s, price: newPrice } : s
      )
    });
  };

  const removeService = (serviceId: string) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.filter(s => s.service_id !== serviceId)
    });
  };

  const totalAmount = useMemo(() => {
    return formData.selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [formData.selectedServices]);

  const handleSubmit = async () => {
    if (!formData.client_name || formData.selectedServices.length === 0) return;
    
    if (!validatePhone(formData.client_phone)) {
      setPhoneError(t.invalidPhone || "Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    try {
        const result = await saveBooking({
        booking_id: formData.booking_id || undefined,
        client_id: formData.client_id || undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        status: formData.status,
        advance_paid: formData.advance_paid,
        services: formData.selectedServices,
        total_amount: totalAmount,
        previous_total_amount: initialData?.total_amount || 0,
        sessionNotes: formData.sessionNotes,
        photos: formData.photos
      });

      const booking: Booking = {
        booking_id: result.booking_id,
        client_id: formData.client_id || undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        status: formData.status,
        advance_paid: formData.advance_paid,
        services: formData.selectedServices,
        total_amount: totalAmount,
        sessionNotes: formData.sessionNotes,
        photos: formData.photos
      };
      
      // Save last used prices to localStorage and state
      const savedPricesRaw = localStorage.getItem(LAST_PRICES_KEY);
      const prices = savedPricesRaw ? JSON.parse(savedPricesRaw) : {};
      formData.selectedServices.forEach(s => {
        prices[s.service_id] = s.price;
      });
      localStorage.setItem(LAST_PRICES_KEY, JSON.stringify(prices));
      setLastUsedPrices(prices);

      onSuccess(booking);
      onClose();
    } catch (error) {
      console.error('Failed to save booking', error);
      const message = error instanceof Error ? error.message : 'Failed to save booking';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-premium-ink/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] lg:rounded-[56px] shadow-3xl overflow-hidden border border-premium-border max-h-[90vh] flex flex-col"
      >
        <div className="p-8 lg:p-12 space-y-8 lg:space-y-10 overflow-y-auto flex-1">
          <header className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl lg:text-3xl font-serif font-medium italic">
                {mode === 'complete' ? t.completeAppointment : t.recordNewAppointment}
              </h3>
              <p className="text-[#666] text-base lg:text-lg font-light italic mt-1 lg:mt-2">
                {mode === 'complete' ? t.completeAppointmentSub : t.recordNewAppointmentSub}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-premium-bg rounded-full transition-colors">
              <X className="w-6 h-6 text-[#8E8E8E]" />
            </button>
          </header>

          {/* Tabs for Details vs Timeline */}
          {mode !== 'create' && (
            <div className="flex border-b border-premium-border">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                  activeTab === 'details' ? "text-premium-ink" : "text-[#8E8E8E] hover:text-premium-ink"
                )}
              >
                Details
                {activeTab === 'details' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-premium-gold" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  "px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                  activeTab === 'timeline' ? "text-premium-ink" : "text-[#8E8E8E] hover:text-premium-ink"
                )}
              >
                Timeline
                {activeTab === 'timeline' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-premium-gold" />
                )}
              </button>
            </div>
          )}

          {activeTab === 'timeline' ? (
            <div className="space-y-8 py-4">
              {timelineEvents.map((event, idx) => (
                <div key={idx} className="relative pl-10">
                  {idx !== timelineEvents.length - 1 && (
                    <div className="absolute left-[15px] top-6 bottom-[-32px] w-0.5 bg-slate-100" />
                  )}
                  <div className={cn(
                    "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm z-10",
                    event.color
                  )}>
                    {event.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-premium-ink">{event.label}</h4>
                    <p className="text-[10px] text-[#8E8E8E] font-medium uppercase tracking-wider mt-1">
                      {format(event.date, 'PPP p')}
                    </p>
                  </div>
                </div>
              ))}
              
              {mode === 'complete' && initialData?.status !== 'completed' && (
                <div className="relative pl-10 opacity-50">
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 italic">Completing Appointment...</h4>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 lg:space-y-8">
            {/* Client Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2 lg:space-y-3 relative" ref={clientDropdownRef}>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <User className="w-3 h-3 text-premium-gold" />
                  {t.clientName}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={t.clientNamePlaceholder}
                    value={formData.client_name}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    onFocus={() => {
                      if (formData.client_name.length >= 2) setShowClientSuggestions(true);
                    }}
                    className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                  />
                  {isSearchingClients && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-premium-gold" />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showClientSuggestions && (clientSuggestions.length > 0 || !isSearchingClients) && formData.client_name.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-20 w-full mt-2 bg-white border border-premium-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                    >
                      {clientSuggestions.length > 0 ? (
                        clientSuggestions.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => selectClient(client)}
                            className="p-4 hover:bg-premium-bg cursor-pointer transition-colors border-b border-premium-border last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{client.name}</span>
                              {client.phone && (
                                <span className="text-xs text-[#8E8E8E] flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {client.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : !isSearchingClients && (
                        <div className="p-4 text-center text-xs text-[#8E8E8E] italic">
                          No existing client found.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Phone className="w-3 h-3 text-premium-gold" />
                  {t.clientPhone || "Client Phone"}
                </label>
                <input 
                  type="tel" 
                  placeholder="98XXXXXXXX"
                  value={formData.client_phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={cn(
                    "w-full p-4 lg:p-5 rounded-2xl border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base transition-colors",
                    phoneError ? "border-red-500 focus:border-red-500" : "border-premium-border focus:border-premium-gold"
                  )}
                />
                {phoneError && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1">
                    {phoneError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-premium-gold" />
                  {t.date}
                </label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                />
              </div>
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Clock className="w-3 h-3 text-premium-gold" />
                  {t.time || "Time"}
                </label>
                <input 
                  type="time" 
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Check className="w-3 h-3 text-premium-gold" />
                  {t.status || "Status"}
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Booking['status'] })}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base appearance-none"
                >
                  <option value="inquiry">Inquiry</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed / Income</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <IndianRupee className="w-3 h-3 text-premium-gold" />
                  {t.advancePaid || "Advance Paid"}
                </label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={formData.advance_paid}
                  onChange={(e) => setFormData({ ...formData, advance_paid: Number(e.target.value) })}
                  readOnly={mode === 'complete'}
                  className={cn(
                    "w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base",
                    mode === 'complete' && "opacity-60 cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2 lg:space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                <Plus className="w-3 h-3 text-premium-gold" />
                {t.location || "Location / Venue"}
              </label>
              <input 
                type="text" 
                placeholder="Studio or Client Address"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
              />
            </div>

            {/* Service Multi-select */}
            <div className="space-y-2 lg:space-y-3 relative" ref={dropdownRef}>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectServices || "Select Services"}</label>
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg flex items-center justify-between cursor-pointer hover:border-premium-gold transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Search className="w-4 h-4 text-[#8E8E8E] shrink-0" />
                    {formData.selectedServices.length > 0 ? (
                      <div className="flex gap-1 overflow-hidden">
                        {formData.selectedServices.map(s => (
                          <span key={s.service_id} className="px-2 py-0.5 bg-premium-ink text-white text-[10px] rounded-full whitespace-nowrap">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#8E8E8E] text-sm lg:text-base">{t.searchServices || "Search services..."}</span>
                    )}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-[#8E8E8E] transition-transform", isDropdownOpen && "rotate-180")} />
                </div>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-premium-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                    >
                      <div className="p-2 border-b border-premium-border">
                        <input 
                          autoFocus
                          type="text"
                          placeholder={t.searchServices || "Search services..."}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsDropdownOpen(false);
                            }
                          }}
                          className="w-full p-3 rounded-xl bg-premium-bg focus:outline-none text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="p-1">
                        {loadingServices ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-premium-gold" />
                          </div>
                        ) : filteredServices.length > 0 ? (
                          filteredServices.map(service => {
                            const isSelected = formData.selectedServices.some(s => s.service_id === service.service_id);
                            return (
                              <div 
                                key={service.service_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleService(service);
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors",
                                  isSelected ? "bg-premium-bg" : "hover:bg-premium-bg/50"
                                )}
                              >
                                <div>
                                  <p className="text-sm font-medium">{service.name}</p>
                                  <p className="text-[10px] text-[#8E8E8E]">{service.category}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold flex items-center">
                                    <IndianRupee className="w-2.5 h-2.5" />
                                    {lastUsedPrices[service.service_id] ?? service.default_price}
                                  </span>
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                    isSelected ? "bg-premium-ink border-premium-ink" : "border-premium-border"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-[#8E8E8E] italic">
                            No services found
                          </div>
                        )}
                      </div>
                      <div className="p-2 border-t border-premium-border bg-premium-bg/30">
                        <button 
                          onClick={() => setIsDropdownOpen(false)}
                          className="w-full py-2 bg-premium-ink text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors"
                        >
                          {t.done || "Done"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Service Cart */}
            {formData.selectedServices.length > 0 && (
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectedServices || "Selected Services"}</label>
                <div className="space-y-3">
                  {formData.selectedServices.map(service => (
                    <motion.div 
                      layout
                      key={service.service_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-premium-bg rounded-2xl border border-premium-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-bold">{service.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative w-24">
                          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-premium-gold" />
                          <input 
                            type="number"
                            value={service.price}
                            onChange={(e) => updateServicePrice(service.service_id, Number(e.target.value))}
                            className="w-full p-2 pl-6 rounded-lg border border-premium-border bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-premium-gold/30"
                          />
                        </div>
                        <button 
                          onClick={() => removeService(service.service_id)}
                          className="p-1.5 text-[#8E8E8E] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-premium-border space-y-3">
                  <div className="flex justify-between items-center text-[#8E8E8E]">
                    <span className="text-xs uppercase tracking-widest font-bold">{t.totalAmount || "Total Amount"}</span>
                    <span className="text-lg font-serif font-bold flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[#8E8E8E]">
                    <span className="text-xs uppercase tracking-widest font-bold">{t.advancePaid || "Advance Paid"}</span>
                    <span className="text-lg font-serif font-bold flex items-center gap-1 text-premium-gold">
                      - <IndianRupee className="w-4 h-4" />
                      {formData.advance_paid.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-dashed border-premium-border flex justify-between items-center">
                    <span className="text-sm font-bold uppercase tracking-widest text-premium-ink">
                      {mode === 'complete' ? (t.balanceToCollect || "Balance to Collect") : (t.balanceDue || "Balance Due")}
                    </span>
                    <span className={cn(
                      "text-2xl lg:text-3xl font-serif font-bold flex items-center gap-1",
                      mode === 'complete' ? "text-green-600" : "text-premium-ink"
                    )}>
                      <IndianRupee className="w-5 h-5 lg:w-6 lg:h-6" />
                      {(totalAmount - formData.advance_paid).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 lg:space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                <Camera className="w-3 h-3 text-premium-gold" />
                {t.photos || "Session Photos"} <span className="text-[8px] opacity-60">(Optional)</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-premium-border">
                    <img src={photo} alt="Session" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) })}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <div className="flex flex-col gap-2">
                  <label className="flex-1 aspect-square rounded-xl border-2 border-dashed border-premium-border flex flex-col items-center justify-center gap-1 hover:border-premium-gold hover:bg-premium-bg transition-all group cursor-pointer">
                    <Camera className="w-5 h-5 text-[#8E8E8E] group-hover:text-premium-gold" />
                    <span className="text-[8px] text-[#8E8E8E] font-bold group-hover:text-premium-gold uppercase">Camera</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, photos: [...formData.photos, reader.result as string] });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <label className="flex-1 aspect-square rounded-xl border-2 border-dashed border-premium-border flex flex-col items-center justify-center gap-1 hover:border-premium-gold hover:bg-premium-bg transition-all group cursor-pointer">
                    <Plus className="w-5 h-5 text-[#8E8E8E] group-hover:text-premium-gold" />
                    <span className="text-[8px] text-[#8E8E8E] font-bold group-hover:text-premium-gold uppercase">Gallery</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, photos: [...formData.photos, reader.result as string] });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2 lg:space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                <FileText className="w-3 h-3 text-premium-gold" />
                {t.sessionNotes || "Session Notes"} <span className="text-[8px] opacity-60">(Optional)</span>
              </label>
              <textarea 
                placeholder="Add details about skin type, products used, or client preferences for this session..."
                value={formData.sessionNotes}
                onChange={(e) => setFormData({ ...formData, sessionNotes: e.target.value })}
                className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base min-h-[100px] resize-none"
              />
            </div>
            </div>
          )}
        </div>

        <div className="p-8 lg:p-12 border-t border-premium-border bg-premium-bg/30 flex flex-col lg:flex-row gap-4 lg:gap-6">
          <button 
            onClick={onClose}
            className="order-2 lg:order-1 flex-1 px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold text-[#666] hover:bg-premium-bg transition-colors text-sm lg:text-base"
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.client_name || formData.selectedServices.length === 0}
            className="order-1 lg:order-2 flex-1 bg-premium-ink text-white px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold hover:bg-[#333] transition-all shadow-2xl shadow-black/10 text-sm lg:text-base disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (mode === 'complete' ? t.completeAppointment : t.saveAppointment)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
