import { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  RefreshCcw, 
  Loader2, 
  Image as ImageIcon,
  Instagram,
  FileText,
  Hash,
  Video,
  Layout,
  MousePointer2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language } from "../types";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import { geminiService } from "../services/geminiService";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const translations = {
  [Language.EN]: en,
  [Language.HI]: hi,
};

interface InstagramCreatorProps {
  language: Language;
}

const CONTENT_TYPES = [
  "Bridal Makeup",
  "Party Makeup",
  "Engagement Look",
  "Reception Look",
  "Festival Makeup",
  "Soft Glam",
  "Client Transformation",
  "Portfolio Showcase"
];

export default function InstagramCreator({ language }: InstagramCreatorProps) {
  const t = translations[language];
  const [image, setImage] = useState<string | null>(null);
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(t.invalidFormat);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t.fileTooLarge);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      alert(t.pleaseUploadPhoto);
      return;
    }
    setLoading(true);
    try {
      const data = await geminiService.generateInstagramPost(image, contentType, language);
      setResult(data);
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const contentTypeTranslations: Record<string, string> = {
    "Bridal Makeup": t.bridalMakeup,
    "Party Makeup": t.partyMakeup,
    "Engagement Look": t.engagementLook,
    "Reception Look": t.receptionLook,
    "Festival Makeup": t.festivalMakeup,
    "Soft Glam": t.softGlam,
    "Client Transformation": t.clientTransformation,
    "Portfolio Showcase": t.portfolioShowcase,
  };

  return (
    <div className="space-y-8 lg:space-y-12">
      <header>
        <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight flex items-center gap-3">
          <Instagram className="text-premium-gold w-8 h-8 lg:w-12 lg:h-12" />
          {t.instagramCreator}
        </h2>
        <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.instagramCreatorSub}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Upload & Selection */}
        <div className="space-y-8">
          <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm space-y-8">
            {/* Upload Section */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.uploadMakeupPhoto}</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-premium-border hover:border-premium-gold hover:bg-premium-bg transition-all group"
                >
                  <Camera className="w-6 h-6 text-premium-gold group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.capturePhoto}</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-premium-border hover:border-premium-gold hover:bg-premium-bg transition-all group"
                >
                  <Upload className="w-6 h-6 text-premium-gold group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.uploadGallery}</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="user" onChange={handleFileChange} />
              </div>

              {image && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-premium-border bg-premium-bg"
                >
                  <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>

            {/* Content Type Selection */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectContentType}</label>
              <div className="grid grid-cols-2 gap-3">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all duration-300",
                      contentType === type 
                        ? "bg-premium-ink text-white border-premium-ink shadow-lg scale-[1.02]" 
                        : "bg-premium-bg border-premium-border text-premium-ink hover:border-premium-gold"
                    )}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider">{contentTypeTranslations[type] || type}</p>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading || !image}
              className="w-full bg-premium-ink text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-premium-gold" />}
              {t.generateInstagramPost}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white p-12 lg:p-20 rounded-[32px] lg:rounded-[48px] border border-premium-border text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[500px]"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-premium-gold/20 border-t-premium-gold rounded-full animate-spin" />
                  <Instagram className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-premium-gold animate-pulse" />
                </div>
                <p className="text-[#8E8E8E] text-lg font-light italic">{t.generatingContent}</p>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Caption Section */}
                <ResultCard 
                  title={t.caption} 
                  content={result.caption} 
                  icon={FileText} 
                  onCopy={() => copyToClipboard(result.caption, 'caption')}
                  isCopied={copiedSection === 'caption'}
                  t={t}
                />

                {/* Hashtags Section */}
                <ResultCard 
                  title={t.hashtags} 
                  content={result.hashtags} 
                  icon={Hash} 
                  onCopy={() => copyToClipboard(result.hashtags, 'hashtags')}
                  isCopied={copiedSection === 'hashtags'}
                  t={t}
                />

                {/* Reel Script Section */}
                <ResultCard 
                  title={t.reelScript} 
                  content={result.reelScript} 
                  icon={Video} 
                  onCopy={() => copyToClipboard(result.reelScript, 'reelScript')}
                  isCopied={copiedSection === 'reelScript'}
                  t={t}
                />

                {/* Story Text Section */}
                <ResultCard 
                  title={t.storyText} 
                  content={result.storyText} 
                  icon={Layout} 
                  onCopy={() => copyToClipboard(result.storyText, 'storyText')}
                  isCopied={copiedSection === 'storyText'}
                  t={t}
                />

                {/* CTA Section */}
                <ResultCard 
                  title={t.callToAction} 
                  content={result.cta} 
                  icon={MousePointer2} 
                  onCopy={() => copyToClipboard(result.cta, 'cta')}
                  isCopied={copiedSection === 'cta'}
                  t={t}
                />

                <button 
                  onClick={handleGenerate}
                  className="w-full py-4 rounded-2xl border border-premium-border text-[#8E8E8E] font-bold text-xs uppercase tracking-widest hover:bg-premium-bg hover:text-premium-ink transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  {t.regenerate}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-12 lg:p-20 rounded-[32px] lg:rounded-[48px] border border-premium-border text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[500px]"
              >
                <div className="w-20 h-20 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-[#8E8E8E]" />
                </div>
                <p className="text-[#8E8E8E] text-lg font-light italic">
                  {image ? "Select a content type and generate your post." : "Upload a makeup photo to generate Instagram content."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  title: string;
  content: string;
  icon: any;
  onCopy: () => void;
  isCopied: boolean;
  t: any;
}

function ResultCard({ title, content, icon: Icon, onCopy, isCopied, t }: ResultCardProps) {
  return (
    <div className="bg-white p-6 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-premium-border shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-premium-bg border border-premium-border">
            <Icon className="w-4 h-4 text-premium-gold" />
          </div>
          <h4 className="text-[10px] lg:text-[11px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{title}</h4>
        </div>
        <button 
          onClick={onCopy}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
            isCopied 
              ? "bg-green-50 border-green-200 text-green-600" 
              : "bg-premium-bg border-premium-border text-[#8E8E8E] hover:text-premium-ink"
          )}
        >
          {isCopied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {isCopied ? t.copied : t.copy}
        </button>
      </div>
      <div className="bg-premium-bg/50 p-5 rounded-2xl border border-premium-border/50">
        <p className="text-premium-ink leading-relaxed whitespace-pre-wrap text-sm lg:text-base font-light italic">
          {content}
        </p>
      </div>
    </div>
  );
}
