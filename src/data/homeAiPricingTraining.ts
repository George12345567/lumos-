import { CATEGORY_LABELS, CATEGORY_LABELS_EN, PACKAGES, SERVICES, type Service } from "@/data/pricing";

export type HomeAiTrainingActionId = "pricing" | "contact" | "services" | "preview" | "faq";

export type HomeAiTrainingScenario = {
    id: string;
    keywords: string[];
    replyEn: string;
    replyAr: string;
    actions?: HomeAiTrainingActionId[];
};

const formatPriceEn = (price: number) => `EGP ${price.toLocaleString("en-US")}`;
const formatPriceAr = (price: number) => `${price.toLocaleString("en-US")} جنيه`;

const buildServiceKeywords = (service: Service, categoryKey: string) => [
    service.id,
    service.name.toLowerCase(),
    service.nameAr,
    CATEGORY_LABELS_EN[categoryKey].toLowerCase(),
    CATEGORY_LABELS[categoryKey],
];

const buildServiceScenarios = (service: Service, categoryKey: string): HomeAiTrainingScenario[] => {
    const keywords = buildServiceKeywords(service, categoryKey);
    const categoryEn = CATEGORY_LABELS_EN[categoryKey];
    const categoryAr = CATEGORY_LABELS[categoryKey];
    const priceEn = formatPriceEn(service.price);
    const priceAr = formatPriceAr(service.price);
    const descLower = service.description.toLowerCase();

    return [
        // ── 1: price ────────────────────────────────────────────────────
        {
            id: `${service.id}-price`,
            keywords: [...keywords, "price", "cost", "pricing", "سعر", "تكلفة", "كام", "بكام"],
            replyEn: `${service.name} is priced at ${priceEn} under ${categoryEn}. It is a focused option if you need this capability without moving into a full package yet.`,
            replyAr: `${service.nameAr} سعره ${priceAr} ضمن ${categoryAr}. اختيار مناسب لو تحتاج هذه الخدمة مباشرةً بدون الدخول في باقة كاملة الآن.`,
            actions: ["pricing", "contact"],
        },
        // ── 2: fit ──────────────────────────────────────────────────────
        {
            id: `${service.id}-fit`,
            keywords: [...keywords, "best for", "fit", "suitable", "يناسب", "مناسب", "امتى", "متى"],
            replyEn: `${service.name} is a strong fit when you specifically need ${descLower} and want a lighter scope than a larger bundled engagement.`,
            replyAr: `${service.nameAr} مناسب عندما يكون احتياجك الأساسي هو ${service.description} وتريد نطاقًا أخف من باقة موسعة.`,
            actions: ["services", "pricing"],
        },
        // ── 3: value ────────────────────────────────────────────────────
        {
            id: `${service.id}-value`,
            keywords: [...keywords, "value", "result", "benefit", "فايدة", "فائدة", "نتيجة", "استفادة"],
            replyEn: `The value of ${service.name} is that it improves one clear layer of the experience quickly. It works best when you already know the bottleneck and want a direct upgrade.`,
            replyAr: `قيمة ${service.nameAr} أنه يرفع طبقة واضحة من التجربة بسرعة. أفضل عندما تكون المشكلة محددة وتريد تحسينًا مباشرًا.`,
            actions: ["services"],
        },
        // ── 4: bundle ───────────────────────────────────────────────────
        {
            id: `${service.id}-bundle`,
            keywords: [...keywords, "bundle", "combine", "with", "اضيف", "أضيف", "مع", "دمج"],
            replyEn: `${service.name} becomes stronger when combined with nearby services in ${categoryEn} or with brand and conversion work around it. I can guide you to the leanest combination.`,
            replyAr: `${service.nameAr} يصبح أقوى عندما يندمج مع خدمات قريبة في ${categoryAr} أو مع تحسينات البراند والتحويل. أقدر أرشح أقل تركيبة مناسبة.`,
            actions: ["services", "contact"],
        },
        // ── 5: vs-package ───────────────────────────────────────────────
        {
            id: `${service.id}-vs-package`,
            keywords: [...keywords, "package", "plan", "vs", "compare", "باقة", "مقارنة", "ولا"],
            replyEn: `If you only need ${service.name}, the standalone service may be enough. But if you need supporting layers around it, the fixed packages can be more efficient financially.`,
            replyAr: `لو تحتاج ${service.nameAr} فقط، الخدمة المنفصلة قد تكفي. لكن لو تحتاج طبقات داعمة معها، الباقات الثابتة تكون أوفر ماليًا.`,
            actions: ["pricing", "services"],
        },
        // ── 6: timeline ─────────────────────────────────────────────────
        {
            id: `${service.id}-timeline`,
            keywords: [...keywords, "time", "how long", "days", "weeks", "مدة", "كم يوم", "قد ايه", "وقت التنفيذ"],
            replyEn: `${service.name} takes 3–7 working days depending on brief clarity and revision cycles. Having references and a clear direction ready cuts that window significantly.`,
            replyAr: `${service.nameAr} يستغرق 3–7 أيام عمل حسب وضوح الـ brief ودورات المراجعة. وجود مراجع واتجاه واضح يُقلص هذه الفترة بشكل ملحوظ.`,
            actions: ["contact"],
        },
        // ── 7: result ───────────────────────────────────────────────────
        {
            id: `${service.id}-result`,
            keywords: [...keywords, "result", "output", "outcome", "expect", "نتيجة", "توقع", "مخرج", "اللي هاخده"],
            replyEn: `After ${service.name} you should see a clear improvement in ${descLower}. The impact lands fastest when the brief is specific and the existing assets are well organized.`,
            replyAr: `بعد ${service.nameAr} ستلاحظ تحسنًا واضحًا في ${service.description}. التأثير يكون أسرع عندما يكون الـ brief محددًا والـ assets الحالية منظمة.`,
            actions: ["services"],
        },
        // ── 8: process ──────────────────────────────────────────────────
        {
            id: `${service.id}-process`,
            keywords: [...keywords, "process", "steps", "how", "مراحل", "خطوات", "إزاي", "العملية"],
            replyEn: `${service.name} flow: brief review → alignment session → first execution pass → one revision round → delivery. A clear brief removes the longest wait cycle.`,
            replyAr: `مسار ${service.nameAr}: مراجعة brief → جلسة محاذاة → تنفيذ أول → جولة مراجعة → تسليم. Brief واضح يُلغي أطول دورة انتظار.`,
            actions: ["contact"],
        },
        // ── 9: small-biz ────────────────────────────────────────────────
        {
            id: `${service.id}-small-biz`,
            keywords: [...keywords, "small", "startup", "new business", "صغير", "مشروع صغير", "شركة ناشئة", "بداية"],
            replyEn: `For early-stage businesses, ${service.name} at ${priceEn} is a smart focused entry — delivers visible results without a large upfront commitment and stacks well later.`,
            replyAr: `للأعمال الناشئة، ${service.nameAr} بـ ${priceAr} نقطة دخول ذكية — تُعطي نتائج مرئية بدون التزام كبير مسبقًا وتتراكم بشكل جيد لاحقًا.`,
            actions: ["pricing", "contact"],
        },
        // ── 10: urgent ──────────────────────────────────────────────────
        {
            id: `${service.id}-urgent`,
            keywords: [...keywords, "urgent", "fast", "rush", "asap", "عاجل", "سريع", "ضروري", "بسرعة"],
            replyEn: `For urgent ${service.name} delivery, the critical input is a ready brief. That eliminates the main back-and-forth cycle and lets the team start from day one without delays.`,
            replyAr: `لتسليم ${service.nameAr} بشكل عاجل، المدخل الحاسم هو brief جاهز. هذا يُلغي دورة التواصل الرئيسية ويتيح للفريق البدء من اليوم الأول.`,
            actions: ["contact"],
        },
        // ── 11: roi ─────────────────────────────────────────────────────
        {
            id: `${service.id}-roi`,
            keywords: [...keywords, "roi", "return", "worth it", "invest", "عائد", "جدوى", "يستاهل", "استثمار"],
            replyEn: `${service.name} ROI is clearest when it removes active friction — if ${descLower} is a bottleneck costing you leads or trust, the return tends to be measurable within weeks.`,
            replyAr: `العائد من ${service.nameAr} يكون أوضح عندما يُزيل احتكاكًا فعليًا. لو كان ${service.description} عقبة تُكلفك عملاء أو ثقة، العائد يظهر خلال أسابيع.`,
            actions: ["contact", "pricing"],
        },
        // ── 12: upgrade ─────────────────────────────────────────────────
        {
            id: `${service.id}-upgrade`,
            keywords: [...keywords, "after", "next step", "upgrade", "then what", "بعده", "الخطوة التالية", "وبعدين"],
            replyEn: `After ${service.name}, the natural next layer is usually reinforcing what's downstream — better conversion, supporting automation, or brand consistency across the new infrastructure.`,
            replyAr: `بعد ${service.nameAr} الطبقة التالية الطبيعية عادةً هي تعزيز ما يليها — تحويل أفضل، أتمتة داعمة، أو تناسق بصري على البنية الجديدة.`,
            actions: ["services"],
        },
        // ── 13: ready ───────────────────────────────────────────────────
        {
            id: `${service.id}-ready`,
            keywords: [...keywords, "prepare", "have ready", "need", "provide", "استعد", "جاهز", "اللي محتاجه", "مواد"],
            replyEn: `To kick off ${service.name} smoothly: have your brand colors, any reference links, and a one-paragraph direction statement ready. You do not need everything perfect — just clear enough to brief with.`,
            replyAr: `لانطلاق ${service.nameAr} بسلاسة: احضر ألوان البراند، أي روابط مرجعية، وجملة اتجاه واحدة. لا تحتاج كل شيء مثاليًا — فقط واضحًا بما يكفي للـ brief.`,
            actions: ["contact"],
        },
        // ── 14: compare ─────────────────────────────────────────────────
        {
            id: `${service.id}-compare`,
            keywords: [...keywords, "compare", "vs", "difference", "قارن", "الفرق بين", "أو"],
            replyEn: `Compared to other services in ${categoryEn}, ${service.name} at ${priceEn} is the focused option. Broader scope within the same category costs more; a package covers the most ground efficiently.`,
            replyAr: `مقارنةً بباقي خدمات ${categoryAr}، ${service.nameAr} بـ ${priceAr} هو الخيار الموجَّه. النطاق الأوسع في نفس الفئة يكلف أكثر؛ الباقة تغطي أكبر مساحة بشكل أكثر فاعلية.`,
            actions: ["pricing", "services"],
        },
        // ── 15: budget ──────────────────────────────────────────────────
        {
            id: `${service.id}-budget`,
            keywords: [...keywords, "budget", "afford", "cheap", "low cost", "ميزانية", "رخيص", "اقل سعر", "محدود"],
            replyEn: `${service.name} at ${priceEn} is already the focused-scope version of ${categoryEn}. If budget is a hard constraint, this standalone service is often the leanest way to get the result without a larger commitment.`,
            replyAr: `${service.nameAr} بـ ${priceAr} هو النسخة ذات النطاق المحدد من ${categoryAr}. لو الميزانية محددة، هذه الخدمة المنفصلة هي أخف طريقة للحصول على النتيجة.`,
            actions: ["pricing"],
        },
    ];
};

