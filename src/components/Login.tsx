import { useState, useEffect, useRef } from "react";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  auth 
} from "../services/firebase";
import { Phone, KeyRound, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language } from "../types";
import en from "../locales/en.json";
import hi from "../locales/hi.json";

const translations = {
  [Language.EN]: en,
  [Language.HI]: hi,
};

interface LoginProps {
  language: Language;
  onLoginSuccess: (user: any) => void;
}

export default function Login({ language, onLoginSuccess }: LoginProps) {
  const t = translations[language];
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const recaptchaRef = useRef<any>(null);

  const initRecaptcha = async () => {
    try {
      if (!recaptchaRef.current) {
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          console.error("reCAPTCHA container not found");
          return;
        }
        
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            setError("reCAPTCHA expired. Please try again.");
          }
        });
        
        await recaptchaRef.current.render();
      }
    } catch (err: any) {
      console.error("reCAPTCHA init error:", err);
      setError("Security check failed to load. This is often caused by ad-blockers or network restrictions. Please disable any ad-blockers and try again.");
    }
  };

  useEffect(() => {
    initRecaptcha();

    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e);
        }
        recaptchaRef.current = null;
      }
    };
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError(t.invalidPhone);
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      if (!recaptchaRef.current) {
        throw new Error("Security check not initialized. Please refresh the page.");
      }
      
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaRef.current);
      setConfirmationResult(confirmation);
      setStep("otp");
    } catch (err: any) {
      console.error("Error sending OTP", err);
      
      let errorMessage = err.message || "Failed to send OTP. Please check your network.";
      
      if (err.code === 'auth/billing-not-enabled') {
        errorMessage = "Billing not enabled: Please go to Firebase Console and link a billing account (Blaze Plan) to use Phone Authentication.";
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = "Domain not authorized: Please add this app's domain to 'Authorized Domains' in your Firebase Authentication settings.";
      } else if (err.code === 'auth/network-request-failed' || errorMessage.includes('network')) {
        errorMessage = "Network error: Please check your internet connection or disable ad-blockers/VPNs that might be blocking Google services.";
      }
      
      setError(errorMessage);
      
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
          // Trigger re-init
          initRecaptcha();
        } catch (e) {
          console.error("Error resetting reCAPTCHA:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError(t.invalidOtp);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (confirmationResult) {
        const result = await confirmationResult.confirm(otp);
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      console.error("Error verifying OTP", err);
      setError(t.invalidOtp);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-premium-bg flex items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[48px] p-8 lg:p-12 shadow-2xl border border-premium-border"
      >
        <div className="text-center space-y-4 mb-10">
          <div className="w-16 h-16 bg-premium-ink rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-black/10">
            <Sparkles className="w-8 h-8 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-medium tracking-tight">{t.welcomeBack}</h1>
          <p className="text-[#666] font-light italic">{t.loginSub}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.div 
              key="phone-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.phoneNumber}</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-premium-gold" />
                  <input 
                    type="tel" 
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-5 pl-14 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                  />
                </div>
              </div>

              {error && (
                <div className="space-y-2">
                  <p className="text-red-500 text-sm font-medium italic">{error}</p>
                  {(error.includes("security") || error.includes("Network") || error.includes("Security check")) && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[#8E8E8E] leading-relaxed">
                        Tip: Try disabling ad-blockers or checking your VPN/Firewall settings.
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            setError("");
                            initRecaptcha();
                          }}
                          className="text-premium-gold text-[10px] font-bold uppercase tracking-widest hover:underline"
                        >
                          Retry Security Check
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-[#8E8E8E] text-[10px] font-bold uppercase tracking-widest hover:underline"
                        >
                          Refresh Page
                        </button>
                      </div>
                    </div>
                  )}
                  {error.includes("Domain not authorized") && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[#8E8E8E] leading-relaxed">
                        Copy this domain and add it to <b>Authentication &gt; Settings &gt; Authorized domains</b> in Firebase Console:
                      </p>
                      <code className="block p-2 bg-black/5 rounded text-[10px] break-all">
                        {window.location.hostname}
                      </code>
                      <a 
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-premium-gold text-[10px] font-bold uppercase tracking-widest hover:underline"
                      >
                        Open Firebase Console
                      </a>
                    </div>
                  )}
                  {error.includes("Billing not enabled") && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[#8E8E8E] leading-relaxed">
                        Note: Phone Authentication requires a linked billing account in Firebase (Blaze Plan).
                      </p>
                      <a 
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-premium-gold text-[10px] font-bold uppercase tracking-widest hover:underline"
                      >
                        Open Firebase Console
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-premium-ink text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 text-premium-gold" />}
                {t.sendOtp}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="otp-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.enterOtp}</label>
                <div className="relative">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-premium-gold" />
                  <input 
                    type="text" 
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full p-5 pl-14 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium tracking-[0.5em] text-center"
                  />
                </div>
                <p className="text-[10px] text-[#8E8E8E] italic">{t.otpSent}</p>
              </div>

              {error && (
                <div className="space-y-2">
                  <p className="text-red-500 text-sm font-medium italic">{error}</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep("phone")}
                      className="text-[10px] text-premium-gold uppercase tracking-widest hover:underline"
                    >
                      Try another number
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-[10px] text-[#8E8E8E] uppercase tracking-widest hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full bg-premium-ink text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-premium-gold" />}
                {t.verifyOtp}
              </button>

              <button 
                onClick={() => setStep("phone")}
                className="w-full text-[#8E8E8E] text-sm font-medium hover:text-premium-ink transition-colors"
              >
                Back to Phone Number
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  );
}
