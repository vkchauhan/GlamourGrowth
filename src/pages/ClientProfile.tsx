import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  TrendingUp, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  Sparkles, 
  FileText, 
  Camera,
  ChevronRight,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { Client, Booking, Language } from "../types";
import { getClientById, getClientHistory, updateClientProfile } from "../services/bookingService";

interface ClientProfileProps {
  clientId: string;
  onBack: () => void;
  language: Language;
  translations: any;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ clientId, onBack, language, translations: t }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'gallery'>('details');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [clientData, historyData] = await Promise.all([
        getClientById(clientId),
        getClientHistory(clientId)
      ]);
      setClient(clientData);
      setHistory(historyData);
      setEditData(clientData || {});
      setLoading(false);
    };
    fetchData();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    await updateClientProfile(clientId, editData);
    setClient(prev => prev ? { ...prev, ...editData } : null);
    setIsEditing(false);
    setSaving(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-premium-gold animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Opening beauty log...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Client not found</h2>
        <button onClick={onBack} className="text-premium-gold font-bold">Go back</button>
      </div>
    );
  }

  // Extract all photos from history
  const allPhotos = history.flatMap(b => b.photos || []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-premium-ink text-white px-4 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-premium-gold/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-premium-gold/5 rounded-full -ml-24 -mb-24 blur-2xl" />
        
        <div className="flex items-center justify-between relative z-10 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className="flex items-center gap-2 bg-premium-gold text-premium-ink px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-black/20 hover:scale-105 transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {isEditing ? "Save Log" : "Edit Log"}
          </button>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-premium-gold/30 flex items-center justify-center text-premium-gold text-3xl font-black shadow-xl">
            {client.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-white/60 text-sm">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone || "No phone"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              Total Spend
            </div>
            <div className="text-xl font-black text-slate-900">{formatCurrency(client.totalSpend || 0)}</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Heart className="w-3 h-3 text-red-500" />
              Visits
            </div>
            <div className="text-xl font-black text-slate-900">{client.visitCount || 0} Sessions</div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'details' ? 'bg-white text-premium-ink shadow-sm' : 'text-slate-500'}`}
          >
            Beauty Profile
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white text-premium-ink shadow-sm' : 'text-slate-500'}`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'gallery' ? 'bg-white text-premium-ink shadow-sm' : 'text-slate-500'}`}
          >
            Gallery
          </button>
        </div>
      </div>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Skin Type & Preferences */}
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-premium-gold" />
                  Skin & Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Skin Type</label>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editData.skinType || ""}
                        onChange={(e) => setEditData({ ...editData, skinType: e.target.value })}
                        placeholder="e.g. Oily, Dry, Sensitive..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-premium-gold outline-none"
                      />
                    ) : (
                      <p className="text-slate-700 font-medium">{client.skinType || "Not specified"}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Makeup Preferences</label>
                    {isEditing ? (
                      <textarea 
                        value={editData.preferences || ""}
                        onChange={(e) => setEditData({ ...editData, preferences: e.target.value })}
                        placeholder="e.g. Loves gold glitter, prefers matte finish..."
                        rows={3}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-premium-gold outline-none"
                      />
                    ) : (
                      <p className="text-slate-700 font-medium whitespace-pre-wrap">{client.preferences || "No preferences noted"}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Personal Notes */}
              <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-premium-gold" />
                  Personal Notes
                </h3>
                {isEditing ? (
                  <textarea 
                    value={editData.notes || ""}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Any other details about the client..."
                    rows={4}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-premium-gold outline-none"
                  />
                ) : (
                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{client.notes || "No additional notes"}</p>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200"
            >
              {history.length > 0 ? history.map((booking, idx) => (
                <div key={booking.booking_id} className="relative pl-12">
                  {/* Timeline Dot */}
                  <div className={cn(
                    "absolute left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white z-10",
                    booking.status === 'completed' ? "bg-green-500" : 
                    booking.status === 'cancelled' ? "bg-red-500" : "bg-premium-gold"
                  )} />
                  
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-premium-gold transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(booking.date)}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                            booking.status === 'completed' ? "bg-green-100 text-green-700" : 
                            booking.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {booking.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 leading-tight">
                          {booking.services?.map(s => s.name).join(", ") || "General Service"}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900">{formatCurrency(booking.total_amount)}</div>
                        {booking.advance_paid > 0 && (
                          <div className="text-[9px] text-slate-400 font-medium">
                            {booking.status === 'completed' ? "Paid in full" : `₹${booking.advance_paid} advance`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        <span className="truncate">{booking.location || "At Studio"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>{booking.time || "No time set"}</span>
                      </div>
                    </div>

                    {booking.sessionNotes && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border-l-2 border-premium-gold">
                        <p className="text-[11px] text-slate-600 leading-relaxed italic">
                          "{booking.sessionNotes}"
                        </p>
                      </div>
                    )}

                    {booking.photos && booking.photos.length > 0 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                        {booking.photos.map((photo, pIdx) => (
                          <img 
                            key={pIdx} 
                            src={photo} 
                            alt="Session" 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-100" 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">No appointment history yet.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-3 gap-2"
            >
              {allPhotos.length > 0 ? allPhotos.map((photo, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                >
                  <img 
                    src={photo} 
                    alt={`Look ${idx + 1}`} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </motion.div>
              )) : (
                <div className="col-span-3 text-center py-20">
                  <Camera className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500">No photos from past sessions.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ClientProfile;
