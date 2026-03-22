import { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language } from "../types";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import { geminiService } from "../services/geminiService";

const translations = {
  [Language.EN]: en,
  [Language.HINGLISH]: hi,
};

interface VirtualTryOnProps {
  language: Language;
}

const OCCASIONS = [
  "Bridal / Wedding",
  "Pre-Wedding",
  "Party",
  "Reception",
  "Engagement",
  "Occasion Look",
  "Natural Look"
];

export default function VirtualTryOn({ language }: VirtualTryOnProps) {
  const t = translations[language];
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Max 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    setLoading(true);
    try {
      const variations = await geminiService.generateMakeupTryOn(originalImage, occasion);
      setResults(variations);
    } catch (error: any) {
      console.error("Generation failed", error);
      alert("Failed to generate makeup looks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `makeup-look-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const occasionTranslations: Record<string, string> = {
    "Bridal / Wedding": t.bridalsWedding,
    "Pre-Wedding": t.preWeddingOccasion,
    "Party": t.partyOccasion,
    "Reception": t.receptionOccasion,
    "Engagement": t.engagementOccasion,
    "Occasion Look": t.festivalLook,
    "Natural Look": t.naturalLook,
  };

  return (
    <div className="space-y-8 lg:space-y-12">
      <header>
        <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.virtualTryOn}</h2>
        <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.virtualTryOnSub}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Upload & Controls */}
        <div className="space-y-8">
          <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[40px] border border-premium-border shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-premium-border hover:border-premium-gold hover:bg-premium-bg transition-all group"
              >
                <Camera className="w-6 h-6 text-premium-gold group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.capturePhoto}</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-premium-border hover:border-premium-gold hover:bg-premium-bg transition-all group"
              >
                <Upload className="w-6 h-6 text-premium-gold group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.uploadGallery}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="user" 
                onChange={handleFileChange} 
              />
            </div>

            {originalImage && (
              <div className="space-y-6">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-premium-border bg-premium-bg">
                  <img src={originalImage} alt="Original" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {t.originalImage}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.selectOccasion}</label>
                  <select 
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none focus:ring-2 focus:ring-premium-gold/20 font-medium"
                  >
                    {OCCASIONS.map(o => <option key={o} value={o}>{occasionTranslations[o] || o}</option>)}
                  </select>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={loading || !originalImage}
                  className="w-full bg-premium-ink text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-premium-gold" />}
                  {t.generateMakeupLooks}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-8">
          {loading ? (
            <div className="bg-white p-12 lg:p-20 rounded-[32px] lg:rounded-[48px] border border-premium-border text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-premium-gold/20 border-t-premium-gold rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-premium-gold animate-pulse" />
              </div>
              <p className="text-[#8E8E8E] text-lg font-light italic">{t.creatingLooks}</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {/* Compare View */}
              {compareIndex !== null && (
                <div className="bg-white p-6 rounded-[32px] border border-premium-border shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-premium-gold">{t.compare}</h4>
                    <button 
                      onClick={() => setCompareIndex(null)}
                      className="text-xs font-bold text-[#8E8E8E] hover:text-premium-ink"
                    >
                      {t.cancel}
                    </button>
                  </div>
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-premium-border bg-premium-bg select-none">
                    {/* Original (Bottom) */}
                    <img src={originalImage!} className="absolute inset-0 w-full h-full object-cover" alt="Before" referrerPolicy="no-referrer" />
                    
                    {/* Result (Top) */}
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderPos}%` }}
                    >
                      <img src={results[compareIndex]} className="absolute inset-0 w-full h-full object-cover" style={{ width: `calc(100% * (100 / ${sliderPos}))` }} alt="After" referrerPolicy="no-referrer" />
                    </div>

                    {/* Slider Handle */}
                    <div 
                      className="absolute inset-y-0 w-1 bg-white shadow-xl cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white shadow-xl border border-premium-border flex items-center justify-center -mx-4">
                        <div className="flex gap-0.5">
                          <ChevronLeft className="w-3 h-3 text-premium-ink" />
                          <ChevronRight className="w-3 h-3 text-premium-ink" />
                        </div>
                      </div>
                    </div>

                    {/* Invisible Input for Slider */}
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={sliderPos} 
                      onChange={(e) => setSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                    />

                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                      Before
                    </div>
                    <div className="absolute bottom-4 right-4 px-3 py-1 bg-premium-gold/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                      After
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of Results */}
              <div className="grid grid-cols-2 gap-4">
                {results.map((res, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-premium-border bg-premium-bg"
                  >
                    <img src={res} alt={`Look ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button 
                        onClick={() => setCompareIndex(i)}
                        className="p-3 rounded-full bg-white text-premium-ink hover:bg-premium-gold hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => downloadImage(res, i)}
                        className="p-3 rounded-full bg-white text-premium-ink hover:bg-premium-gold hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0 delay-75"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute top-4 left-4 px-3 py-1 bg-premium-gold/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                      {t.look} {i + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 lg:p-20 rounded-[32px] lg:rounded-[48px] border border-premium-border text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 rounded-full bg-premium-bg border border-premium-border flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-[#8E8E8E]" />
              </div>
              <p className="text-[#8E8E8E] text-lg font-light italic">
                {originalImage ? "Select an occasion and generate your looks." : "Upload a photo to start the virtual try-on."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
