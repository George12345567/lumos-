import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SERVICE_PAGE_BY_SLUG } from "@/data/servicePages";

function setMetaByName(name: string, content: string) {
    let node = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
    if (!node) {
        node = document.createElement("meta");
        node.setAttribute("name", name);
        document.head.appendChild(node);
    }
    node.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
    let node = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement | null;
    if (!node) {
        node = document.createElement("meta");
        node.setAttribute("property", property);
        document.head.appendChild(node);
    }
    node.setAttribute("content", content);
}

function setCanonical(url: string) {
    let node = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!node) {
        node = document.createElement("link");
        node.setAttribute("rel", "canonical");
        document.head.appendChild(node);
    }
    node.setAttribute("href", url);
}

export default function ServicePage() {
    const { slug = "" } = useParams<{ slug: string }>();
    const { isArabic, t } = useLanguage();
    const service = SERVICE_PAGE_BY_SLUG[slug];

    useEffect(() => {
        if (!service) return;

        const title = isArabic
            ? `${service.titleAr} | وكالة Lumos`
            : `${service.titleEn} | Lumos Agency`;
        const description = isArabic ? service.summaryAr : service.summaryEn;
        const canonical = `https://getlumos.studio/services/${service.slug}`;

        document.title = title;
        setMetaByName("description", description);
        setMetaByName("keywords", service.keywords);
        setMetaByProperty("og:title", title);
        setMetaByProperty("og:description", description);
        setMetaByProperty("og:type", "article");
        setMetaByProperty("og:url", canonical);
        setCanonical(canonical);
    }, [isArabic, service]);

    if (!service) {
        return <Navigate to="/" replace />;
    }

    const title = t(service.titleAr, service.titleEn);
    const subtitle = t(service.subtitleAr, service.subtitleEn);
    const summary = t(service.summaryAr, service.summaryEn);
    const bullets = isArabic ? service.bulletsAr : service.bulletsEn;

    return (
        <main className="min-h-screen bg-background text-foreground px-4 sm:px-6 py-10 sm:py-16">
            <section className="container mx-auto max-w-5xl" dir={isArabic ? "rtl" : "ltr"}>
                <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-background to-background p-6 sm:p-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("صفحة خدمة متخصصة", "Dedicated Service Page")}
                    </div>

                    <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{title}</h1>
                    <p className="mt-3 text-base sm:text-lg text-muted-foreground">{subtitle}</p>
                    <p className="mt-6 text-sm sm:text-base leading-7 text-foreground/90">{summary}</p>

                    <div className="mt-8 grid gap-3 sm:gap-4">
                        {bullets.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
                                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <p className="text-sm sm:text-base text-foreground/90">{item}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/#live-preview"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground font-semibold hover:opacity-90 transition"
                        >
                            {t("جرّب المعاينة التفاعلية", "Try Interactive Preview")}
                            <ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} />
                        </Link>
                        <Link
                            to="/#contact"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold hover:bg-secondary/60 transition"
                        >
                            {t("اطلب عرض سعر", "Request a Quote")}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