const packageScenarios: HomeAiTrainingScenario[] = Object.values(PACKAGES).flatMap((pkg) => [
    {
        id: `${pkg.id}-price`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "price", "pricing", "package", "plan", "سعر", "باقة", "الباقة"],
        replyEn: `${pkg.name} is priced at ${formatPriceEn(pkg.price)} instead of ${formatPriceEn(pkg.originalPrice)}, which means a direct saving of ${formatPriceEn(pkg.savings)}.`,
        replyAr: `${pkg.nameAr} سعرها ${formatPriceAr(pkg.price)} بدلًا من ${formatPriceAr(pkg.originalPrice)}، وهذا يعني توفيرًا مباشرًا بقيمة ${formatPriceAr(pkg.savings)}.`,
        actions: ["pricing", "contact"],
    },
    {
        id: `${pkg.id}-fit`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "best for", "fit", "who is it for", "يناسب", "مناسبة لمين", "لمين"],
        replyEn: `${pkg.name} is best for teams that want ${pkg.highlight.toLowerCase()} and prefer a packaged route rather than assembling services one by one.`,
        replyAr: `${pkg.nameAr} مناسبة أكثر للفرق التي تريد ${pkg.highlightAr} وتفضّل مسارًا مجمعًا بدل تركيب الخدمات واحدة واحدة.`,
        actions: ["pricing"],
    },
    {
        id: `${pkg.id}-features`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "features", "included", "what is inside", "المميزات", "المزايا", "يشمل", "جواها"],
        replyEn: `${pkg.name} includes ${pkg.features.map((feature) => feature.text).join(", ")}. It is built to reduce decision friction and accelerate launch readiness.`,
        replyAr: `${pkg.nameAr} تشمل ${pkg.features.map((feature) => feature.textAr).join("، ")}. وهي مصممة لتقليل الحيرة وتسريع الجاهزية للانطلاق.`,
        actions: ["pricing", "services"],
    },
    {
        id: `${pkg.id}-value`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "value", "worth", "وفر", "قيمة", "تستحق"],
        replyEn: `${pkg.name} makes sense when you need several connected deliverables together. The saving of ${formatPriceEn(pkg.savings)} appears because the package compresses multiple line items into one cleaner route.`,
        replyAr: `${pkg.nameAr} تكون منطقية عندما تحتاج عدة مخرجات مترابطة معًا. التوفير البالغ ${formatPriceAr(pkg.savings)} يظهر لأن الباقة تضغط عدة بنود في مسار واحد أوضح.`,
        actions: ["pricing", "contact"],
    },
    {
        id: `${pkg.id}-compare-custom`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "custom", "tailored", "compare", "مخصص", "تفصيل", "مقارنة"],
        replyEn: `${pkg.name} is faster and easier if your needs align with the included structure. If your scope is unusual, a custom route may fit better than forcing the package.`,
        replyAr: `${pkg.nameAr} أسرع وأسهل إذا كانت احتياجاتك تتوافق مع هيكلها. أما إذا كان النطاق غير معتاد، فالمسار المخصص قد يكون أنسب.`,
        actions: ["pricing", "contact"],
    },
    {
        id: `${pkg.id}-launch`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "launch", "start", "begin", "ابدأ", "انطلاق"],
        replyEn: `${pkg.name} is a practical launch route if you want momentum quickly without spending time composing the stack manually.`,
        replyAr: `${pkg.nameAr} مسار عملي للانطلاق إذا كنت تريد زخمًا سريعًا بدون إضاعة وقت في تركيب الـ stack يدويًا.`,
        actions: ["pricing", "contact"],
    },
    {
        id: `${pkg.id}-timeline`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "time", "how long", "كم وقت", "مدة الباقة", "قد ايه"],
        replyEn: `${pkg.name} is typically delivered over 2–4 weeks depending on the revision cycles and content readiness. Having brief and brand references ready from day one accelerates significantly.`,
        replyAr: `${pkg.nameAr} تُسلَّم عادةً خلال 2–4 أسابيع حسب دورات المراجعة وجاهزية المحتوى. وجود الـ brief ومراجع البراند جاهزة من اليوم الأول يُسرّع بشكل ملحوظ.`,
        actions: ["contact"],
    },
    {
        id: `${pkg.id}-who-not`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "not for me", "wrong", "not suitable", "مش مناسب", "مش لي", "غلط"],
        replyEn: `${pkg.name} is NOT the right fit if your scope needs are very different from the included services, or if you want to invest in only one specific area right now. In that case, standalone services give you more precision.`,
        replyAr: `${pkg.nameAr} ليست الاختيار الصحيح إذا كانت احتياجاتك مختلفة جدًا عن الخدمات المضمنة، أو لو تريد الاستثمار في مجال واحد محدد الآن. في هذه الحالة، الخدمات المنفصلة تعطيك دقة أكبر.`,
        actions: ["services", "pricing"],
    },
    {
        id: `${pkg.id}-roi`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "roi", "return", "worth it", "عائد", "يستاهل", "جدوى الباقة"],
        replyEn: `The ROI case for ${pkg.name} is built on breadth — you get ${pkg.features.length} connected outputs at ${formatPriceEn(pkg.price)} instead of buying them separately. If you were going to need most of those anyway, the math is straightforward.`,
        replyAr: `حجة العائد من ${pkg.nameAr} مبنية على الشمولية — تحصل على ${pkg.features.length} مخرجات مترابطة بـ ${formatPriceAr(pkg.price)} بدل شرائها منفصلة. لو كنت ستحتاج معظمها على أي حال، الحساب واضح.`,
        actions: ["pricing"],
    },
    {
        id: `${pkg.id}-vs-other`,
        keywords: [pkg.name.toLowerCase(), pkg.nameAr, "vs", "other package", "difference", "مقارنة بالباقة الثانية", "الفرق بين الباقتين"],
        replyEn: `The two packages differ in scope and output depth. ${pkg.name} focuses on: ${pkg.highlight.toLowerCase()}. The right choice depends on whether you need broader coverage or a more targeted starting point.`,
        replyAr: `الباقتان تختلفان في النطاق وعمق المخرجات. ${pkg.nameAr} تركّز على: ${pkg.highlightAr}. الاختيار الصحيح يعتمد على ما إذا كنت تحتاج تغطية أوسع أو نقطة بداية أكثر تحديدًا.`,
        actions: ["pricing"],
    },
]);

