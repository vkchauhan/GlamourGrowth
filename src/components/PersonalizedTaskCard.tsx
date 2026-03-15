import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { UserDailyTask } from '../types';

interface PersonalizedTaskCardProps {
  task: UserDailyTask;
  onComplete: (taskId: string, points: number) => void;
  language: 'en' | 'hi';
  translations: any;
}

export default function PersonalizedTaskCard({ task, onComplete, language, translations: t }: PersonalizedTaskCardProps) {
  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-8 shadow-xl border border-premium-border relative overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-premium-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-premium-ink rounded-2xl">
            <TrendingUp className="w-6 h-6 text-premium-gold" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">
              {t.dailyGrowthTask}
            </h4>
            <p className="text-xl font-serif font-medium italic mt-0.5">
              {language === 'hi' ? task.title_hi : task.title_en}
            </p>
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            {t.done}
          </div>
        )}
      </div>

      <p className="text-[#666] text-lg font-light italic mb-8 leading-relaxed">
        "{language === 'hi' ? task.body_hi : task.body_en}"
      </p>

      <div className="flex items-center justify-between pt-6 border-t border-premium-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-premium-gold/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-premium-gold" />
          </div>
          <span className="text-sm font-bold text-premium-ink">
            +{task.points} {t.growthPoints}
          </span>
        </div>

        {!isCompleted && (
          <button
            onClick={() => onComplete(task.id, task.points)}
            className="flex items-center gap-2 bg-premium-ink text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#333] transition-all group"
          >
            {t.markComplete}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
