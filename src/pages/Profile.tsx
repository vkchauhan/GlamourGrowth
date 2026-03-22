import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Briefcase, 
  MapPin, 
  Info, 
  Camera, 
  Share2, 
  CheckCircle2, 
  Instagram, 
  Phone,
  ArrowLeft,
  Sparkles,
  Award
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Language } from '../types';
import { cn } from '../lib/utils';

interface ProfileProps {
  language: Language;
  translations: any;
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ language, translations: t, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCard, setShowCard] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    expertise: '',
    experience: '',
    areas: '',
    bio: '',
    instagram: '',
    profileImage: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      
      try {
        const docRef = doc(db, 'profiles', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setFormData({
            name: data.name || '',
            expertise: data.expertise?.join(', ') || '',
            experience: data.experience?.toString() || '',
            areas: data.areas?.join(', ') || '',
            bio: data.bio || '',
            instagram: data.instagram || '',
            profileImage: data.profileImage || ''
          });
        } else {
          // Default values from auth
          setFormData(prev => ({
            ...prev,
            name: auth.currentUser?.displayName || '',
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);

    const updatedProfile: UserProfile = {
      uid: auth.currentUser.uid,
      name: formData.name,
      expertise: formData.expertise.split(',').map(s => s.trim()).filter(s => s !== ''),
      experience: parseInt(formData.experience) || 0,
      areas: formData.areas.split(',').map(s => s.trim()).filter(s => s !== ''),
      bio: formData.bio,
      instagram: formData.instagram,
      profileImage: formData.profileImage,
      phone: auth.currentUser.phoneNumber || ''
    };

    try {
      await setDoc(doc(db, 'profiles', auth.currentUser.uid), updatedProfile);
      setProfile(updatedProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const shareBusinessCard = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.name} - Professional Makeup Artist`,
        text: `Check out my professional profile on Glamour Growth! I specialize in ${profile?.expertise.join(', ')}.`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: Copy to clipboard
      const text = `${profile?.name} - Professional Makeup Artist\nSpecialist in: ${profile?.expertise.join(', ')}\nExperience: ${profile?.experience} Years\nAreas: ${profile?.areas.join(', ')}`;
      navigator.clipboard.writeText(text);
      alert("Business card details copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-12 pb-20 p-6 lg:p-12">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-premium-bg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl lg:text-5xl font-serif font-medium tracking-tight">{t.myStudio}</h2>
            <p className="text-[#666] mt-2 lg:mt-3 text-base lg:text-lg font-light italic">{t.myStudioSub}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCard(true)}
          className="bg-premium-bg border border-premium-border p-4 rounded-2xl flex items-center gap-2 hover:bg-white transition-all shadow-sm group"
        >
          <Award className="w-5 h-5 text-premium-gold group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{t.digitalCard}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 lg:p-10 rounded-[32px] border border-premium-border shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-premium-bg overflow-hidden bg-premium-bg flex items-center justify-center">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-[#8E8E8E]" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-premium-ink text-white p-2.5 rounded-full cursor-pointer hover:bg-[#333] transition-all shadow-lg border-2 border-white">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold">{t.artistName}</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                    placeholder="e.g. Ananya Sharma"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Briefcase className="w-3 h-3 text-premium-gold" />
                  {t.expertise}
                </label>
                <input 
                  type="text" 
                  value={formData.expertise}
                  onChange={(e) => setFormData({...formData, expertise: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                  placeholder="e.g. Bridal, Party, Editorial"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-premium-gold" />
                  {t.experience}
                </label>
                <input 
                  type="number" 
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-premium-gold" />
                  {t.areas}
                </label>
                <input 
                  type="text" 
                  value={formData.areas}
                  onChange={(e) => setFormData({...formData, areas: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                  placeholder="e.g. South Delhi, Gurgaon"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                  <Instagram className="w-3 h-3 text-premium-gold" />
                  Instagram
                </label>
                <input 
                  type="text" 
                  value={formData.instagram}
                  onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-premium-border bg-premium-bg focus:outline-none font-medium"
                  placeholder="@yourhandle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E8E] font-bold flex items-center gap-2">
                <Info className="w-3 h-3 text-premium-gold" />
                {t.bio}
              </label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full p-6 rounded-[24px] border border-premium-border bg-premium-bg focus:outline-none min-h-[120px] resize-none font-light italic"
                placeholder="Tell your clients about your style and passion..."
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-premium-ink text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-premium-gold" />
                )}
                {t.updateProfile}
              </button>
            </div>

            <AnimatePresence>
              {showSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 text-sm font-bold"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {t.profileUpdated}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Preview / Business Card */}
        <div className="space-y-8">
          <div className="sticky top-24 space-y-6">
            <h4 className="text-[10px] uppercase tracking-[0.25em] text-premium-gold font-bold px-2">Preview</h4>
            
            {/* Digital Business Card */}
            <div className="relative aspect-[3/4] w-full max-w-[320px] mx-auto bg-premium-ink rounded-[40px] overflow-hidden shadow-2xl group">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#D4AF37_0%,transparent_70%)]" />
              </div>

              <div className="relative h-full p-8 flex flex-col justify-between text-white">
                <div className="space-y-6">
                  <div className="w-20 h-20 rounded-full border-2 border-premium-gold overflow-hidden bg-white/10">
                    {formData.profileImage ? (
                      <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-premium-gold" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-serif font-medium">{formData.name || 'Your Name'}</h3>
                    <p className="text-premium-gold text-xs uppercase tracking-[0.2em] font-bold mt-1">
                      {formData.expertise ? formData.expertise.split(',')[0] : 'Makeup Artist'} {t.specialist}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-sm text-white/70">
                      <Award className="w-4 h-4 text-premium-gold" />
                      <span>{formData.experience || '0'} {t.years} {t.experience}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-premium-gold" />
                      <span>{t.operatingIn} {formData.areas || 'Your City'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-px bg-white/10 w-full" />
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[8px] uppercase tracking-widest text-white/40">{t.connectWithMe}</p>
                      <div className="flex gap-3">
                        {formData.instagram && <Instagram className="w-4 h-4 text-white/60" />}
                        <Phone className="w-4 h-4 text-white/60" />
                      </div>
                    </div>
                    <div className="bg-premium-gold p-3 rounded-2xl">
                      <Sparkles className="w-5 h-5 text-premium-ink" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={shareBusinessCard}
              className="w-full max-w-[320px] mx-auto bg-white border border-premium-border p-5 rounded-3xl flex items-center justify-center gap-3 font-bold hover:bg-premium-bg transition-all shadow-sm group"
            >
              <Share2 className="w-5 h-5 text-premium-gold group-hover:scale-110 transition-transform" />
              {t.shareCard}
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Card Modal */}
      <AnimatePresence>
        {showCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <button 
              onClick={() => setShowCard(false)}
              className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md aspect-[3/4] bg-premium-ink rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.2)] relative"
            >
              {/* High-end design for the full card */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-premium-gold/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-premium-gold/5 blur-[100px] rounded-full -ml-32 -mb-32" />
              </div>

              <div className="relative h-full p-12 flex flex-col justify-between text-white">
                <div className="space-y-10">
                  <div className="flex justify-between items-start">
                    <div className="w-28 h-28 rounded-full border-2 border-premium-gold p-1">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white/5">
                        {formData.profileImage ? (
                          <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-10 h-10 text-premium-gold" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Sparkles className="w-8 h-8 text-premium-gold ml-auto" />
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-4">Certified</p>
                      <p className="text-sm font-serif italic text-premium-gold">Professional</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-4xl font-serif font-medium tracking-tight">{formData.name || 'Your Name'}</h3>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.expertise.split(',').map((exp, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full text-white/60">
                          {exp.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40">{t.experience}</p>
                      <p className="text-xl font-serif">{formData.experience || '0'} {t.years}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-white/40">{t.areas}</p>
                      <p className="text-xl font-serif">{formData.areas.split(',')[0] || 'City'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                    <p className="text-sm font-light italic text-white/80 leading-relaxed">
                      "{formData.bio || 'Professional makeup artist dedicated to bringing out your natural beauty.'}"
                    </p>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="space-y-4">
                      {formData.instagram && (
                        <div className="flex items-center gap-3 text-white/60">
                          <Instagram className="w-5 h-5" />
                          <span className="text-sm">{formData.instagram}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-white/60">
                        <Phone className="w-5 h-5" />
                        <span className="text-sm">{auth.currentUser?.phoneNumber || 'Contact Me'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-2">Powered by</p>
                      <p className="text-xs font-serif italic text-white/40">Glamour Growth</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