const categoryScenarios: HomeAiTrainingScenario[] = Object.entries(SERVICES).flatMap(([categoryKey, categoryServices]) => {
    const sorted = categoryServices.slice().sort((a, b) => a.price - b.price);
    const sortedDesc = categoryServices.slice().sort((a, b) => b.price - a.price);
    const labelEn = CATEGORY_LABELS_EN[categoryKey];
    const labelAr = CATEGORY_LABELS[categoryKey];
    const minPrice = Math.min(...categoryServices.map((s) => s.price));
    const maxPrice = Math.max(...categoryServices.map((s) => s.price));
    const entryService = sorted[0];
    const topService = sortedDesc[0];

    return [
        {
            id: `${categoryKey}-range`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "range", "category", "قسم", "فئة", "رنج"],
            replyEn: `${labelEn} starts from ${formatPriceEn(minPrice)} and goes up to ${formatPriceEn(maxPrice)} depending on depth and complexity.`,
            replyAr: `${labelAr} تبدأ من ${formatPriceAr(minPrice)} وتصل إلى ${formatPriceAr(maxPrice)} حسب العمق والتعقيد.`,
            actions: ["pricing", "services"],
        },
        {
            id: `${categoryKey}-entry`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "entry", "starter", "cheapest", "اقل", "أقل", "ارخص"],
            replyEn: `The lightest entry in ${labelEn} is ${entryService.name} at ${formatPriceEn(entryService.price)}.`,
            replyAr: `أخف نقطة دخول في ${labelAr} هي ${entryService.nameAr} بـ ${formatPriceAr(entryService.price)}.`,
            actions: ["pricing", "services"],
        },
        {
            id: `${categoryKey}-premium`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "high", "premium", "advanced", "أعلى", "أقوى", "متقدم"],
            replyEn: `The higher-end option in ${labelEn} is ${topService.name} at ${formatPriceEn(topService.price)} for broader or more demanding scope.`,
            replyAr: `الخيار الأعلى في ${labelAr} هو ${topService.nameAr} بـ ${formatPriceAr(topService.price)} للنطاقات الأوسع أو الأكثر تطلبًا.`,
            actions: ["pricing", "contact"],
        },
        {
            id: `${categoryKey}-popular`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "popular", "most chosen", "الأكثر طلبًا", "الأشهر", "الاكتر"],
            replyEn: `Within ${labelEn}, the most commonly selected starting point is the mid-range service — it balances scope and speed without over-committing. I can help you identify the best specific match if you share your goal.`,
            replyAr: `داخل ${labelAr}، نقطة البداية الأكثر اختيارًا عادةً هي الخدمة المتوسطة — توازن النطاق والسرعة بدون تعقيد زائد. أقدر أساعدك تحدد الأنسب تحديدًا لو شاركت هدفك.`,
            actions: ["services", "contact"],
        },
        {
            id: `${categoryKey}-overview`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "overview", "what is", "explain", "شرح", "ايه ده", "إيه ده"],
            replyEn: `${labelEn} covers ${categoryServices.map((s) => s.name).join(", ")}. Each serves a specific layer of the digital experience and can be combined based on your current priority.`,
            replyAr: `${labelAr} تشمل ${categoryServices.map((s) => s.nameAr).join("، ")}. كل منها يخدم طبقة محددة من التجربة الرقمية ويمكن دمجها حسب أولويتك الحالية.`,
            actions: ["services"],
        },
        {
            id: `${categoryKey}-when`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "when to", "should i", "do i need", "لما", "امتى", "هل محتاج"],
            replyEn: `You should invest in ${labelEn} when the bottleneck in your funnel is specifically at that layer — not just because it sounds like a good addition.`,
            replyAr: `يُستحسن الاستثمار في ${labelAr} عندما تكون نقطة الاحتكاك في منظومتك محددةً في تلك الطبقة — وليس فقط لأنها تبدو إضافة جيدة.`,
            actions: ["services", "contact"],
        },
        {
            id: `${categoryKey}-budget`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "budget guidance", "how much to spend", "كمية الإنفاق", "ميزانية مناسبة"],
            replyEn: `Budget guidance for ${labelEn}: for a focused improvement, start with the entry service at ${formatPriceEn(minPrice)}. For a comprehensive overhaul, the full category investment ranges up to ${formatPriceEn(maxPrice)}.`,
            replyAr: `إرشاد ميزانية ${labelAr}: لتحسين مركّز ابدأ بخدمة الدخول بـ ${formatPriceAr(minPrice)}. لمراجعة شاملة، الاستثمار الكامل في الفئة يصل إلى ${formatPriceAr(maxPrice)}.`,
            actions: ["pricing"],
        },
        {
            id: `${categoryKey}-combine`,
            keywords: [categoryKey, labelEn.toLowerCase(), labelAr, "combine with", "stack with", "ادمج مع", "مع أيه"],
            replyEn: `${labelEn} works best when supported by a strong brand foundation and a clear conversion flow. Combining it with brand design or automation layers often multiplies the impact significantly.`,
            replyAr: `${labelAr} تعطي أفضل نتيجة عندما تكون مدعومة بأساس براند قوي ومسار تحويل واضح. دمجها مع البراند أو الأتمتة يُضاعف التأثير في الغالب.`,
            actions: ["services", "contact"],
        },
    ];
});

