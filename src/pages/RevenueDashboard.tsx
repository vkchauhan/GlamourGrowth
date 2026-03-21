import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Users, 
  Briefcase, 
  ChevronRight,
  Filter,
  Download,
  IndianRupee
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { format, startOfToday, startOfWeek, startOfMonth, subDays } from 'date-fns';

interface RevenueData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  byService: { service: string; revenue: number }[];
  byMonth: { month: string; revenue: number; expenses: number; profit: number }[];
  byCategory: { category: string; amount: number }[];
  topClients: { name: string; revenue: number }[];
  repeatVsNew: { repeat: number; new: number };
  averageBookingValue: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface RevenueDashboardProps {
  onClose?: () => void;
  bookings: any[];
  expenses: any[];
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ onClose, bookings, expenses }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RevenueData | null>(null);
  const [dateRange, setDateRange] = useState('this-month');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const calculateAnalytics = () => {
      let from = '';
      let to = format(new Date(), 'yyyy-MM-dd');

      if (dateRange === 'today') {
        from = format(startOfToday(), 'yyyy-MM-dd');
      } else if (dateRange === 'this-week') {
        from = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (dateRange === 'this-month') {
        from = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      } else if (dateRange === 'custom' && customRange.from && customRange.to) {
        from = customRange.from;
        to = customRange.to;
      }

      // Filter bookings by date range
      const filteredBookings = bookings.filter(b => {
        if (!from) return true;
        return b.date >= from && b.date <= to;
      });

      // Filter expenses by date range
      const filteredExpenses = expenses.filter(e => {
        if (!from) return true;
        return e.date >= from && e.date <= to;
      });

      // Aggregation logic (similar to backend)
      let totalRevenue = 0;
      let totalExpenses = 0;
      const byServiceMap: Record<string, number> = {};
      const byMonthMap: Record<string, { revenue: number; expenses: number }> = {};
      const byCategoryMap: Record<string, number> = {};
      const clientRevenueMap: Record<string, number> = {};
      const clientBookingCount: Record<string, number> = {};

      filteredBookings.forEach(b => {
        const revenue = b.amount || b.total_amount || b.price || 0;
        totalRevenue += revenue;

        // By Service
        if (b.services && Array.isArray(b.services) && b.services.length > 0) {
          b.services.forEach((s: any) => {
            const serviceName = s.name || "Unknown";
            const servicePrice = s.price || 0;
            byServiceMap[serviceName] = (byServiceMap[serviceName] || 0) + servicePrice;
          });
        } else {
          const serviceName = b.category || "General";
          byServiceMap[serviceName] = (byServiceMap[serviceName] || 0) + revenue;
        }

        // By Month
        const dateStr = b.date || "";
        if (dateStr.length >= 7) {
          const month = dateStr.substring(0, 7); // YYYY-MM
          if (!byMonthMap[month]) byMonthMap[month] = { revenue: 0, expenses: 0 };
          byMonthMap[month].revenue += revenue;
        }

        // Top Clients
        const clientName = b.clientName || b.client_name || b.name || "Unknown";
        clientRevenueMap[clientName] = (clientRevenueMap[clientName] || 0) + revenue;
        clientBookingCount[clientName] = (clientBookingCount[clientName] || 0) + 1;
      });

      filteredExpenses.forEach(e => {
        const amount = e.amount || 0;
        totalExpenses += amount;

        // By Category
        const category = e.category || "Other";
        byCategoryMap[category] = (byCategoryMap[category] || 0) + amount;

        // By Month
        const dateStr = e.date || "";
        if (dateStr.length >= 7) {
          const month = dateStr.substring(0, 7); // YYYY-MM
          if (!byMonthMap[month]) byMonthMap[month] = { revenue: 0, expenses: 0 };
          byMonthMap[month].expenses += amount;
        }
      });

      const byService = Object.entries(byServiceMap).map(([service, revenue]) => ({ service, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
      
      const byMonth = Object.entries(byMonthMap).map(([month, values]) => ({ 
        month, 
        revenue: values.revenue, 
        expenses: values.expenses,
        profit: values.revenue - values.expenses
      })).sort((a, b) => a.month.localeCompare(b.month));

      const byCategory = Object.entries(byCategoryMap).map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      const topClients = Object.entries(clientRevenueMap).map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      let repeatRevenue = 0;
      let newRevenue = 0;
      Object.entries(clientBookingCount).forEach(([name, count]) => {
        if (count > 1) {
          repeatRevenue += clientRevenueMap[name];
        } else {
          newRevenue += clientRevenueMap[name];
        }
      });

      const averageBookingValue = filteredBookings.length > 0 ? totalRevenue / filteredBookings.length : 0;

      setData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        byService,
        byMonth,
        byCategory,
        topClients,
        repeatVsNew: {
          repeat: repeatRevenue,
          new: newRevenue
        },
        averageBookingValue
      });
    };

    calculateAnalytics();
  }, [dateRange, customRange, bookings, expenses]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const pieData = data?.byService.map((item, index) => ({
    name: item.service,
    value: item.revenue,
    color: COLORS[index % COLORS.length]
  })) || [];

  const repeatVsNewData = [
    { name: 'Repeat Clients', value: data?.repeatVsNew.repeat || 0, color: '#10b981' },
    { name: 'New Clients', value: data?.repeatVsNew.new || 0, color: '#3b82f6' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onClose ? onClose() : navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Revenue Insights</h1>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Download className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-500 mr-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            {(['today', 'this-week', 'this-month', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  dateRange === range 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {range.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</label>
                <input 
                  type="date" 
                  value={customRange.from}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</label>
                <input 
                  type="date" 
                  value={customRange.to}
                  onChange={(e) => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-premium-ink p-6 rounded-2xl shadow-lg shadow-black/10 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-premium-gold" />
              </div>
              <span className="text-xs font-medium bg-white/10 px-2 py-1 rounded-full">Net Profit</span>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">Net Profit</p>
            <h2 className="text-3xl font-bold">{formatCurrency(data?.netProfit || 0)}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(data?.totalRevenue || 0)}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Total Expenses</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(data?.totalExpenses || 0)}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">Avg. Booking Value</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(data?.averageBookingValue || 0)}</h2>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profitability Trend */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-premium-gold" />
              Profit vs Expenses Trend
            </h3>
            <div className="h-80 w-full min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={data?.byMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Expenses" />
                  <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Net Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Revenue by Service */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Revenue by Service
            </h3>
            <div className="h-80 w-full min-h-[320px] flex flex-col md:flex-row items-center">
              <div className="w-full h-full md:w-1/2 min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0">
                {pieData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-slate-600 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service List */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Service Performance</h3>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">All Services</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.byService.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/bookings?service=${encodeURIComponent(item.service)}`)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.service}</p>
                      <p className="text-xs text-slate-500">Click to view bookings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(item.revenue)}</p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${(item.revenue / data.totalRevenue) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </button>
              ))}
              {(!data || data.byService.length === 0) && (
                <div className="p-12 text-center">
                  <p className="text-slate-500">No service data available for this period.</p>
                </div>
              )}
            </div>
          </section>

          {/* Top Clients */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Top Clients</h3>
            </div>
            <div className="p-4 space-y-4">
              {data?.topClients.map((client, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {(client.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{client.name}</p>
                    <p className="text-xs text-slate-500">Premium Client</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(client.revenue)}</p>
                  </div>
                </div>
              ))}
              {(!data || data.topClients.length === 0) && (
                <div className="py-8 text-center">
                  <p className="text-slate-500 text-sm">No client data available.</p>
                </div>
              )}
            </div>
            
            {/* Repeat vs New Breakdown */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Client Retention</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Repeat Clients</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data?.repeatVsNew.repeat || 0)}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${data ? (data.repeatVsNew.repeat / data.totalRevenue) * 100 : 0}%` }}
                  ></div>
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${data ? (data.repeatVsNew.new / data.totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">New Clients</span>
                  <span className="font-bold text-blue-600">{formatCurrency(data?.repeatVsNew.new || 0)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default RevenueDashboard;
