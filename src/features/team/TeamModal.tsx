import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const team = [
  {
    id: "01",
    name: "Jake",
    roleEn: "Co-Founder & Technical Manager",
    roleAr: "المؤسس المشارك ومدير تقني",
    descEn: "Engineering graduate who personally oversees every project — from kickoff to delivery. Nothing ships without his sign-off.",
    descAr: "خريج هندسة يشرف شخصياً على كل مشروع — من البداية حتى التسليم. لا شيء يُسلَّم دون موافقته.",
    photo: "/team/JAKE.jpeg",
    accent: "#00ff88",
    tag: "Engineering · Management",
  },
  {
    id: "02",
    name: "John",
    roleEn: "Co-Founder, Manager & Investor",
    roleAr: "المؤسس المشارك، المدير والمستثمر",
    descEn: "The strategist and backer behind Lumos. Engineering roots, investor mindset — he makes sure the agency grows as fast as the clients do.",
    descAr: "العقل الاستراتيجي والممول خلف Lumos. خلفية هندسية وعقلية مستثمر — يضمن نمو الوكالة بنفس سرعة نمو العملاء.",
    photo: "/team/JOHN.jpeg",
    accent: "#4f9eff",
    tag: "Strategy · Investment",
  },
  {
    id: "03",
    name: "Mariam",
    roleEn: "Graphic Designer",
    roleAr: "مصممة جرافيك",
    descEn: "The creative engine. Every logo, brand identity, and visual you see from Lumos passes through her hands first.",
    descAr: "المحرك الإبداعي. كل شعار وهوية بصرية وتصميم تراه من Lumos يمر بين يديها أولاً.",
    photo: "/team/MARIAM.jpeg",
    accent: "#ff6eb4",
    tag: "Design · Brand Identity",
  },
];

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
}

const TeamModal = ({ open, onClose }: TeamModalProps) => {
  const { isArabic } = useLanguage();
  const [active, setActive] = useState(0);
  const member = team[active];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // reset on open
  useEffect(() => { if (open) setActive(0); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-5xl rounded-2xl overflow-hidden"
            style={{ background: "#0c0c0c", border: "1px solid #1a1a1a" }}
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            dir={isArabic ? "rtl" : "ltr"}
          >
            {/* Noise texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            />

            {/* Accent glow top */}
            <motion.div
              className="absolute top-0 inset-x-0 h-px"
              animate={{ background: `linear-gradient(90deg, transparent, ${member.accent}80, transparent)` }}
              transition={{ duration: 0.4 }}
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white transition-colors"
              style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
            >
              <X size={15} />
            </button>

            <div className="relative z-10 flex flex-col md:flex-row h-auto md:h-[540px]">

              {/* LEFT — Photo + info */}
              <div className="relative w-full md:w-[42%] flex-shrink-0 h-64 md:h-full overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={member.photo}
                    src={member.photo}
                    alt={member.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.45 }}
                  />
                </AnimatePresence>

                {/* Photo gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/30 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0c0c0c]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent" />

                {/* Number badge */}
                <div
                  className="absolute top-5 left-5 text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{ color: member.accent, background: `${member.accent}18`, border: `1px solid ${member.accent}30` }}
                >
                  {member.id}
                </div>

                {/* Accent glow on photo edge */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  animate={{ background: `linear-gradient(90deg, ${member.accent}60, transparent)` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* RIGHT — Content */}
              <div className="flex flex-col justify-between flex-1 p-6 sm:p-8 md:p-10">

                {/* Top: Member selector tabs */}
                <div className="flex gap-2 mb-8 flex-wrap">
                  {team.map((m, i) => (
                    <motion.button
                      key={m.id}
                      onClick={() => setActive(i)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                      style={
                        active === i
                          ? { color: m.accent, background: `${m.accent}18`, border: `1px solid ${m.accent}50` }
                          : { color: "#666", background: "#ffffff06", border: "1px solid #ffffff0f" }
                      }
                    >
                      {m.name}
                      {active === i && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          layoutId="activeTab"
                          style={{ boxShadow: `0 0 12px ${m.accent}30` }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Member info */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1"
                  >
                    {/* Tag */}
                    <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: member.accent }}>
                      {member.tag}
                    </p>

                    {/* Name */}
                    <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 leading-none tracking-tight">
                      {member.name}
                    </h2>

                    {/* Role */}
                    <p className="text-base font-medium mb-6" style={{ color: "#888" }}>
                      {isArabic ? member.roleAr : member.roleEn}
                    </p>

                    {/* Divider */}
                    <motion.div
                      className="h-px mb-6 w-16"
                      animate={{ background: member.accent }}
                      transition={{ duration: 0.4 }}
                    />

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-white/50 max-w-sm">
                      {isArabic ? member.descAr : member.descEn}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Bottom: dots + label */}
                <div className="flex items-center gap-3 mt-8">
                  {team.map((m, i) => (
                    <motion.button
                      key={m.id}
                      onClick={() => setActive(i)}
                      animate={{
                        width: active === i ? 24 : 6,
                        background: active === i ? m.accent : "#333",
                      }}
                      className="h-1.5 rounded-full cursor-pointer"
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                  <span className="text-xs text-white/20 font-mono ml-2">
                    {member.id} / 03
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamModal;