type ServiceScenarioContext = {
    service: Service;
    categoryEn: string;
    categoryAr: string;
    priceEn: string;
    priceAr: string;
};

type ServiceIntentTemplate = {
    suffix: string;
    keywords: string[];
    replyEn: (context: ServiceScenarioContext) => string;
    replyAr: (context: ServiceScenarioContext) => string;
    actions?: HomeAiTrainingActionId[];
};

const SERVICE_INTENT_TEMPLATES: ServiceIntentTemplate[] = [
    {
        suffix: "restaurant",
        keywords: ["restaurant", "cafe", "menu", "مطعم", "كافيه", "منيو"],
        replyEn: ({ service, priceEn }) => `${service.name} is a good restaurant move when speed, clarity, and a smooth ordering path matter more than adding too many layers at once. At ${priceEn}, it keeps the scope controlled while upgrading the customer flow.`,
        replyAr: ({ service, priceAr }) => `${service.nameAr} مناسب للمطاعم عندما تكون السرعة والوضوح ومسار الطلب السلس أهم من إضافة طبقات كثيرة مرة واحدة. وبسعر ${priceAr} يظل النطاق منضبطًا مع تحسين تجربة العميل.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "ecommerce",
        keywords: ["store", "ecommerce", "shop", "متجر", "تجارة إلكترونية", "بيع أونلاين"],
        replyEn: ({ service, categoryEn }) => `${service.name} makes sense for e-commerce brands when the current bottleneck sits inside ${categoryEn}. It works best when paired with a tighter conversion path and clearer merchandising.`,
        replyAr: ({ service, categoryAr }) => `${service.nameAr} مناسب لمتاجر التجارة الإلكترونية عندما تكون نقطة التعطيل داخل ${categoryAr}. ويعمل أفضل مع مسار تحويل أوضح وعرض منتجات أكثر انضباطًا.`,
        actions: ["services", "pricing"],
    },
    {
        suffix: "clinic",
        keywords: ["clinic", "medical", "doctor", "عيادة", "طبي", "دكتور"],
        replyEn: ({ service, priceEn }) => `${service.name} is useful for clinics that need trust and clarity before anything flashy. At ${priceEn}, it is usually a cleaner investment than spreading budget across several disconnected tasks.`,
        replyAr: ({ service, priceAr }) => `${service.nameAr} مفيد للعيادات التي تحتاج الثقة والوضوح قبل أي عناصر استعراضية. وبسعر ${priceAr} يكون غالبًا استثمارًا أنظف من توزيع الميزانية على مهام متفرقة.`,
        actions: ["pricing", "contact"],
    },
    {
        suffix: "real-estate",
        keywords: ["real estate", "property", "broker", "عقارات", "عقار", "وسيط"],
        replyEn: ({ service, service: { name } }) => `${name} is a practical real-estate move when listings, trust, and follow-up discipline need to work together. The value appears when the buyer journey becomes easier to navigate without confusion.`,
        replyAr: ({ service }) => `${service.nameAr} خطوة عملية للعقارات عندما تحتاج القوائم والثقة والانضباط في المتابعة أن تعمل معًا. وتظهر القيمة عندما تصبح رحلة المشتري أسهل وأكثر وضوحًا.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "startup",
        keywords: ["startup", "new business", "launching", "شركة ناشئة", "بداية", "إطلاق"],
        replyEn: ({ service, priceEn }) => `For startups, ${service.name} at ${priceEn} is most useful when you want one visible upgrade without locking into a heavy initial scope. It creates momentum while keeping room for later expansion.`,
        replyAr: ({ service, priceAr }) => `للشركات الناشئة، ${service.nameAr} بسعر ${priceAr} يكون مفيدًا عندما تريد تحسينًا واضحًا واحدًا بدون الالتزام بنطاق كبير من البداية. ويصنع زخمًا مع ترك مساحة للتوسع لاحقًا.`,
        actions: ["pricing", "services"],
    },
    {
        suffix: "corporate",
        keywords: ["corporate", "enterprise", "company", "شركة", "مؤسسي", "enterprise"],
        replyEn: ({ service, categoryEn }) => `${service.name} suits established companies when ${categoryEn} needs to look more disciplined and trustworthy. It is less about novelty and more about presenting operational maturity clearly.`,
        replyAr: ({ service, categoryAr }) => `${service.nameAr} مناسب للشركات القائمة عندما تحتاج ${categoryAr} إلى مظهر أكثر انضباطًا وثقة. الفكرة هنا ليست الاستعراض بل إظهار النضج التشغيلي بوضوح.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "personal-brand",
        keywords: ["personal brand", "creator", "coach", "براند شخصي", "كوتش", "صانع محتوى"],
        replyEn: ({ service }) => `${service.name} is helpful for personal brands when the audience needs a sharper impression fast. It works best when the message is already clear and the execution layer is what needs upgrading.`,
        replyAr: ({ service }) => `${service.nameAr} مفيد للبراندات الشخصية عندما يحتاج الجمهور إلى انطباع أقوى بسرعة. ويعمل أفضل عندما تكون الرسالة واضحة أصلًا وما يحتاج التطوير هو طبقة التنفيذ.`,
        actions: ["services", "preview"],
    },
    {
        suffix: "education",
        keywords: ["education", "course", "academy", "تعليم", "كورس", "أكاديمية"],
        replyEn: ({ service }) => `${service.name} fits education offers when students need a simpler journey from discovery to trust to enrollment. The clearer the curriculum and promise, the more useful this service becomes.`,
        replyAr: ({ service }) => `${service.nameAr} مناسب للعروض التعليمية عندما يحتاج الطالب إلى رحلة أبسط من الاكتشاف إلى الثقة ثم التسجيل. وكلما كان المنهج والوعد أوضح، زادت فاعلية هذه الخدمة.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "luxury",
        keywords: ["luxury", "premium brand", "high-end", "فاخر", "بريميوم", "راقي"],
        replyEn: ({ service, priceEn }) => `${service.name} is useful for premium brands when perceived quality must rise without making the experience noisy. At ${priceEn}, it is a controlled way to lift the tone and polish.`,
        replyAr: ({ service, priceAr }) => `${service.nameAr} مفيد للبراندات الفاخرة عندما يجب رفع الجودة المتصورة بدون جعل التجربة مزدحمة. وبسعر ${priceAr} فهو وسيلة منضبطة لرفع النبرة والصقل.`,
        actions: ["preview", "contact"],
    },
    {
        suffix: "local-business",
        keywords: ["local business", "near me", "branch", "محلي", "فرع", "نشاط محلي"],
        replyEn: ({ service }) => `${service.name} works well for local businesses when fast trust and a clear next step matter more than building a complex digital system. It is strongest when tied to one simple offer path.`,
        replyAr: ({ service }) => `${service.nameAr} مناسب للأنشطة المحلية عندما تكون الثقة السريعة والخطوة التالية الواضحة أهم من بناء نظام رقمي معقد. ويكون أقوى عندما يرتبط بمسار عرض واحد بسيط.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "trust",
        keywords: ["trust", "credibility", "professional", "ثقة", "مصداقية", "احترافي"],
        replyEn: ({ service }) => `If trust is the problem, ${service.name} helps by making one layer of the experience feel more complete and reliable. It does not replace strategy, but it removes visible friction fast.`,
        replyAr: ({ service }) => `إذا كانت المشكلة في الثقة، فإن ${service.nameAr} يساعد بجعل طبقة واحدة من التجربة أكثر اكتمالًا وموثوقية. لا يستبدل الاستراتيجية، لكنه يزيل احتكاكًا ظاهرًا بسرعة.`,
        actions: ["services"],
    },
    {
        suffix: "conversion",
        keywords: ["conversion", "leads", "sales", "تحويل", "ليدز", "مبيعات"],
        replyEn: ({ service, categoryEn }) => `${service.name} matters for conversion when the weakest point is inside ${categoryEn}. It gives the best return when the offer itself is already strong and just needs a cleaner path.`,
        replyAr: ({ service, categoryAr }) => `${service.nameAr} مهم للتحويل عندما تكون أضعف نقطة داخل ${categoryAr}. ويعطي أفضل عائد عندما يكون العرض نفسه قويًا ويحتاج فقط إلى مسار أوضح.`,
        actions: ["services", "pricing"],
    },
    {
        suffix: "ads-ready",
        keywords: ["ads", "campaign", "traffic", "إعلانات", "حملات", "ترافيك"],
        replyEn: ({ service }) => `${service.name} is worth prioritizing before scaling traffic if the current experience is not ready to convert visits into action. Better traffic on a weak flow just amplifies leakage.`,
        replyAr: ({ service }) => `${service.nameAr} يستحق الأولوية قبل توسيع الترافيك إذا كانت التجربة الحالية غير جاهزة لتحويل الزيارات إلى فعل. فالترافيك الأفضل على مسار ضعيف يضخم الهدر فقط.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "operations",
        keywords: ["operations", "team", "workflow", "عمليات", "فريق", "سير العمل"],
        replyEn: ({ service }) => `${service.name} becomes valuable when the team is losing time because the flow around this layer is inconsistent. It creates cleaner handoff and a more repeatable operating rhythm.`,
        replyAr: ({ service }) => `${service.nameAr} يصبح ذا قيمة عندما يفقد الفريق وقتًا بسبب عدم اتساق المسار حول هذه الطبقة. وهو يصنع تسليمًا أنظف وإيقاع تشغيل أكثر قابلية للتكرار.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "retention",
        keywords: ["retention", "repeat", "loyalty", "احتفاظ", "ولاء", "تكرار الشراء"],
        replyEn: ({ service }) => `${service.name} helps retention when the post-first-impression experience needs more consistency. It is useful when keeping existing interest warm matters as much as acquiring new attention.`,
        replyAr: ({ service }) => `${service.nameAr} يساعد في الاحتفاظ عندما تحتاج التجربة بعد الانطباع الأول إلى مزيد من الاتساق. ويكون مفيدًا عندما يكون الحفاظ على الاهتمام الحالي مهمًا بقدر جذب اهتمام جديد.`,
        actions: ["services"],
    },
    {
        suffix: "launch-fast",
        keywords: ["launch fast", "quick launch", "go live", "إطلاق سريع", "انزل بسرعة", "جاهز للنشر"],
        replyEn: ({ service, priceEn }) => `${service.name} is a strong quick-launch choice at ${priceEn} when the goal is to get a clean version live without overbuilding the first release.`,
        replyAr: ({ service, priceAr }) => `${service.nameAr} خيار قوي للإطلاق السريع بسعر ${priceAr} عندما يكون الهدف هو نشر نسخة نظيفة بدون المبالغة في بناء الإصدار الأول.`,
        actions: ["pricing", "contact"],
    },
    {
        suffix: "relaunch",
        keywords: ["relaunch", "refresh", "second launch", "إعادة إطلاق", "تحديث", "رونش جديد"],
        replyEn: ({ service }) => `${service.name} is useful in a relaunch when you already have audience attention but the current presentation is underperforming. It raises clarity without forcing a full rebuild first.`,
        replyAr: ({ service }) => `${service.nameAr} مفيد في إعادة الإطلاق عندما يكون لديك اهتمام موجود لكن العرض الحالي لا يؤدي جيدًا. فهو يرفع الوضوح بدون فرض إعادة بناء كاملة أولًا.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "mobile",
        keywords: ["mobile", "phone", "responsive", "موبايل", "جوال", "responsive"],
        replyEn: ({ service }) => `${service.name} becomes more important if most of your audience arrives on mobile. In that case, smooth scanning, simple actions, and low friction matter more than extra complexity.`,
        replyAr: ({ service }) => `${service.nameAr} يصبح أكثر أهمية إذا كان معظم جمهورك يأتي من الموبايل. عندها تكون سهولة التصفح وسرعة الإجراء وقلة الاحتكاك أهم من التعقيد الزائد.`,
        actions: ["services", "preview"],
    },
    {
        suffix: "multilingual",
        keywords: ["arabic", "english", "bilingual", "عربي", "إنجليزي", "ثنائي اللغة"],
        replyEn: ({ service }) => `${service.name} is especially relevant for bilingual businesses when the same message must stay clear across Arabic and English touchpoints. Clean structure matters more than decorative complexity here.`,
        replyAr: ({ service }) => `${service.nameAr} مهم خصوصًا للأعمال ثنائية اللغة عندما يجب أن تبقى الرسالة واضحة عبر اللمسات العربية والإنجليزية. هنا يهم البناء النظيف أكثر من الزخرفة.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "content-heavy",
        keywords: ["content", "many pages", "information heavy", "محتوى كثير", "صفحات كثيرة", "معلومات كثيرة"],
        replyEn: ({ service, categoryEn }) => `${service.name} helps when content volume is high and ${categoryEn} risks becoming messy. It adds structure so visitors can find the next step faster.`,
        replyAr: ({ service, categoryAr }) => `${service.nameAr} يساعد عندما يكون حجم المحتوى كبيرًا وتكون ${categoryAr} مهددة بالفوضى. فهو يضيف هيكلًا يجعل الزائر يصل للخطوة التالية أسرع.`,
        actions: ["services"],
    },
    {
        suffix: "sales-team",
        keywords: ["sales team", "follow up", "handoff", "فريق مبيعات", "متابعة", "تسليم"],
        replyEn: ({ service }) => `${service.name} is worth considering when the sales team needs cleaner handoff from interest to action. The more disciplined the flow, the less value gets lost between touchpoints.`,
        replyAr: ({ service }) => `${service.nameAr} يستحق النظر عندما يحتاج فريق المبيعات إلى تسليم أنظف من الاهتمام إلى الفعل. وكلما كان المسار أكثر انضباطًا قلّ الفاقد بين نقاط التماس.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "low-maintenance",
        keywords: ["maintenance", "easy to manage", "simple upkeep", "صيانة", "سهل الإدارة", "إدارة سهلة"],
        replyEn: ({ service, priceEn }) => `${service.name} at ${priceEn} is attractive if you want a controlled upgrade that does not create a heavy maintenance burden afterward.`,
        replyAr: ({ service, priceAr }) => `${service.nameAr} بسعر ${priceAr} جذاب إذا كنت تريد تحسينًا منضبطًا لا يخلق عبئًا كبيرًا في الصيانة بعد ذلك.`,
        actions: ["pricing", "services"],
    },
    {
        suffix: "validation",
        keywords: ["validate", "test idea", "mvp", "اختبار", "تحقق من الفكرة", "mvp"],
        replyEn: ({ service }) => `${service.name} is a sensible move for validation when you need a real-world signal fast instead of a perfect full system. It helps you learn before scaling the investment.`,
        replyAr: ({ service }) => `${service.nameAr} خطوة معقولة لاختبار الفكرة عندما تحتاج إشارة حقيقية بسرعة بدل نظام كامل مثالي. فهو يساعدك على التعلم قبل توسيع الاستثمار.`,
        actions: ["services", "pricing"],
    },
    {
        suffix: "scale",
        keywords: ["scale", "growing", "expansion", "توسع", "نمو", "تكبير"],
        replyEn: ({ service, categoryEn }) => `${service.name} becomes timely during growth when ${categoryEn} is starting to limit scale. Upgrading this layer early usually prevents more expensive fixes later.`,
        replyAr: ({ service, categoryAr }) => `${service.nameAr} يصبح مناسبًا أثناء النمو عندما تبدأ ${categoryAr} في تقييد التوسع. وترقية هذه الطبقة مبكرًا تمنع غالبًا إصلاحات أغلى لاحقًا.`,
        actions: ["services", "contact"],
    },
    {
        suffix: "competitive",
        keywords: ["competitor", "market", "stand out", "منافسين", "السوق", "تميز"],
        replyEn: ({ service }) => `${service.name} helps you stand out when competitors all look acceptable but not distinctive. It creates sharper differentiation by improving one customer-facing layer decisively.`,
        replyAr: ({ service }) => `${service.nameAr} يساعدك على التميز عندما يبدو المنافسون جميعًا مقبولين لكن غير متفردين. فهو يخلق فارقًا أوضح عبر تحسين طبقة واحدة ظاهرة للعميل بشكل حاسم.`,
        actions: ["preview", "contact"],
    },
];

