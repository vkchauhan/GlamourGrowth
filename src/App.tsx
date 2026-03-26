/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Sparkles, 
  MessageSquareText, 
  TrendingUp, 
  Plus, 
  IndianRupee, 
  Calendar, 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Copy,
  CheckCircle2,
  Trash2,
  LogOut,
  Mic,
  MicOff,
  Bell,
  WifiOff,
  MessageCircle,
  Share2,
  Users,
  User,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppTab, IncomeEntry, OCCASIONS, Language, SmartNudge, Expense } from "./types";
import { geminiService } from "./services/geminiService";
import { 
  getBookings, 
  deleteBooking, 
  subscribeToBookings,
  subscribeToExpenses,
  deleteExpense
} from "./services/bookingService";
import { auth, db } from "./services/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { pwaService } from "./services/pwaService";
import { nudgeService } from "./services/nudgeService";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import Login from "./components/Login";
import VirtualTryOn from "./components/VirtualTryOn";
import BookingForm from "./components/BookingForm";
import ExpenseForm from "./components/ExpenseForm";
import DailyGrowthScreen from "./pages/DailyGrowthScreen";
import RevenueDashboard from "./pages/RevenueDashboard";
import Clients from "./pages/Clients";
import Profile from "./pages/Profile";
import { ScheduleView } from "./components/ScheduleView";
import { Booking, BookingInsights, Client } from "./types";
import { BookingInsightsService } from "./services/BookingInsightsService";
import { getClients } from "./services/bookingService";

