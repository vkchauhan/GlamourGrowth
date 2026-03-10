import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  ChevronDown, 
  IndianRupee, 
  X,
  Loader2,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Service, BookingService, Booking } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BookingFormProps {
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
  language: 'en' | 'hi';
  translations: any;
}

export default function BookingForm({ onClose, onSuccess, language, translations: t }: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    date: new Date().toISOString().split('T')[0],
    selectedServices: [] as BookingService[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          setServices(data);
        } else {
          // Fallback to defaults if API fails
          const mockServices: Service[] = [
            { service_id: 'pedicure_id', name: 'Pedicure', default_price: 800, category: 'Nails' },
            { service_id: 'manicure_id', name: 'Manicure', default_price: 700, category: 'Nails' },
            { service_id: 'waxing_id', name: 'Waxing', default_price: 1200, category: 'Hair Removal' },
            { service_id: 'threading_id', name: 'Threading', default_price: 200, category: 'Hair Removal' },
            { service_id: 'makeup_id', name: 'Party Makeup', default_price: 2500, category: 'Makeup' },
            { service_id: 'bridal_makeup_id', name: 'Bridal Makeup', default_price: 15000, category: 'Makeup' },
          ];
          setServices(mockServices);
        }
      } catch (error) {
        console.error('Failed to fetch services', error);
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
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, {
          service_id: service.service_id,
          name: service.name,
          price: service.default_price
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

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          date: formData.date,
          services: formData.selectedServices
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save booking');
      }

      const result = await response.json();
      
      const booking: Booking = {
        booking_id: result.booking_id,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        date: formData.date,
        services: formData.selectedServices,
        total_amount: result.total_amount
      };
      
      onSuccess(booking);
      onClose();
    } catch (error) {
      console.error('Failed to save booking', error);
      alert('Failed to save booking. Please try again.');
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
              <h3 className="text-2xl lg:text-3xl font-serif font-medium italic">{t.recordNewBooking}</h3>
              <p className="text-[#666] text-base lg:text-lg font-light italic mt-1 lg:mt-2">{t.recordNewBookingSub}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-premium-bg rounded-full transition-colors">
              <X className="w-6 h-6 text-[#8E8E8E]" />
            </button>
          </header>

          <div className="space-y-6 lg:space-y-8">
            {/* Client Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2 lg:space-y-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <User className="w-3 h-3 text-premium-gold" />
                  {t.clientName}
                </label>
                <input 
                  type="text" 
                  placeholder={t.clientNamePlaceholder}
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                />
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
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                />
              </div>
            </div>

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

            {/* Service Multi-select */}
            <div className="space-y-2 lg:space-y-3 relative">
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
                                    {service.default_price}
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
                
                <div className="pt-4 border-t border-premium-border flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#8E8E8E]">{t.totalAmount || "Total Amount"}</span>
                  <span className="text-2xl font-serif font-bold flex items-center gap-1">
                    <IndianRupee className="w-5 h-5 text-premium-gold" />
                    {totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>
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
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t.saveBooking}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