const buildServiceIntentContext = (service: Service, categoryKey: string): ServiceScenarioContext => ({
    service,
    categoryEn: CATEGORY_LABELS_EN[categoryKey],
    categoryAr: CATEGORY_LABELS[categoryKey],
    priceEn: formatPriceEn(service.price),
    priceAr: formatPriceAr(service.price),
});

const serviceIntentScenarios: HomeAiTrainingScenario[] = Object.entries(SERVICES).flatMap(([categoryKey, categoryServices]) =>
    categoryServices.flatMap((service) => {
        const context = buildServiceIntentContext(service, categoryKey);
        const baseKeywords = buildServiceKeywords(service, categoryKey);

        return SERVICE_INTENT_TEMPLATES.map((template) => ({
            id: `${service.id}-${template.suffix}`,
            keywords: [...baseKeywords, ...template.keywords],
            replyEn: template.replyEn(context),
            replyAr: template.replyAr(context),
            actions: template.actions,
        }));
    }),
);

const serviceComparisonScenarios: HomeAiTrainingScenario[] = Object.entries(SERVICES).flatMap(([categoryKey, categoryServices]) => {
    const labelEn = CATEGORY_LABELS_EN[categoryKey];
    const labelAr = CATEGORY_LABELS[categoryKey];
    const scenarios: HomeAiTrainingScenario[] = [];

    for (let index = 0; index < categoryServices.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < categoryServices.length; compareIndex += 1) {
            const first = categoryServices[index];
            const second = categoryServices[compareIndex];
            const lower = first.price <= second.price ? first : second;
            const higher = first.price > second.price ? first : second;

            scenarios.push(
                {
                    id: `${first.id}-vs-${second.id}-difference`,
                    keywords: [first.id, second.id, first.name.toLowerCase(), second.name.toLowerCase(), first.nameAr, second.nameAr, "vs", "compare", "difference", "قارن", "الفرق", "ولا"],
                    replyEn: `${first.name} and ${second.name} both sit inside ${labelEn}, but ${lower.name} is the lighter-scope choice at ${formatPriceEn(lower.price)} while ${higher.name} at ${formatPriceEn(higher.price)} fits the broader or more demanding version of the same need.`,
                    replyAr: `${first.nameAr} و${second.nameAr} داخل ${labelAr}، لكن ${lower.nameAr} هو الخيار الأخف نطاقًا بسعر ${formatPriceAr(lower.price)} بينما ${higher.nameAr} بسعر ${formatPriceAr(higher.price)} يناسب النسخة الأوسع أو الأكثر تطلبًا من نفس الاحتياج.`,
                    actions: ["pricing", "services"],
                },
                {
                    id: `${first.id}-vs-${second.id}-choose`,
                    keywords: [first.id, second.id, first.name.toLowerCase(), second.name.toLowerCase(), first.nameAr, second.nameAr, "which one", "choose", "best for me", "أنهي", "اختار", "أفضل"],
                    replyEn: `Choose ${lower.name} if you need a focused upgrade and faster commitment. Choose ${higher.name} if the underlying requirement is larger and you do not want to outgrow the solution too quickly.`,
                    replyAr: `اختر ${lower.nameAr} إذا كنت تحتاج تحسينًا مركزًا والتزامًا أسرع. واختر ${higher.nameAr} إذا كان الاحتياج الأساسي أكبر ولا تريد أن تتجاوز الحل بسرعة.`,
                    actions: ["pricing", "contact"],
                },
            );
        }
    }

    return scenarios;
});

