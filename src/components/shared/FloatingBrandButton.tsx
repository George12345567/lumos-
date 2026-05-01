import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Wand2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function FloatingBrandButton() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 400px
      if (window.scrollY > 400 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msgAr = `أهلاً Lumos ✨\nعندي فكرة ومحتاج أحولها لبراند حقيقي من الصفر (A to Z).\nممكن تفاصيل رحلة بناء الهوية البصرية الكاملة؟`;
    const msgEn = `Hi Lumos ✨\nI have an idea and I want to turn it into a real brand from zero (A to Z).\nCan you share the details of the full Brand Identity journey?`;
    const text = encodeURIComponent(isAr ? msgAr : msgEn);
    window.open(`https://wa.me/201277636616?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`fixed bottom-6 ${isAr ? 'right-6' : 'left-6'} z-[100]`}
          dir={isAr ? 'rtl' : 'ltr'}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* The Orb / Card Container */}
          <motion.div
            animate={{ 
              width: isHovered ? (isAr ? 280 : 300) : 56,
              height: isHovered ? 136 : 56,
              borderRadius: isHovered ? 20 : 28,
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className={`relative overflow-hidden cursor-pointer flex items-center shadow-2xl ${
              isHovered 
                ? 'bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20' 
                : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 border border-white/30'
            }`}
            onClick={() => !isHovered && setIsHovered(true)}
          >
            {/* --- STATE 1: THE PULSING ORB (Visible when NOT hovered) --- */}
            <AnimatePresence>
              {!isHovered && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute inset-0 flex items-center justify-center w-full h-full"
                >
                  {/* Glowing inner effect */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-white/20 rounded-full blur-sm"
                  />
                  <Wand2 className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] z-10" />
                  
                  {/* Rotating magical border */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(255,255,255,0.9)_360deg)] opacity-30"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- STATE 2: THE EXPANDED MAGIC CARD (Visible when hovered) --- */}
            <AnimatePresence>
              {isHovered && (
                <motion.div 
                  initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute inset-0 p-4 flex flex-col justify-between w-full h-full"
                >
                  {/* Close button inside card */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
                    className={`absolute top-2.5 ${isAr ? 'left-2.5' : 'right-2.5'} p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="pr-5">
                    <h3 className="text-white font-black text-base leading-tight mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {isAr ? 'أشعل شرارة براندك' : 'Ignite Your Brand'}
                    </h3>
                    <p className="text-slate-300 text-[11px] font-medium leading-relaxed max-w-[90%]">
                      {isAr 
                        ? 'عندك فكرة؟ سيب لنا بناء براند أقوى من المنافسين من الصفر (A to Z).' 
                        : 'Have an idea? Let us build a standout brand from zero (A to Z).'}
                    </p>
                  </div>

                  <button
                    onClick={handleWhatsAppClick}
                    className="mt-2 w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 p-[1px] shadow-lg shadow-emerald-500/20 transition-all hover:shadow-teal-500/30 hover:scale-[1.01]"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-950/40 backdrop-blur-sm px-3 text-xs font-bold text-white transition-colors group-hover:bg-transparent">
                      {isAr ? 'ابدأ السحر الآن' : 'Start the Magic'}
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${isAr ? 'rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0' : ''}`} />
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Floating particle effects below the orb (only when not hovered) */}
          <AnimatePresence>
            {!isHovered && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-3 bg-emerald-500/30 blur-lg rounded-full" 
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
