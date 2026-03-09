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
  Loader2,
  Copy,
  CheckCircle2,
  Trash2,
  LogOut,
  Mic,
  MicOff,
  Bell,
  WifiOff,
  Instagram
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
import { AppTab, IncomeEntry, FESTIVALS, Language } from "./types";
import { geminiService } from "./services/geminiService";
import { auth } from "./services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { pwaService } from "./services/pwaService";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import Login from "./components/Login";
import VirtualTryOn from "./components/VirtualTryOn";
import InstagramCreator from "./components/InstagramCreator";

const translations = {
  [Language.EN]: en,
  [Language.HI]: hi,
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
    return (saved as Language) || Language.EN;
  });
  const t = translations[language];
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<IncomeEntry>>({
    date: new Date().toISOString().split('T')[0],
    category: "Bridal",
    amount: 0,
    clientName: ""
  });

  // AI States
  const [strategy, setStrategy] = useState<any>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState(FESTIVALS[0]);

  const festivalTranslations: Record<string, string> = {
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

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [clientContext, setClientContext] = useState("");

  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

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
    recognition.lang = language === Language.HI ? 'hi-IN' : 'en-IN';
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

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("glamour_growth_income");
    if (saved) {
      try {
        setIncomeEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved income", e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("glamour_growth_income", JSON.stringify(incomeEntries));
  }, [incomeEntries]);

  useEffect(() => {
    localStorage.setItem("glamour_growth_lang", language);
  }, [language]);

  const totalIncome = useMemo(() => 
    incomeEntries.reduce((sum, entry) => sum + entry.amount, 0),
  [incomeEntries]);

  const chartData = useMemo(() => {
    const months = [t.jan, t.feb, t.mar, t.apr, t.may, t.jun, t.jul, t.aug, t.sep, t.oct, t.nov, t.dec];
    const data = months.map(m => ({ name: m, amount: 0 }));
    
    incomeEntries.forEach(entry => {
      const monthIdx = new Date(entry.date).getMonth();
      data[monthIdx].amount += entry.amount;
    });
    
    return data;
  }, [incomeEntries, t]);

  const handleAddIncome = () => {
    if (!newEntry.amount || !newEntry.clientName) return;
    
    const entry: IncomeEntry = {
      id: crypto.randomUUID(),
      date: newEntry.date || new Date().toISOString().split('T')[0],
      amount: Number(newEntry.amount),
      category: newEntry.category || "Bridal",
      clientName: newEntry.clientName || "Unknown Client"
    };
    
    setIncomeEntries([entry, ...incomeEntries]);
    setIsAddingIncome(false);
    
    // Background Sync registration
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      pwaService.registerBackgroundSync('sync-leads');
    }

    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      category: "Bridal",
      amount: 0,
      clientName: ""
    });
  };

  const deleteEntry = (id: string) => {
    setIncomeEntries(incomeEntries.filter(e => e.id !== id));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const generateStrategy = async () => {
    setLoadingStrategy(true);
    try {
      const res = await geminiService.generateFestivalStrategy(selectedFestival, totalIncome, language);
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
      const res = await geminiService.generateFollowUpMessages(clientContext, language);
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
      const res = await geminiService.generateBusinessInsights(incomeEntries, language);
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
              onClick={() => setLanguage(Language.HI)}
              className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold transition-all", language === Language.HI ? "bg-premium-ink text-white" : "text-[#8E8E8E]")}
            >
              HI
            </button>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-full border border-premium-border shadow-sm flex items-center gap-1">
            <IndianRupee className="w-3 h-3 text-premium-gold" />
            <span className="text-xs font-bold">{totalIncome.toLocaleString('en-IN')}</span>
          </div>
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
          
          <div className="mt-8 flex bg-premium-bg border border-premium-border rounded-full p-1 w-fit">
            <button 
              onClick={() => setLanguage(Language.EN)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", language === Language.EN ? "bg-premium-ink text-white shadow-lg" : "text-[#8E8E8E]")}
            >
              English
            </button>
            <button 
              onClick={() => setLanguage(Language.HI)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", language === Language.HI ? "bg-premium-ink text-white shadow-lg" : "text-[#8E8E8E]")}
            >
              Hinglish
            </button>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: AppTab.DASHBOARD, label: t.dashboard, icon: LayoutDashboard },
            { id: AppTab.STRATEGY, label: t.festivalStrategy, icon: Calendar },
            { id: AppTab.MESSAGES, label: t.smartMessages, icon: MessageSquareText },
            { id: AppTab.INSIGHTS, label: t.growthInsights, icon: TrendingUp },
            { id: AppTab.TRY_ON, label: t.virtualTryOn, icon: Sparkles },
            { id: AppTab.INSTAGRAM_CREATOR, label: t.instagramCreator, icon: Instagram },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AppTab)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-300",
                activeTab === item.id 
                  ? "bg-premium-ink text-white shadow-2xl shadow-black/10" 
                  : "text-[#666] hover:bg-premium-bg hover:text-premium-ink"
              )}
            >
              <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-premium-gold" : "")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-premium-border space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-premium-border shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8E8E] font-bold mb-2">{t.totalRevenue}</p>
            <p className="text-2xl font-serif font-bold flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-premium-gold" />
              {totalIncome.toLocaleString('en-IN')}
            </p>
          </div>
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
                  <button 
                    onClick={() => setIsAddingIncome(true)}
                    className="w-full lg:w-auto bg-premium-ink text-white px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition-all shadow-2xl shadow-black/10 hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-premium-gold" />
                    {t.recordBooking}
                  </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.totalBookings}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium">{incomeEntries.length}</p>
                  </div>
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2 lg:mb-3">{t.avgTicketSize}</p>
                    <p className="text-3xl lg:text-5xl font-serif font-medium flex items-center gap-1">
                      <IndianRupee className="w-6 lg:w-8 h-6 lg:h-8 text-premium-gold" />
                      {incomeEntries.length ? Math.round(totalIncome / incomeEntries.length).toLocaleString('en-IN') : 0}
                    </p>
                  </div>
                  <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
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

                <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border border-premium-border shadow-sm h-[350px] lg:h-[450px] flex flex-col">
                  <h3 className="text-lg lg:text-xl font-serif font-bold mb-6 lg:mb-8 italic">{t.revenueTrend}</h3>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8E8E8E', fontWeight: 500 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8E8E8E', fontWeight: 500 }} />
                        <Tooltip 
                          cursor={{ fill: '#F9F7F2' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                        />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#1A1A1A' : '#F0F0F0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] lg:rounded-[48px] border border-premium-border shadow-sm overflow-hidden">
                  <div className="p-6 lg:p-10 border-b border-premium-border flex justify-between items-center">
                    <h3 className="text-lg lg:text-xl font-serif font-bold italic">{t.recentBookings}</h3>
                  </div>
                  <div className="divide-y divide-premium-border">
                    {incomeEntries.length === 0 ? (
                      <div className="p-12 lg:p-20 text-center text-[#8E8E8E] font-light italic">
                        {t.noBookings}
                      </div>
                    ) : (
                      incomeEntries.map((entry) => (
                        <div key={entry.id} className="p-6 lg:p-8 flex items-center justify-between hover:bg-premium-bg transition-colors group">
                          <div className="flex items-center gap-4 lg:gap-6">
                            <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center font-serif text-lg lg:text-xl font-medium text-premium-ink">
                              {entry.clientName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-base lg:text-lg font-medium">{entry.clientName}</p>
                              <p className="text-[10px] lg:text-xs text-[#8E8E8E] flex items-center gap-2 lg:gap-3 mt-0.5 lg:mt-1">
                                <span className="uppercase tracking-widest font-bold">{categoryTranslations[entry.category] || entry.category}</span>
                                <span className="w-1 h-1 rounded-full bg-premium-gold" />
                                <span className="italic">{new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 lg:gap-8">
                            <p className="text-lg lg:text-xl font-serif font-bold flex items-center gap-1">
                              <IndianRupee className="w-3 lg:w-4 h-3 lg:h-4 text-premium-gold" />
                              {entry.amount.toLocaleString('en-IN')}
                            </p>
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="text-[#E5E5E5] hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 lg:w-5 h-4 lg:h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                <header>
                  <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.festivalStrategy}</h2>
                  <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.festivalStrategySub}</p>
                </header>

                <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm space-y-6 lg:space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-2 lg:space-y-3">
                      <label className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectFestival}</label>
                      <select 
                        value={selectedFestival}
                        onChange={(e) => setSelectedFestival(e.target.value)}
                        className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 font-medium text-sm lg:text-base"
                      >
                        {FESTIVALS.map(f => <option key={f} value={f}>{festivalTranslations[f] || f}</option>)}
                      </select>
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
                  <div className="space-y-2 lg:space-y-3">
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
                        <button 
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="text-[#8E8E8E] hover:text-premium-ink transition-colors p-2 hover:bg-premium-bg rounded-full"
                        >
                          {copiedIndex === i ? <CheckCircle2 className="w-5 lg:w-6 h-5 lg:h-6 text-green-500" /> : <Copy className="w-5 lg:w-6 h-5 lg:h-6" />}
                        </button>
                      </div>
                      <p className="text-premium-ink leading-relaxed whitespace-pre-wrap text-base lg:text-lg font-light italic">{msg.content}</p>
                    </motion.div>
                  ))}
                </div>
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
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                  <div>
                    <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.growthInsights}</h2>
                    <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.growthInsightsSub}</p>
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

            {activeTab === AppTab.INSTAGRAM_CREATOR && (
              <motion.div
                key="instagram-creator"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 lg:space-y-12"
              >
                <InstagramCreator language={language} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-premium-border px-4 py-3 flex justify-around items-center z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {[
          { id: AppTab.DASHBOARD, icon: LayoutDashboard, label: t.home },
          { id: AppTab.STRATEGY, icon: Calendar, label: t.strategy },
          { id: AppTab.MESSAGES, icon: MessageSquareText, label: t.messages },
          { id: AppTab.INSIGHTS, icon: TrendingUp, label: t.insights },
          { id: AppTab.TRY_ON, icon: Sparkles, label: t.tryOn },
          { id: AppTab.INSTAGRAM_CREATOR, icon: Instagram, label: "Insta" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AppTab)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              activeTab === item.id ? "text-premium-ink scale-110" : "text-[#8E8E8E]"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-premium-gold" : "")} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Add Income Modal */}
      <AnimatePresence>
        {isAddingIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingIncome(false)}
              className="absolute inset-0 bg-premium-ink/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] lg:rounded-[56px] shadow-3xl overflow-hidden border border-premium-border max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 lg:p-12 space-y-8 lg:space-y-10">
                <header>
                  <h3 className="text-2xl lg:text-3xl font-serif font-medium italic">{t.recordNewBooking}</h3>
                  <p className="text-[#666] text-base lg:text-lg font-light italic mt-1 lg:mt-2">{t.recordNewBookingSub}</p>
                </header>

                <div className="space-y-6 lg:space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="space-y-2 lg:space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.date}</label>
                      <input 
                        type="date" 
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                        className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                      />
                    </div>
                    <div className="space-y-2 lg:space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.category}</label>
                      <select 
                        value={newEntry.category}
                        onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                        className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                      >
                        <option value="Bridal">{t.bridal}</option>
                        <option value="Party">{t.party}</option>
                        <option value="Festival">{t.festival}</option>
                        <option value="Pre-wedding">{t.preWedding}</option>
                        <option value="Engagement">{t.engagement}</option>
                        <option value="Editorial">{t.editorial}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 lg:space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.clientName}</label>
                    <input 
                      type="text" 
                      placeholder={t.clientNamePlaceholder}
                      value={newEntry.clientName}
                      onChange={(e) => setNewEntry({ ...newEntry, clientName: e.target.value })}
                      className="w-full p-4 lg:p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                    />
                  </div>

                  <div className="space-y-2 lg:space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.amount}</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-premium-gold" />
                      <input 
                        type="number" 
                        placeholder="0"
                        value={newEntry.amount || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: Number(e.target.value) })}
                        className="w-full p-4 lg:p-5 pl-10 lg:pl-12 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium text-sm lg:text-base"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                  <button 
                    onClick={() => setIsAddingIncome(false)}
                    className="order-2 lg:order-1 flex-1 px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold text-[#666] hover:bg-premium-bg transition-colors text-sm lg:text-base"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={handleAddIncome}
                    className="order-1 lg:order-2 flex-1 bg-premium-ink text-white px-8 lg:px-10 py-4 lg:py-5 rounded-2xl font-bold hover:bg-[#333] transition-all shadow-2xl shadow-black/10 text-sm lg:text-base"
                  >
                    {t.saveBooking}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
