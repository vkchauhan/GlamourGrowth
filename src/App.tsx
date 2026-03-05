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
  Trash2
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
import { AppTab, IncomeEntry, FESTIVALS } from "./types";
import { geminiService } from "./services/geminiService";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
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

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [clientContext, setClientContext] = useState("");

  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const totalIncome = useMemo(() => 
    incomeEntries.reduce((sum, entry) => sum + entry.amount, 0),
  [incomeEntries]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map(m => ({ name: m, amount: 0 }));
    
    incomeEntries.forEach(entry => {
      const monthIdx = new Date(entry.date).getMonth();
      data[monthIdx].amount += entry.amount;
    });
    
    return data;
  }, [incomeEntries]);

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

  const generateStrategy = async () => {
    setLoadingStrategy(true);
    try {
      const res = await geminiService.generateFestivalStrategy(selectedFestival, totalIncome);
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
      const res = await geminiService.generateFollowUpMessages(clientContext);
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
      const res = await geminiService.generateBusinessInsights(incomeEntries);
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

  return (
    <div className="flex h-screen bg-premium-bg text-premium-ink font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-premium-border bg-white/50 backdrop-blur-md flex flex-col">
        <div className="p-10">
          <h1 className="text-3xl font-serif italic tracking-tight flex items-center gap-2">
            <Sparkles className="text-premium-gold w-6 h-6" />
            <span>GlamourGrowth</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mt-2">
            Your Personal Business Coach
          </p>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: AppTab.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
            { id: AppTab.STRATEGY, label: "Festival Strategy", icon: Calendar },
            { id: AppTab.MESSAGES, label: "Smart Messages", icon: MessageSquareText },
            { id: AppTab.INSIGHTS, label: "Growth Insights", icon: TrendingUp },
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

        <div className="p-8 border-t border-premium-border">
          <div className="bg-white p-6 rounded-3xl border border-premium-border shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8E8E] font-bold mb-2">Total Revenue</p>
            <p className="text-2xl font-serif font-bold flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-premium-gold" />
              {totalIncome.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto p-16">
          <AnimatePresence mode="wait">
            {activeTab === AppTab.DASHBOARD && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-5xl font-serif font-medium tracking-tight">Business Overview</h2>
                    <p className="text-[#666] mt-3 text-lg font-light italic">Track your professional growth and client bookings.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingIncome(true)}
                    className="bg-premium-ink text-white px-8 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#333] transition-all shadow-2xl shadow-black/10 hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-premium-gold" />
                    Record Booking
                  </button>
                </header>

                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-3">Total Bookings</p>
                    <p className="text-5xl font-serif font-medium">{incomeEntries.length}</p>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-3">Avg. Ticket Size</p>
                    <p className="text-5xl font-serif font-medium flex items-center gap-1">
                      <IndianRupee className="w-8 h-8 text-premium-gold" />
                      {incomeEntries.length ? Math.round(totalIncome / incomeEntries.length).toLocaleString('en-IN') : 0}
                    </p>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-3">Top Category</p>
                    <p className="text-5xl font-serif font-medium">
                      {incomeEntries.length ? 
                        Object.entries(incomeEntries.reduce((acc, curr) => {
                          acc[curr.category] = (acc[curr.category] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0][0] 
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[48px] border border-premium-border shadow-sm h-[450px]">
                  <h3 className="text-xl font-serif font-bold mb-8 italic">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E8E8E', fontWeight: 500 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E8E8E', fontWeight: 500 }} />
                      <Tooltip 
                        cursor={{ fill: '#F9F7F2' }}
                        contentStyle={{ borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', padding: '16px' }}
                      />
                      <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#1A1A1A' : '#F0F0F0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-[48px] border border-premium-border shadow-sm overflow-hidden">
                  <div className="p-10 border-b border-premium-border flex justify-between items-center">
                    <h3 className="text-xl font-serif font-bold italic">Recent Bookings</h3>
                  </div>
                  <div className="divide-y divide-premium-border">
                    {incomeEntries.length === 0 ? (
                      <div className="p-20 text-center text-[#8E8E8E] font-light italic">
                        No bookings recorded yet.
                      </div>
                    ) : (
                      incomeEntries.map((entry) => (
                        <div key={entry.id} className="p-8 flex items-center justify-between hover:bg-premium-bg transition-colors group">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center font-serif text-xl font-medium text-premium-ink">
                              {entry.clientName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-lg font-medium">{entry.clientName}</p>
                              <p className="text-xs text-[#8E8E8E] flex items-center gap-3 mt-1">
                                <span className="uppercase tracking-widest font-bold">{entry.category}</span>
                                <span className="w-1 h-1 rounded-full bg-premium-gold" />
                                <span className="italic">{new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <p className="text-xl font-serif font-bold flex items-center gap-1">
                              <IndianRupee className="w-4 h-4 text-premium-gold" />
                              {entry.amount.toLocaleString('en-IN')}
                            </p>
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="text-[#E5E5E5] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
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
                className="space-y-12"
              >
                <header>
                  <h2 className="text-5xl font-serif font-medium tracking-tight">Festival Strategy</h2>
                  <p className="text-[#666] mt-3 text-lg font-light italic">Generate a high-revenue plan for upcoming festivals.</p>
                </header>

                <div className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Select Festival</label>
                      <select 
                        value={selectedFestival}
                        onChange={(e) => setSelectedFestival(e.target.value)}
                        className="w-full p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 font-medium"
                      >
                        {FESTIVALS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={generateStrategy}
                        disabled={loadingStrategy}
                        className="w-full bg-premium-ink text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                      >
                        {loadingStrategy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-premium-gold" />}
                        Generate Strategy
                      </button>
                    </div>
                  </div>
                </div>

                {strategy && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-14 rounded-[56px] border border-premium-border shadow-2xl space-y-12"
                  >
                    <div className="flex justify-between items-start border-b border-premium-border pb-10">
                      <div className="max-w-2xl">
                        <h3 className="text-4xl font-serif font-medium">{strategy.title}</h3>
                        <p className="text-[#666] mt-4 leading-relaxed text-lg font-light italic">{strategy.overview}</p>
                      </div>
                      <div className="bg-premium-bg px-8 py-6 rounded-3xl border border-premium-border text-center min-w-[180px]">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold mb-2">Revenue Goal</p>
                        <p className="text-2xl font-serif font-bold text-premium-ink">{strategy.revenueGoal}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-16">
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">Pricing Strategy</h4>
                        <div className="p-8 bg-premium-bg rounded-[32px] border border-premium-border leading-relaxed text-lg italic font-light">
                          {strategy.pricingStrategy}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">Marketing Ideas</h4>
                        <ul className="space-y-5">
                          {strategy.marketingIdeas.map((idea: string, i: number) => (
                            <li key={i} className="flex items-start gap-4 text-base leading-relaxed">
                              <div className="mt-2 w-2 h-2 rounded-full bg-premium-gold shrink-0 shadow-sm shadow-premium-gold/50" />
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
                className="space-y-12"
              >
                <header>
                  <h2 className="text-5xl font-serif font-medium tracking-tight">Smart Messages</h2>
                  <p className="text-[#666] mt-3 text-lg font-light italic">Convert inquiries into bookings with professional follow-ups.</p>
                </header>

                <div className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm space-y-8">
                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Client Context</label>
                    <textarea 
                      placeholder="e.g., Client inquired for bridal makeup on Dec 12, but said price is high."
                      value={clientContext}
                      onChange={(e) => setClientContext(e.target.value)}
                      className="w-full p-8 rounded-[32px] border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 min-h-[150px] resize-none text-lg font-light italic"
                    />
                  </div>
                  <button 
                    onClick={generateMessages}
                    disabled={loadingMessages || !clientContext}
                    className="w-full bg-premium-ink text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                  >
                    {loadingMessages ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquareText className="w-5 h-5 text-premium-gold" />}
                    Generate Follow-ups
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-10 rounded-[40px] border border-premium-border shadow-sm hover:shadow-xl transition-all group relative"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-5 py-1.5 bg-premium-bg border border-premium-border rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-premium-gold">
                          {msg.tone}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="text-[#8E8E8E] hover:text-premium-ink transition-colors p-2 hover:bg-premium-bg rounded-full"
                        >
                          {copiedIndex === i ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6" />}
                        </button>
                      </div>
                      <p className="text-premium-ink leading-relaxed whitespace-pre-wrap text-lg font-light italic">{msg.content}</p>
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
                className="space-y-12"
              >
                <header className="flex justify-between items-end">
                  <div>
                    <h2 className="text-5xl font-serif font-medium tracking-tight">Growth Insights</h2>
                    <p className="text-[#666] mt-3 text-lg font-light italic">AI-driven analysis of your business performance.</p>
                  </div>
                  <button 
                    onClick={generateInsights}
                    disabled={loadingInsights || incomeEntries.length === 0}
                    className="bg-premium-ink text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                  >
                    {loadingInsights ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5 text-premium-gold" />}
                    Analyze Business
                  </button>
                </header>

                {incomeEntries.length === 0 && (
                  <div className="bg-white p-20 rounded-[48px] border border-premium-border text-center space-y-6 shadow-sm">
                    <p className="text-[#8E8E8E] text-xl font-light italic">Record some bookings first to get personalized insights.</p>
                  </div>
                )}

                {insights && (
                  <div className="space-y-12">
                    <div className="bg-white p-14 rounded-[56px] border border-premium-border shadow-2xl">
                      <h3 className="text-3xl font-serif font-medium mb-6 italic">Performance Summary</h3>
                      <p className="text-premium-ink leading-relaxed text-xl font-light italic">{insights.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                      <div className="bg-white p-12 rounded-[48px] border border-premium-border shadow-sm space-y-8">
                        <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">Recommendations</h4>
                        <ul className="space-y-6">
                          {insights.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-5">
                              <div className="w-10 h-10 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center shrink-0 text-sm font-serif font-bold italic">
                                {i + 1}
                              </div>
                              <p className="text-base leading-relaxed font-medium">{rec}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white p-12 rounded-[48px] border border-premium-border shadow-sm space-y-8">
                        <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-premium-gold">Next Steps</h4>
                        <ul className="space-y-6">
                          {insights.nextSteps.map((step: string, i: number) => (
                            <li key={i} className="flex items-start gap-5">
                              <CheckCircle2 className="w-6 h-6 text-premium-gold mt-0.5 shrink-0" />
                              <p className="text-base leading-relaxed font-medium">{step}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Income Modal */}
      <AnimatePresence>
        {isAddingIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
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
              className="relative w-full max-w-xl bg-white rounded-[56px] shadow-3xl overflow-hidden border border-premium-border"
            >
              <div className="p-12 space-y-10">
                <header>
                  <h3 className="text-3xl font-serif font-medium italic">Record New Booking</h3>
                  <p className="text-[#666] text-lg font-light italic mt-2">Keep your professional records up to date.</p>
                </header>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Date</label>
                      <input 
                        type="date" 
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                        className="w-full p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Category</label>
                      <select 
                        value={newEntry.category}
                        onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                        className="w-full p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                      >
                        <option>Bridal</option>
                        <option>Party</option>
                        <option>Festival</option>
                        <option>Pre-wedding</option>
                        <option>Engagement</option>
                        <option>Editorial</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Client Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Priya Sharma"
                      value={newEntry.clientName}
                      onChange={(e) => setNewEntry({ ...newEntry, clientName: e.target.value })}
                      className="w-full p-5 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-premium-gold" />
                      <input 
                        type="number" 
                        placeholder="0"
                        value={newEntry.amount || ""}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: Number(e.target.value) })}
                        className="w-full p-5 pl-12 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-6">
                  <button 
                    onClick={() => setIsAddingIncome(false)}
                    className="flex-1 px-10 py-5 rounded-2xl font-bold text-[#666] hover:bg-premium-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddIncome}
                    className="flex-1 bg-premium-ink text-white px-10 py-5 rounded-2xl font-bold hover:bg-[#333] transition-all shadow-2xl shadow-black/10"
                  >
                    Save Booking
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