const translations = {
  [Language.EN]: en,
  [Language.HINGLISH]: hi,
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("glamour_growth_lang");
    return (saved as Language) || Language.HINGLISH;
  });
  const t = translations[language];
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [bookingDefaultDate, setBookingDefaultDate] = useState<string | undefined>(undefined);
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null);

  // Assistant States
  const [strategy, setStrategy] = useState<any>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[0]);
  const [occasionSearchQuery, setOccasionSearchQuery] = useState("");
  const [showOccasionSuggestions, setShowOccasionSuggestions] = useState(false);

  const occasionTranslations: Record<string, string> = {
    "Karwa Chauth": t.karwaChauth,
    "Diwali": t.diwali,
    "Wedding Season (Nov-Feb)": t.weddingSeason,
    "Eid": t.eid,
    "Navratri": t.navratri,
    "Engagement Season": t.engagementSeason,
    "Pre-Wedding Shoots": t.preWeddingShoots,
  };

  const categoryTranslations: Record<string, string> = {
    "Bridal": t.bridal,
    "Party": t.party,
    "Festival": t.festival,
    "Pre-wedding": t.preWedding,
    "Engagement": t.engagement,
    "Editorial": t.editorial,
  };

  const filteredOccasions = useMemo(() => {
    if (!occasionSearchQuery) return OCCASIONS;
    return OCCASIONS.filter(o => {
      const translated = (occasionTranslations[o] || o).toLowerCase();
      const original = o.toLowerCase();
      const query = occasionSearchQuery.toLowerCase();
      return translated.includes(query) || original.includes(query);
    });
  }, [occasionSearchQuery, occasionTranslations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.occasion-dropdown-container')) {
        setShowOccasionSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [clientContext, setClientContext] = useState("");

  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [dismissedNudges, setDismissedNudges] = useState<string[]>(() => {
    const saved = localStorage.getItem("glamour_growth_dismissed_nudges");
    return saved ? JSON.parse(saved) : [];
  });

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await pwaService.requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      pwaService.showLocalNotification(t.appTitle, t.notificationsEnabled);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === Language.HINGLISH ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setClientContext(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data from Firestore
  useEffect(() => {
    if (!user) {
      setIncomeEntries([]);
      return;
    }
    
    const unsubscribeBookings = subscribeToBookings((data) => {
      // Map Firestore data to IncomeEntry format
      const mapped: IncomeEntry[] = data.map((b: any) => ({
        id: b.booking_id,
        date: b.date,
        amount: b.total_amount || b.price || 0,
        category: b.services?.[0]?.name || "General",
        clientName: b.client_name || b.name || "Unknown Client",
        clientPhone: b.client_phone || b.phone,
        services: b.services || [],
        photos: b.photos || [],
        sessionNotes: b.sessionNotes || ""
      }));
      setIncomeEntries(mapped);
    });

    const unsubscribeExpenses = subscribeToExpenses((data) => {
      setExpenses(data);
    });
    
    return () => {
      unsubscribeBookings();
      unsubscribeExpenses();
    };
  }, [user]);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("glamour_growth_income", JSON.stringify(incomeEntries));
  }, [incomeEntries]);

  useEffect(() => {
    localStorage.setItem("glamour_growth_lang", language);
  }, [language]);

  const handleDismissNudge = (nudgeId: string) => {
    const updated = [...dismissedNudges, nudgeId];
    setDismissedNudges(updated);
    localStorage.setItem("glamour_growth_dismissed_nudges", JSON.stringify(updated));
  };

  const totalIncome = useMemo(() => 
    incomeEntries.reduce((sum, entry) => sum + entry.amount, 0),
  [incomeEntries]);

  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, entry) => sum + entry.amount, 0),
  [expenses]);

  const netProfit = totalIncome - totalExpenses;

  const chartData = useMemo(() => {
    const months = [t.jan, t.feb, t.mar, t.apr, t.may, t.jun, t.jul, t.aug, t.sep, t.oct, t.nov, t.dec];
    const data = months.map(m => ({ name: m, amount: 0 }));
    
    incomeEntries.forEach(entry => {
      const monthIdx = new Date(entry.date).getMonth();
      data[monthIdx].amount += entry.amount;
    });
    
    return data;
  }, [incomeEntries, t]);

  const handleAddBooking = (booking: Booking) => {
    setIsAddingIncome(false);
    
    // Background Sync registration
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      pwaService.registerBackgroundSync('sync-leads');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await deleteBooking(id);
    } catch (e) {
      console.error("Failed to delete booking from Firestore", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchContext = async () => {
      try {
        // Fetch Artist Profile
        const profileRef = doc(db, 'artist_profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setArtistProfile(profileSnap.data());
        }

        // Fetch Clients
        const clientsData = await getClients();
        setClients(clientsData);
      } catch (err) {
        console.error("Error fetching context for AI:", err);
      }
    };

    fetchContext();
  }, [user]);

  const generateStrategy = async () => {
    setLoadingStrategy(true);
    try {
      const res = await geminiService.generateOccasionStrategy(selectedOccasion, totalIncome, language, artistProfile);
      setStrategy(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStrategy(false);
    }
  };

  const generateMessages = async () => {
    if (!clientContext) return;
    setLoadingMessages(true);
    try {
      // Try to find a client in the context
      const mentionedClient = clients.find(c => 
        clientContext.toLowerCase().includes(c.name.toLowerCase())
      );
      
      const res = await geminiService.generateFollowUpMessages(clientContext, language, artistProfile, mentionedClient);
      setMessages(res.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await geminiService.generateBusinessInsights(incomeEntries, language, artistProfile);
      setInsights(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInsights(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareOnWhatsApp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-premium-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-premium-gold animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login language={language} setLanguage={setLanguage} onLoginSuccess={setUser} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-premium-bg text-premium-ink font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-premium-border p-4 flex justify-between items-center z-40">
        <h1 className="text-xl font-serif italic tracking-tight flex items-center gap-2">
          <Sparkles className="text-premium-gold w-5 h-5" />
          <span>{t.appTitle}</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-premium-bg border border-premium-border rounded-full p-1">
            <button 
              onClick={() => setLanguage(Language.EN)}
              className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold transition-all", language === Language.EN ? "bg-premium-ink text-white" : "text-[#8E8E8E]")}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage(Language.HINGLISH)}
              className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold transition-all", language === Language.HINGLISH ? "bg-premium-ink text-white" : "text-[#8E8E8E]")}
            >
              HG
            </button>
          </div>
          <button 
            onClick={() => setActiveTab(AppTab.REVENUE)}
            className="bg-white px-3 py-1.5 rounded-full border border-premium-border shadow-sm flex items-center gap-1 hover:bg-premium-bg transition-colors active:scale-95"
          >
            <IndianRupee className="w-3 h-3 text-premium-gold" />
            <span className="text-xs font-bold">{(totalIncome || 0).toLocaleString('en-IN')}</span>
          </button>
          <button 
            onClick={() => setActiveTab(AppTab.PROFILE)}
            className={cn(
              "p-2 rounded-full border transition-colors",
              activeTab === AppTab.PROFILE 
                ? "bg-premium-ink text-white border-premium-ink" 
                : "bg-white border-premium-border text-[#8E8E8E] hover:text-premium-ink"
            )}
          >
            <User className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full bg-white border border-premium-border text-[#8E8E8E] hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {!isOnline && (
            <div className="p-2 rounded-full bg-amber-50 border border-amber-200 text-amber-600">
              <WifiOff className="w-4 h-4" />
            </div>
          )}
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 border-r border-premium-border bg-white/50 backdrop-blur-md flex-col">
        <div className="p-10">
          <h1 className="text-3xl font-serif italic tracking-tight flex items-center gap-2">
            <Sparkles className="text-premium-gold w-6 h-6" />
            <span>{t.appTitle}</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mt-2">
            {t.businessCoach}
          </p>
          
          <div className="mt-8 flex items-center gap-4">
            <div className="flex bg-premium-bg border border-premium-border rounded-full p-1 w-fit">
              <button 
                onClick={() => setLanguage(Language.EN)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", language === Language.EN ? "bg-premium-ink text-white shadow-lg" : "text-[#8E8E8E]")}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage(Language.HINGLISH)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", language === Language.HINGLISH ? "bg-premium-ink text-white shadow-lg" : "text-[#8E8E8E]")}
              >
                Hinglish
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: AppTab.DASHBOARD, label: t.overview || "Overview", icon: LayoutDashboard },
            { id: AppTab.SCHEDULE, label: t.schedule || "Schedule", icon: Calendar },
            { id: AppTab.CLIENTS, label: t.beautyLog, icon: Users },
            { id: AppTab.PROFILE, label: t.myStudio, icon: User },
            { id: AppTab.STRATEGY, label: t.festivalStrategy, icon: Sparkles },
            { id: AppTab.MESSAGES, label: t.messages, icon: MessageSquareText },
            { id: AppTab.GROWTH, label: t.dailyGrowthTask, icon: TrendingUp },
            { id: AppTab.INSIGHTS, label: t.growthInsights, icon: TrendingUp },
            { id: AppTab.TRY_ON, label: t.virtualTryOn, icon: Sparkles, comingSoon: true },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => !item.comingSoon && setActiveTab(item.id as AppTab)}
              disabled={item.comingSoon}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-300",
                activeTab === item.id 
                  ? "bg-premium-ink text-white shadow-2xl shadow-black/10" 
                  : item.comingSoon 
                    ? "text-[#A0A0A0] cursor-not-allowed opacity-70"
                    : "text-[#666] hover:bg-premium-bg hover:text-premium-ink"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-premium-gold" : "")} />
                {item.label}
              </div>
              {item.comingSoon && (
                <span className="text-[8px] font-bold uppercase tracking-widest bg-premium-gold/10 text-premium-gold px-2 py-1 rounded-full border border-premium-gold/20">
                  {t.comingSoon}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-premium-border space-y-4">
          <button 
            onClick={() => setActiveTab(AppTab.REVENUE)}
            className="w-full text-left bg-white p-6 rounded-3xl border border-premium-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8E8E] font-bold mb-2 group-hover:text-premium-gold transition-colors">{t.totalRevenue}</p>
            <p className="text-2xl font-serif font-bold flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-premium-gold" />
              {(totalIncome || 0).toLocaleString('en-IN')}
            </p>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </button>

          {notificationPermission !== 'granted' && (
            <button 
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium text-premium-gold hover:bg-premium-gold/5 transition-all duration-300 border border-premium-gold/20"
            >
              <Bell className="w-4 h-4" />
              {t.enableNotifications}
            </button>
          )}

          {!isOnline && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
              <WifiOff className="w-4 h-4" />
              {t.offlineMode}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-24 lg:pb-0">
        <div className="max-w-5xl mx-auto p-6 lg:p-16">
          <AnimatePresence mode="wait">
            {activeTab === AppTab.SCHEDULE && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <ScheduleView 
                  onBack={() => setActiveTab(AppTab.DASHBOARD)} 
                  onAddBooking={(date) => {
                    setBookingDefaultDate(date);
                    setIsAddingIncome(true);
                  }} 
                  onCompleteAppointment={(booking) => {
                    setCompletingBooking(booking);
                    setIsAddingIncome(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === AppTab.DASHBOARD && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                  <div>
                    <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.businessOverview}</h2>
                    <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.businessOverviewSub}</p>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                    <button 
                      onClick={() => setIsAddingIncome(true)}
                      className="flex-1 lg:flex-none bg-premium-ink text-white px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition-all shadow-2xl shadow-black/10 hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-premium-gold" />
                      {t.recordAppointment}
                    </button>
                    <button 
                      onClick={() => setIsAddingExpense(true)}
                      className="flex-1 lg:flex-none bg-white text-premium-ink border border-premium-border px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-premium-bg transition-all shadow-sm hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-red-500" />
                      Record Expense
                    </button>
                  </div>
                </header>

                {/* Smart Nudges Section */}
                {(() => {
                  const allNudges = nudgeService.generateNudges(incomeEntries, artistProfile);
                  const nudges = allNudges.filter(n => !dismissedNudges.includes(n.id));
                  if (nudges.length === 0) return null;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {nudges.map(nudge => (
                        <motion.div
                          key={nudge.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-premium-gold/5 border border-premium-gold/20 p-6 rounded-[32px] relative overflow-hidden group"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-12 h-12 text-premium-gold" />
                          </div>
                          
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-premium-gold/10 flex items-center justify-center flex-shrink-0">
                              <Bell className="w-5 h-5 text-premium-gold" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-serif font-medium text-premium-ink">
                                {language === Language.HINGLISH ? nudge.title_hi : nudge.title_en}
                              </h3>
                              <p className="text-sm text-[#666] mt-1 font-light italic">
                                {language === Language.HINGLISH ? nudge.message_hi : nudge.message_en}
                              </p>
                              
                              <div className="flex items-center gap-3 mt-4">
                                <button
                                  onClick={() => handleDismissNudge(nudge.id)}
                                  className="flex items-center gap-2 px-6 py-2.5 bg-premium-ink text-white rounded-full text-xs font-bold hover:bg-[#333] transition-all"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  {t.done || "Done"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                  <button 
                    onClick={() => setActiveTab(AppTab.REVENUE)}
                    className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-all text-left group"
                  >
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3 group-hover:text-premium-gold transition-colors">{t.totalRevenue}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium flex items-center gap-1">
                      <IndianRupee className="w-6 lg:w-8 h-6 lg:h-8 text-premium-gold" />
                      {(totalIncome || 0).toLocaleString('en-IN')}
                    </p>
                  </button>
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm">
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.totalAppointments}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium">{incomeEntries.length}</p>
                  </div>
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm">
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.avgTicketSize}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium flex items-center gap-1">
                      <IndianRupee className="w-6 lg:w-8 h-6 lg:h-8 text-premium-gold" />
                      {incomeEntries.length ? Math.round((totalIncome || 0) / incomeEntries.length).toLocaleString('en-IN') : 0}
                    </p>
                  </div>
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm">
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.topCategory}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium">
                      {incomeEntries.length ? 
                        (() => {
                          const topCat = Object.entries(incomeEntries.reduce((acc, curr) => {
                            acc[curr.category] = (acc[curr.category] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0][0];
                          return categoryTranslations[topCat] || topCat;
                        })()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg lg:text-xl font-serif font-bold italic">{t.businessDashboards || "Business Dashboards"}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: AppTab.REVENUE, label: t.totalRevenue, icon: IndianRupee },
                      { id: AppTab.CLIENTS, label: t.beautyLog, icon: Users },
                      { id: AppTab.INSIGHTS, label: t.growthInsights, icon: TrendingUp },
                      { id: AppTab.STRATEGY, label: t.festivalStrategy, icon: LayoutDashboard },
                    ].map(dash => (
                      <button
                        key={dash.id}
                        onClick={() => setActiveTab(dash.id)}
                        className="p-6 bg-white border border-premium-border rounded-[32px] flex flex-col items-center gap-3 hover:bg-premium-bg transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-premium-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <dash.icon className="w-6 h-6 text-premium-gold" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E8E] group-hover:text-premium-ink text-center">{dash.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.businessInsight}</p>
                  <p className="text-sm lg:text-base font-light italic text-[#666]">
                    {(() => {
                      const insights = BookingInsightsService.analyze(incomeEntries.map(e => ({
                        booking_id: e.id,
                        client_name: e.clientName,
                        date: e.date,
                        total_amount: e.amount,
                        services: e.services || []
                      } as Booking)));
                      
                      if (insights.bookings_last_30_days === 0) return t.noRecentBookingsInsight || "No bookings this month. Try promoting your services!";
                      
                      let action = "";
                      if (insights.most_common_service?.toLowerCase().includes("bridal")) {
                        action = t.promoteBridalAction || "Promote your bridal services to get more clients.";
                      } else {
                        action = t.promoteServicesAction || "Share your work on social media to attract new clients.";
                      }

                      return t.bookingsInsight.replace("{{count}}", insights.bookings_last_30_days.toString()).replace("{{action}}", action);
                    })()}
                  </p>
                </div>


              </motion.div>
            )}

            {activeTab === AppTab.STRATEGY && (
              <motion.div
                key="strategy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <header className="flex items-center gap-4 mb-8 lg:mb-12">
                  <button 
                    onClick={() => setActiveTab(AppTab.DASHBOARD)}
                    className="p-2 hover:bg-premium-bg rounded-full transition-colors active:scale-95"
                  >
                    <ArrowLeft className="w-6 h-6 text-premium-ink" />
                  </button>
                  <div>
                    <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.festivalStrategy}</h2>
                    <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.festivalStrategySub}</p>
                  </div>
                </header>

                <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm space-y-6 lg:space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-2 lg:space-y-3 relative occasion-dropdown-container">
                      <label className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectFestival}</label>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder={t.selectFestival}
                          value={showOccasionSuggestions ? occasionSearchQuery : (occasionTranslations[selectedOccasion] || selectedOccasion)}
                          onChange={(e) => {
                            setOccasionSearchQuery(e.target.value);
                            setShowOccasionSuggestions(true);
                          }}
                          onFocus={() => {
                            setOccasionSearchQuery("");
                            setShowOccasionSuggestions(true);
                          }}
                          className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 font-medium text-sm lg:text-base"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight className={cn("w-5 h-5 text-[#8E8E8E] transition-transform", showOccasionSuggestions ? "rotate-90" : "rotate-0")} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {showOccasionSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-2 bg-white border border-premium-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                          >
                            {filteredOccasions.length > 0 ? (
                              filteredOccasions.map((o) => (
                                <div
                                  key={o}
                                  onClick={() => {
                                    setSelectedOccasion(o);
                                    setOccasionSearchQuery("");
                                    setShowOccasionSuggestions(false);
                                  }}
                                  className={cn(
                                    "p-4 hover:bg-premium-bg cursor-pointer transition-colors border-b border-premium-border last:border-0 text-sm font-medium",
                                    selectedOccasion === o ? "bg-premium-bg text-premium-gold" : "text-premium-ink"
                                  )}
                                >
                                  {occasionTranslations[o] || o}
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-[#8E8E8E] italic">
                                No matching occasions found.
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={generateStrategy}
                        disabled={loadingStrategy}
                        className="w-full bg-premium-ink text-white px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                      >
                        {loadingStrategy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-premium-gold" />}
                        {t.generateStrategy}
                      </button>
                    </div>
                  </div>
                </div>

                {strategy && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-8 lg:p-14 rounded-[32px] lg:rounded-[56px] border border-premium-border shadow-2xl space-y-8 lg:space-y-12"
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start border-b border-premium-border pb-8 lg:pb-10 gap-6">
                      <div className="max-w-2xl">
                        <h3 className="text-2xl lg:text-4xl font-serif font-medium">{strategy.title}</h3>
                        <p className="text-[#666] mt-3 lg:mt-4 leading-relaxed text-base lg:text-lg font-light italic">{strategy.overview}</p>
                      </div>
                      <div className="bg-premium-bg px-6 lg:px-8 py-4 lg:py-6 rounded-2xl lg:rounded-3xl border border-premium-border text-center min-w-[150px] lg:min-w-[180px]">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-1 lg:mb-2">{t.revenueGoal}</p>
                        <p className="text-xl lg:text-2xl font-serif font-bold text-premium-ink">{strategy.revenueGoal}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                      <div className="space-y-4 lg:space-y-6">
                        <h4 className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">{t.pricingStrategy}</h4>
                        <div className="p-6 lg:p-8 bg-premium-bg rounded-[24px] lg:rounded-[32px] border border-premium-border leading-relaxed text-base lg:text-lg italic font-light">
                          {strategy.pricingStrategy}
                        </div>
                      </div>
                      <div className="space-y-4 lg:space-y-6">
                        <h4 className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">{t.marketingIdeas}</h4>
                        <ul className="space-y-4 lg:space-y-5">
                          {strategy.marketingIdeas.map((idea: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 lg:gap-4 text-sm lg:text-base leading-relaxed">
                              <div className="mt-1.5 lg:mt-2 w-1.5 lg:w-2 h-1.5 lg:h-2 rounded-full bg-premium-gold shrink-0 shadow-sm shadow-premium-gold/50" />
                              <span className="font-medium">{idea}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === AppTab.MESSAGES && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <header>
                  <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.smartMessages}</h2>
                  <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.smartMessagesSub}</p>
                </header>

                <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm space-y-6 lg:space-y-8">
                  <div className="space-y-4 lg:space-y-6">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.clientContext}</label>
                      <button 
                        onClick={startListening}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          isListening 
                            ? "bg-red-50 border-red-200 text-red-500 animate-pulse" 
                            : "bg-premium-bg border-premium-border text-[#8E8E8E] hover:text-premium-ink"
                        )}
                      >
                        {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                        {isListening ? "Listening..." : "Speak Input"}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] text-[#8E8E8E] font-medium uppercase tracking-wider">{t.tryExamples}</p>
                      <div className="flex flex-wrap gap-2">
                        {[t.example1, t.example2, t.example3].map((ex, idx) => (
                          <button
                            key={idx}
                            onClick={() => setClientContext(ex)}
                            className="px-4 py-2 rounded-full bg-premium-bg border border-premium-border text-xs font-medium text-premium-ink hover:border-premium-gold hover:bg-white transition-all"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea 
                      placeholder={t.clientContextPlaceholder}
                      value={clientContext}
                      onChange={(e) => setClientContext(e.target.value)}
                      className="w-full p-6 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 min-h-[120px] lg:min-h-[150px] resize-none text-base lg:text-lg font-light italic"
                    />
                  </div>
                  <button 
                    onClick={generateMessages}
                    disabled={loadingMessages || !clientContext}
                    className="w-full bg-premium-ink text-white px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                  >
                    {loadingMessages ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquareText className="w-5 h-5 text-premium-gold" />}
                    {t.generateFollowUps}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:gap-8">
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-xl transition-all group relative"
                    >
                      <div className="flex justify-between items-start mb-4 lg:mb-6">
                        <span className="px-4 lg:px-5 py-1 lg:py-1.5 bg-premium-bg border border-premium-border rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-premium-gold">
                          {msg.tone}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => shareOnWhatsApp(msg.content)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-full text-[10px] font-bold hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/20"
                          >
                            <MessageCircle className="w-3 h-3 fill-current" />
                            {language === Language.HINGLISH ? "WhatsApp par bhejein" : "Share on WhatsApp"}
                          </button>
                          <button 
                            onClick={() => copyToClipboard(msg.content, i)}
                            className="text-[#8E8E8E] hover:text-premium-ink transition-colors p-2 hover:bg-premium-bg rounded-full"
                          >
                            {copiedIndex === i ? <CheckCircle2 className="w-5 lg:w-6 h-5 lg:h-6 text-green-500" /> : <Copy className="w-5 lg:w-6 h-5 lg:h-6" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-premium-ink leading-relaxed whitespace-pre-wrap text-base lg:text-lg font-light italic">{msg.content}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === AppTab.GROWTH && (
              <motion.div
                key="growth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <DailyGrowthScreen language={language} translations={t} />
              </motion.div>
            )}

            {activeTab === AppTab.INSIGHTS && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setActiveTab(AppTab.DASHBOARD)}
                      className="p-2 hover:bg-premium-bg rounded-full transition-colors active:scale-95"
                    >
                      <ArrowLeft className="w-6 h-6 text-premium-ink" />
                    </button>
                    <div>
                      <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.growthInsights}</h2>
                      <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.growthInsightsSub}</p>
                    </div>
                  </div>
                  <button 
                    onClick={generateInsights}
                    disabled={loadingInsights || incomeEntries.length === 0}
                    className="w-full lg:w-auto bg-premium-ink text-white px-8 lg:px-10 py-4 lg:py-5 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                  >
                    {loadingInsights ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5 text-premium-gold" />}
                    {t.analyzeBusiness}
                  </button>
                </header>

                {incomeEntries.length === 0 && (
                  <div className="bg-white p-12 lg:p-20 rounded-[32px] lg:rounded-[48px] border border-premium-border text-center space-y-4 lg:space-y-6 shadow-sm">
                    <p className="text-[#8E8E8E] text-base lg:text-xl font-light italic">{t.recordSomeBookings}</p>
                  </div>
                )}

                {insights && (
                  <div className="space-y-8 lg:space-y-12">
                    <div className="bg-white p-8 lg:p-14 rounded-[32px] lg:rounded-[56px] border border-premium-border shadow-2xl">
                      <h3 className="text-2xl lg:text-3xl font-serif font-medium mb-4 lg:mb-6 italic">{t.performanceSummary}</h3>
                      <p className="text-premium-ink leading-relaxed text-lg lg:text-xl font-light italic">{insights.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                      <div className="bg-white p-8 lg:p-12 rounded-[32px] lg:rounded-[48px] border border-premium-border shadow-sm space-y-6 lg:space-y-8">
                        <h4 className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">{t.recommendations}</h4>
                        <ul className="space-y-4 lg:space-y-6">
                          {insights.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-4 lg:gap-5">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center shrink-0 text-xs lg:text-sm font-serif font-bold italic">
                                {i + 1}
                              </div>
                              <p className="text-sm lg:text-base leading-relaxed font-medium">{rec}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-8 lg:p-12 rounded-[32px] lg:rounded-[48px] border border-premium-border shadow-sm space-y-6 lg:space-y-8">
                        <h4 className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">{t.nextSteps}</h4>
                        <ul className="space-y-4 lg:space-y-6">
                          {insights.nextSteps.map((step: string, i: number) => (
                            <li key={i} className="flex items-start gap-4 lg:gap-5">
                              <CheckCircle2 className="w-5 lg:w-6 h-5 lg:h-6 text-premium-gold mt-0.5 shrink-0" />
                              <p className="text-sm lg:text-base leading-relaxed font-medium">{step}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === AppTab.TRY_ON && (
              <motion.div
                key="try-on"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <VirtualTryOn language={language} />
              </motion.div>
            )}

            {activeTab === AppTab.REVENUE && (
              <motion.div
                key="revenue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto"
              >
                <RevenueDashboard 
                  bookings={incomeEntries} 
                  expenses={expenses}
                  onClose={() => setActiveTab(AppTab.DASHBOARD)} 
                />
              </motion.div>
            )}

            {activeTab === AppTab.CLIENTS && (
              <motion.div
                key="clients"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto"
              >
                <Clients 
                  onClose={() => setActiveTab(AppTab.DASHBOARD)}
                  language={language}
                  translations={t}
                />
              </motion.div>
            )}

            {activeTab === AppTab.PROFILE && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 z-50 bg-slate-50 overflow-y-auto"
              >
                <Profile 
                  onClose={() => setActiveTab(AppTab.DASHBOARD)}
                  language={language}
                  translations={t}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-premium-border px-4 py-3 flex justify-around items-center z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {[
          { id: AppTab.DASHBOARD, icon: LayoutDashboard, label: t.overview || "Overview" },
          { id: AppTab.SCHEDULE, icon: Calendar, label: t.schedule || "Schedule" },
          { id: AppTab.CLIENTS, icon: Users, label: t.beautyLog },
          { id: AppTab.REVENUE, icon: IndianRupee, label: t.totalRevenue },
          { id: AppTab.PROFILE, icon: User, label: t.profile },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AppTab)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 relative",
              activeTab === item.id ? "text-premium-ink" : "text-[#8E8E8E]"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-premium-gold" : "")} />
            <span className={cn("text-[9px] font-bold uppercase tracking-widest", activeTab === item.id ? "text-premium-ink" : "text-[#8E8E8E]")}>{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute -bottom-1 w-1 h-1 rounded-full bg-premium-gold"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {isAddingIncome && (
          <BookingForm 
            onClose={() => {
              setIsAddingIncome(false);
              setBookingDefaultDate(undefined);
              setCompletingBooking(null);
            }}
            onSuccess={(booking) => {
              handleAddBooking(booking);
              setBookingDefaultDate(undefined);
              setCompletingBooking(null);
            }}
            language={language}
            translations={t}
            initialDate={bookingDefaultDate}
            mode={completingBooking ? 'complete' : 'create'}
            initialData={completingBooking || undefined}
          />
        )}
        {isAddingExpense && (
          <ExpenseForm 
            onClose={() => setIsAddingExpense(false)}
            onSuccess={() => setIsAddingExpense(false)}
            language={language}
            translations={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
