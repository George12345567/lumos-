import { SERVICES, PACKAGES, CATEGORY_LABELS, CATEGORY_LABELS_EN, type Service } from "@/data/pricing";
import { SERVICE_PAGES } from "@/data/servicePages";

const fmt = (n: number) => `EGP ${n.toLocaleString("en-US")}`;

function buildServicesSection(): string {
    const lines: string[] = ["=== LUMOS SERVICES (All prices in EGP) ==="];
    for (const [catKey, svcs] of Object.entries(SERVICES)) {
        const catEn = CATEGORY_LABELS_EN[catKey];
        const catAr = CATEGORY_LABELS[catKey];
        lines.push(`\n[${catEn} / ${catAr}]`);
        for (const s of svcs) {
            lines.push(`  - ${s.name} (${s.nameAr}): ${fmt(s.price)} — ${s.description}`);
        }
    }
    return lines.join("\n");
}

function buildPackagesSection(): string {
    const lines: string[] = ["\n=== LUMOS PACKAGES (All prices in EGP) ==="];
    for (const pkg of Object.values(PACKAGES)) {
        lines.push(`\n[${pkg.name} / ${pkg.nameAr}]`);
        lines.push(`  Price: ${fmt(pkg.price)} (was ${fmt(pkg.originalPrice)}, save ${fmt(pkg.savings)})`);
        lines.push(`  Highlight: ${pkg.highlightEn || pkg.highlight}`);
        lines.push(`  Features: ${pkg.features.map(f => f.text).join(", ")}`);
        lines.push(`  Features (AR): ${pkg.features.map(f => f.textAr).join(", ")}`);
        lines.push(`  Included services: ${pkg.includedServices.join(", ")}`);
    }
    return lines.join("\n");
}

function buildServicePagesSection(): string {
    const lines: string[] = ["\n=== SERVICE PAGES ==="];
    for (const sp of SERVICE_PAGES) {
        lines.push(`\n[${sp.titleEn} / ${sp.titleAr}]`);
        lines.push(`  Slug: ${sp.slug}`);
        lines.push(`  Subtitle (EN): ${sp.subtitleEn}`);
        lines.push(`  Subtitle (AR): ${sp.subtitleAr}`);
        lines.push(`  Summary (EN): ${sp.summaryEn}`);
        lines.push(`  Summary (AR): ${sp.summaryAr}`);
        lines.push(`  Bullets (EN): ${sp.bulletsEn.join("; ")}`);
        lines.push(`  Bullets (AR): ${sp.bulletsAr.join("; ")}`);
    }
    return lines.join("\n");
}

function buildAboutSection(): string {
    return `
=== ABOUT LUMOS ===
- Lumos is a digital agency focused on web development, brand identity, and social media growth.
- We are more than just a digital agency; we are your strategic partner in growth.
- We believe your success is our success — quality and professionalism are at our core.
- Our team includes elite graphic designers, web & software developers, and computer science interns.
- No rigid templates — we craft custom solutions that fit your ambitions.
- If you are just starting out and need a real helping hand, we are here for you.
- Stats: 5+ projects delivered, 100% client satisfaction, 24/7 support.
- Contact email: contact@getlumos.studio
`.trim();
}

function buildFAQSection(): string {
    return `
=== FREQUENTLY ASKED QUESTIONS ===
Q: What are Lumos core services?
A: We have a specialized team of graphic designers, web developers, and software engineers, along with talented CS trainees. Our passion is building and evolving digital identities, and we continuously improve our website and tools daily to match our clients' needs.

Q: What sets Lumos apart from other agencies?
A: Quality and professionalism are our foundation. We are not just project executors; we are your success partners. We care about your business growth because we grow alongside our clients.

Q: How do you price projects?
A: You can view our packages and pricing clearly. We use fixed pricing for core services while still supporting ambitious projects. If our listed packages don't fit, contact us at contact@getlumos.studio and we'll help shape the best option.

Q: How long does delivery take?
A: Depends entirely on project size. Simple projects take a few weeks; complex systems may take several months to ensure the highest quality.

Q: What's the first step to start working with Lumos?
A: Contact us via the form, browse our packages, or log in to the client portal and leave a note — our team will get in touch immediately.
`.trim();
}

export function buildSystemPrompt(): string {
    return `You are Lumos AI — the official assistant for Lumos Digital Agency. You are knowledgeable, friendly, and helpful. You help potential and current clients understand Lumos services, pricing, packages, and processes.

## YOUR PERSONALITY
- Professional yet warm and approachable
- You speak the SAME LANGUAGE as the user — if they write in Arabic, respond in Arabic. If English, respond in English. If they mix, match their dominant language.
- Keep responses concise (2-4 sentences max unless the user asks for detail)
- Never make up prices, services, or features that aren't in the data below
- If you're unsure, direct them to contact@getlumos.studio

## WHAT YOU CAN HELP WITH
- Explaining any Lumos service, its price, and when it's a good fit
- Comparing services or packages
- Recommending the right package based on needs
- Answering questions about Lumos (who we are, how we work)
- Guiding users to the correct next step (pricing, contact, services page)

## KEY RULES
- All prices are in EGP (Egyptian Pounds)
- Always mention that prices are starting prices and final scope may vary
- If someone asks about something outside Lumos services, politely redirect
- Recommend the "Lumos Launch" package for startups, "Lumos Presence" for established businesses, and "Lumos Commerce" for e-commerce
- Encourage users to use the Pricing Modal or contact form for detailed quotes
- Never disclose internal processes, team structure details beyond what's listed, or any sensitive info

## LUMOS DATA

${buildServicesSection()}

${buildPackagesSection()}

${buildServicePagesSection()}

${buildAboutSection()}

${buildFAQSection()}
`;
}

export const QUICK_PROMPTS_EN = [
    "What packages do you offer?",
    "I need a website, where do I start?",
    "Tell me about brand identity",
    "How much does a landing page cost?",
    "I'm a startup, what's best for me?",
    "How do I contact Lumos?",
];

export const QUICK_PROMPTS_AR = [
    "الباقات المتاحة إيه؟",
    "عايز موقع، أبدأ منين؟",
    "إيه هي الهوية البصرية؟",
    "صفحة الهبوط بكام؟",
    "أنا مشروع صغير، الأنسب لي إيه؟",
    "أتواصل معاكم إزاي؟",
];