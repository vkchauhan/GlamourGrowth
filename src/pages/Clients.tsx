import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  ChevronRight, 
  Phone, 
  Calendar, 
  ArrowLeft,
  UserPlus,
  Loader2,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Client, Language } from "../types";
import { getClients } from "../services/bookingService";
import ClientProfile from "./ClientProfile";

interface ClientsProps {
  onClose: () => void;
  language: Language;
  translations: any;
}

const Clients: React.FC<ClientsProps> = ({ onClose, language, translations: t }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const data = await getClients();
      setClients(data);
      setLoading(false);
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  if (selectedClientId) {
    return (
      <ClientProfile 
        clientId={selectedClientId} 
        onBack={() => setSelectedClientId(null)}
        language={language}
        translations={t}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-premium-gold" />
            {t.clients || "My Clients"}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={t.searchClients || "Search by name or phone..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-premium-gold transition-all"
          />
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-premium-gold animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading your beauty log...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="space-y-3">
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedClientId(client.id)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-premium-gold transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-premium-gold/10 flex items-center justify-center text-premium-gold font-bold text-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-premium-gold transition-colors">
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone || "No phone"}
                      </span>
                      {client.visitCount && (
                        <span className="flex items-center gap-1 text-premium-gold font-medium">
                          <Heart className="w-3 h-3 fill-current" />
                          {client.visitCount} visits
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-premium-gold transition-colors" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No clients found</h3>
            <p className="text-slate-500">Try searching for a different name or add a new booking.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Clients;
