import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { UserDailyTask } from '../types';
import PersonalizedTaskCard from '../components/PersonalizedTaskCard';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { Loader2, Sparkles } from 'lucide-react';

interface DailyGrowthScreenProps {
  language: 'en' | 'hi';
  translations: any;
}

export default function DailyGrowthScreen({ language, translations: t }: DailyGrowthScreenProps) {
  const [task, setTask] = useState<UserDailyTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Ensure task is generated for today
        await NotificationScheduler.checkAndGenerateDailyTask();

        const today = new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, "user_daily_tasks"),
          where("user_id", "==", user.uid),
          where("date", "==", today),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setTask({
            id: docData.id,
            ...docData.data()
          } as UserDailyTask);
        }
      } catch (error) {
        console.error("Error fetching daily task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, []);

  const handleComplete = async (taskId: string, points: number) => {
    try {
      const taskRef = doc(db, "user_daily_tasks", taskId);
      await updateDoc(taskRef, {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      setTask(prev => prev ? { ...prev, status: 'completed' } : null);

      // Log analytics
      await NotificationScheduler.completeTask(taskId, points);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-premium-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-premium-gold" />
          <h2 className="text-3xl font-serif font-medium italic">{t.dailyGrowthTask}</h2>
        </div>
        <p className="text-[#666] text-lg font-light italic">
          {t.dailyGrowthTaskSub || "Small daily actions to grow your makeup business."}
        </p>
      </header>

      {task ? (
        <PersonalizedTaskCard 
          task={task} 
          onComplete={handleComplete} 
          language={language}
          translations={t}
        />
      ) : (
        <div className="bg-premium-bg/30 rounded-[32px] p-12 text-center border border-dashed border-premium-border">
          <p className="text-[#8E8E8E] italic">{t.noTaskToday}</p>
        </div>
      )}
    </div>
  );
}