const packageServiceScenarios: HomeAiTrainingScenario[] = Object.values(PACKAGES).flatMap((pkg) =>
    Object.entries(SERVICES).flatMap(([categoryKey, categoryServices]) =>
        categoryServices.flatMap((service) => {
            const serviceInPackage = pkg.includedServices.includes(service.id);
            const categoryEn = CATEGORY_LABELS_EN[categoryKey];
            const categoryAr = CATEGORY_LABELS[categoryKey];

            return [
                {
                    id: `${pkg.id}-${service.id}-fit`,
                    keywords: [pkg.name.toLowerCase(), pkg.nameAr, service.id, service.name.toLowerCase(), service.nameAr, "included", "inside", "يشمل", "ضمن", "contains"],
                    replyEn: serviceInPackage
                        ? `${service.name} is already covered inside ${pkg.name}, so the package becomes more attractive if you were planning to buy this service alongside other connected deliverables.`
                        : `${service.name} is not part of ${pkg.name}, so if this service is central to your need, compare the package against a custom route before deciding.`,
                    replyAr: serviceInPackage
                        ? `${service.nameAr} موجود أصلًا ضمن ${pkg.nameAr}، لذلك تصبح الباقة أكثر جاذبية إذا كنت تنوي شراء هذه الخدمة مع مخرجات مترابطة أخرى.`
                        : `${service.nameAr} غير موجود داخل ${pkg.nameAr}، لذلك إذا كانت هذه الخدمة محورية لاحتياجك فالأفضل مقارنة الباقة بمسار مخصص قبل القرار.`,
                    actions: ["pricing", "contact"],
                },
                {
                    id: `${pkg.id}-${service.id}-compare`,
                    keywords: [pkg.name.toLowerCase(), pkg.nameAr, service.id, service.name.toLowerCase(), service.nameAr, categoryEn.toLowerCase(), categoryAr, "vs", "compare", "package or service", "باقة ولا خدمة"],
                    replyEn: serviceInPackage
                        ? `If ${service.name} is the main thing you need, buying it standalone may be enough. But if you also need the surrounding layers, ${pkg.name} can give better overall value than assembling each line item separately.`
                        : `If ${service.name} is your top priority inside ${categoryEn}, the standalone service is the more precise choice. ${pkg.name} only makes sense if the rest of its included structure also serves your goal.`,
                    replyAr: serviceInPackage
                        ? `إذا كانت ${service.nameAr} هي الشيء الأساسي الذي تحتاجه، فقد تكفيك منفصلة. لكن إذا كنت تحتاج الطبقات المحيطة أيضًا، فقد تعطيك ${pkg.nameAr} قيمة إجمالية أفضل من تركيب البنود منفصلة.`
                        : `إذا كانت ${service.nameAr} هي أولويتك الأساسية داخل ${categoryAr}، فالخدمة المنفصلة هي الخيار الأدق. أما ${pkg.nameAr} فتكون منطقية فقط إذا كانت بقية بنيتها تخدم هدفك أيضًا.`,
                    actions: ["pricing", "services"],
                },
            ];
        }),
    ),
);

