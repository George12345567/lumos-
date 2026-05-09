import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    const handler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) setActive(0);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            aria-label={isArabic ? "إغلاق النافذة" : "Close modal"}
          />

          <motion.div
            className="relative flex max-h-[calc(100vh-48px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/75 bg-card text-card-foreground shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 18 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            dir={isArabic ? "rtl" : "ltr"}
            role="dialog"
            aria-modal="true"
            aria-label={isArabic ? "تفاصيل الفريق" : "Team details"}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
              }}
            />

            <motion.div
              className="absolute inset-x-0 top-0 h-px"
              animate={{ background: `linear-gradient(90deg, transparent, ${member.accent}80, transparent)` }}
              transition={{ duration: 0.3 }}
            />

            <button
              type="button"
              onClick={onClose}
              className="absolute end-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground"
              aria-label={isArabic ? "إغلاق" : "Close"}
            >
              <X size={16} />
            </button>

            <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative h-56 w-full overflow-hidden sm:h-64 md:h-auto md:min-h-[520px]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={member.photo}
                    src={member.photo}
                    alt={member.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-card" />
                <div
                  className="absolute start-5 top-5 rounded px-2 py-0.5 font-mono text-xs font-bold"
                  style={{ color: member.accent, background: `${member.accent}18`, border: `1px solid ${member.accent}30` }}
                >
                  {member.id}
                </div>
                <div className="absolute inset-x-5 bottom-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/65">Lumos Team</p>
                  <h2 className="text-3xl font-black leading-none text-white sm:text-4xl">{member.name}</h2>
                </div>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="sticky top-0 z-20 flex flex-wrap gap-2 border-b border-border/60 bg-card/95 px-5 py-4 pe-16 backdrop-blur sm:px-7 md:px-8">
                  {team.map((item, index) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(index)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground"
                      style={
                        active === index
                          ? { color: item.accent, background: `${item.accent}18`, border: `1px solid ${item.accent}50` }
                          : undefined
                      }
                    >
                      {item.name}
                      {active === index && (
                        <motion.span
                          className="absolute inset-0 rounded-full"
                          layoutId="activeTeamMember"
                          style={{ boxShadow: `0 0 12px ${item.accent}30` }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 md:px-8 md:py-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: isArabic ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isArabic ? 16 : -16 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: member.accent }}>
                        {member.tag}
                      </p>
                      <h2 className="mb-2 text-4xl font-black leading-none tracking-tight text-foreground sm:text-5xl">
                        {member.name}
                      </h2>
                      <p className="mb-6 text-base font-medium text-muted-foreground">
                        {isArabic ? member.roleAr : member.roleEn}
                      </p>
                      <motion.div
                        className="mb-6 h-px w-16"
                        animate={{ background: member.accent }}
                        transition={{ duration: 0.3 }}
                      />
                      <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                        {isArabic ? member.descAr : member.descEn}
                      </p>

                      <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/70 bg-background/55 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {isArabic ? "التركيز" : "Focus"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{member.tag}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background/55 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {isArabic ? "المسؤولية" : "Responsibility"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {isArabic ? "جودة التسليم وتجربة العميل" : "Delivery quality and client experience"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-8 flex items-center gap-3">
                    {team.map((item, index) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => setActive(index)}
                        aria-label={`${isArabic ? "عرض" : "View"} ${item.name}`}
                        animate={{
                          width: active === index ? 24 : 6,
                          background: active === index ? item.accent : "hsl(var(--muted-foreground) / 0.35)",
                        }}
                        className="h-1.5 rounded-full"
                        transition={{ duration: 0.25 }}
                      />
                    ))}
                    <span className="ms-2 font-mono text-xs text-muted-foreground">{member.id} / 03</span>
                  </div>
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
