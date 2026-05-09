import { Users } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const team = [
  {
    name: "Jake",
    roleEn: "Co-Founder & Technical Manager",
    roleAr: "المؤسس المشارك ومدير تقني",
    descEn:
      "Engineering graduate who oversees all project operations and ensures top-quality delivery at every stage.",
    descAr:
      "خريج هندسة يشرف على جميع عمليات المشروع ويضمن أعلى جودة في كل مرحلة.",
    photo: "/team/JAKE.jpeg",
  },
  {
    name: "John",
    roleEn: "Co-Founder, Technical Manager & Investor",
    roleAr: "المؤسس المشارك، المدير التقني والمستثمر",
    descEn:
      "Engineering graduate and project investor who drives strategy and oversees all operations end-to-end.",
    descAr:
      "خريج هندسة ومستثمر في المشروع يقود الاستراتيجية ويشرف على جميع العمليات.",
    photo: "/team/JOHN.jpeg",
  },
  {
    name: "Mariam",
    roleEn: "Graphic Designer",
    roleAr: "مصممة جرافيك",
    descEn:
      "Creative visionary behind the brand's visual identity, crafting designs that captivate and convert.",
    descAr:
      "العقل المبدع وراء الهوية البصرية للعلامة التجارية، تصمم تجارب بصرية تأسر وتحوّل.",
    photo: "/team/MARIAM.jpeg",
  },
];

const TeamSection = () => {
  const { t, isArabic } = useLanguage();

  return (
    <section
      id="team"
      dir={isArabic ? "rtl" : "ltr"}
      className="py-16 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden bg-background"
    >
      {/* Background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Users size={14} />
            {t("فريقنا", "Our Team")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {t("تعرف على", "Meet the People")}{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              {t("الفريق", "Behind Lumos")}
            </span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            {t(
              "أشخاص حقيقيون، خبرة حقيقية، مبنيون لتنمية أعمالك.",
              "Real people. Real expertise. Built to grow your business."
            )}
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-8">
          {team.map((member, i) => (
            <div
              key={member.name}
              className="glass-card hover-lift glow-ring reveal rounded-3xl p-8 flex flex-col items-center text-center"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="relative mb-5">
                <img
                  src={member.photo}
                  alt={member.name}
                  loading="lazy"
                  decoding="async"
                  className="w-28 h-28 rounded-full object-cover object-top ring-2 ring-primary/40 shadow-lg"
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-primary/10" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-1">
                {member.name}
              </h3>

              <span className="text-primary text-sm font-medium mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                {isArabic ? member.roleAr : member.roleEn}
              </span>

              <p className="text-muted-foreground text-sm leading-relaxed">
                {isArabic ? member.descAr : member.descEn}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom credibility */}
        <p className="text-center text-muted-foreground/60 text-sm mt-12 reveal">
          {t(
            "كل مشروع يُشرف عليه شخصياً من قِبل الفريق المؤسس.",
            "Every project is personally overseen by the founding team."
          )}
        </p>
      </div>
    </section>
  );
};

export default TeamSection;
