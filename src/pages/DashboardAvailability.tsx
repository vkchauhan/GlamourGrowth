import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

interface AvailabilityItem {
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const DashboardAvailability: React.FC = () => {
  const [availability, setAvailability] = useState<AvailabilityItem[]>(
    DAYS.map((_, i) => ({
      day_of_week: i,
      start_time: '10:00',
      end_time: '18:00',
      enabled: i >= 1 && i <= 5, // Default Mon-Fri
    }))
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const artistId = 'priya-makeup'; // Hardcoded for MVP

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const payload = availability
        .filter(a => a.enabled)
        .map(({ day_of_week, start_time, end_time }) => ({
          day_of_week, start_time, end_time
        }));

      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artistId, availability: payload }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (index: number, updates: Partial<AvailabilityItem>) => {
    const newAvail = [...availability];
    newAvail[index] = { ...newAvail[index], ...updates };
    setAvailability(newAvail);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Working Hours</h2>
          <p className="text-gray-500 text-sm">Set your weekly availability for bookings.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
            saved 
              ? 'bg-green-600 text-white' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : saved ? (
            <CheckCircle2 size={20} />
          ) : (
            <Save size={20} />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {availability.map((day, index) => (
            <div key={day.day_of_week} className="p-6 flex items-center gap-8">
              <div className="w-32 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                  {DAYS[day.day_of_week]}
                </span>
              </div>

              <div className={`flex items-center gap-4 flex-1 ${!day.enabled && 'opacity-30 pointer-events-none'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => updateDay(index, { start_time: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => updateDay(index, { end_time: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {!day.enabled && (
                <span className="text-sm text-gray-400 font-medium italic">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardAvailability;