const categoryComparisonScenarios: HomeAiTrainingScenario[] = (() => {
    const categoryEntries = Object.entries(SERVICES);
    const scenarios: HomeAiTrainingScenario[] = [];

    for (let index = 0; index < categoryEntries.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < categoryEntries.length; compareIndex += 1) {
            const [leftKey, leftServices] = categoryEntries[index];
            const [rightKey, rightServices] = categoryEntries[compareIndex];
            const leftLabelEn = CATEGORY_LABELS_EN[leftKey];
            const rightLabelEn = CATEGORY_LABELS_EN[rightKey];
            const leftLabelAr = CATEGORY_LABELS[leftKey];
            const rightLabelAr = CATEGORY_LABELS[rightKey];

            scenarios.push(
                {
                    id: `${leftKey}-vs-${rightKey}-difference`,
                    keywords: [leftKey, rightKey, leftLabelEn.toLowerCase(), rightLabelEn.toLowerCase(), leftLabelAr, rightLabelAr, "vs", "compare", "difference", "الفرق", "مقارنة"],
                    replyEn: `${leftLabelEn} and ${rightLabelEn} solve different layers of the business. ${leftLabelEn} is relevant when the bottleneck is on that side of the journey, while ${rightLabelEn} matters if that is where friction is actually happening.`,
                    replyAr: `${leftLabelAr} و${rightLabelAr} يعالجان طبقات مختلفة من النشاط. تكون ${leftLabelAr} مهمة عندما تكون نقطة التعطيل في تلك الجهة من الرحلة، بينما تهم ${rightLabelAr} إذا كان الاحتكاك الحقيقي هناك.`,
                    actions: ["services", "contact"],
                },
                {
                    id: `${leftKey}-vs-${rightKey}-budget`,
                    keywords: [leftKey, rightKey, leftLabelEn.toLowerCase(), rightLabelEn.toLowerCase(), leftLabelAr, rightLabelAr, "budget first", "where to start", "أبدأ منين", "أصرف على إيه الأول"],
                    replyEn: `If budget forces a choice between ${leftLabelEn} and ${rightLabelEn}, start with the category closest to your current bottleneck. The right first spend is not the flashiest layer; it is the one currently blocking momentum.`,
                    replyAr: `إذا فرضت الميزانية الاختيار بين ${leftLabelAr} و${rightLabelAr}، فابدأ بالفئة الأقرب إلى نقطة التعطيل الحالية. الإنفاق الصحيح أولًا ليس على الطبقة الأكثر بهرجة بل على الطبقة التي تعطل الزخم الآن.`,
                    actions: ["services", "pricing"],
                },
            );
        }
    }

    return scenarios;
})();

const serviceScenarios: HomeAiTrainingScenario[] = Object.entries(SERVICES).flatMap(([categoryKey, categoryServices]) =>
    categoryServices.flatMap((service) => buildServiceScenarios(service, categoryKey)),
);

export const HOME_AI_PRICING_TRAINING_SCENARIOS: HomeAiTrainingScenario[] = [
    ...packageScenarios,
    ...categoryScenarios,
    ...serviceScenarios,
    ...serviceIntentScenarios,
    ...serviceComparisonScenarios,
    ...packageServiceScenarios,
    ...categoryComparisonScenarios,
];

export const HOME_AI_PRICING_TRAINING_COUNT = HOME_AI_PRICING_TRAINING_SCENARIOS.length;