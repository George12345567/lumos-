import { useState, useEffect, useMemo } from "react";
import { Sparkles, ArrowRight, LogIn } from "lucide-react";
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TeamModal } from '@/features/team';

const TypewriterHero = () => {
    const { isAuthenticated, isAdmin } = useAuth();
    const { isArabic, t } = useLanguage();
    const [teamOpen, setTeamOpen] = useState(false);
    const words = useMemo(() => (isArabic ? ["براندات", "مواقع", "متاجر", "منصات"] : ["Brands", "Websites", "Stores", "Platforms"]), [isArabic]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentText, setCurrentText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Generate stars data once for better performance
    // Reduced counts for mobile performance
    const starsData = useMemo(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const smallStars = Array.from({ length: isMobile ? 10 : 15 }, (_, i) => ({
            id: `small-${i}`,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 3,
            duration: 2 + Math.random() * 3,
            left: Math.random() * 100,
            top: Math.random() * 100,
            opacity: 0.3 + Math.random() * 0.7,
        }));

        const mediumStars = Array.from({ length: 10 }, (_, i) => ({
            id: `medium-${i}`,
            size: Math.random() * 3 + 2,
            delay: Math.random() * 4,
            duration: 3 + Math.random() * 2,
            left: Math.random() * 100,
            top: Math.random() * 100,
            opacity: 0.5 + Math.random() * 0.5,
        }));

        const largeStars = Array.from({ length: 5 }, (_, i) => ({
            id: `large-${i}`,
            size: Math.random() * 4 + 3,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 2,
            left: Math.random() * 100,
            top: Math.random() * 100,
            opacity: 0.4 + Math.random() * 0.6,
        }));

        return { smallStars, mediumStars, largeStars };
    }, []);

    // Mouse parallax effect (skip on mobile/touch devices and reduced-motion)
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (prefersReducedMotion || isTouch) return;

        let rafId: number | null = null;
        const handleMouseMove = (e: MouseEvent) => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                setMousePosition({
                    x: (e.clientX / window.innerWidth - 0.5) * 20,
                    y: (e.clientY / window.innerHeight - 0.5) * 20,
                });
                rafId = null;
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        const currentWord = words[currentWordIndex];
        const typingSpeed = isDeleting ? 50 : 150;

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setCurrentText(currentWord.substring(0, currentText.length + 1));
                if (currentText === currentWord) {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                setCurrentText(currentWord.substring(0, currentText.length - 1));
                if (currentText === "") {
                    setIsDeleting(false);
                    setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
                }
            }
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [currentText, isDeleting, currentWordIndex, words]);

    const scrollToContact = () => {
        const element = document.getElementById("contact");
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section
            id="hero"
            className="min-h-[90svh] sm:min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-12 sm:pb-16 md:pb-20 lg:pb-24 relative overflow-hidden"
        >
            {/* Magical Stars Background with Parallax */}
            <div
                className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-300 ease-out"
                style={{
                    transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
                }}
            >
                {/* Animated Stars Layer 1 - Small Twinkling Stars */}
                {starsData.smallStars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full bg-white transition-all duration-1000 ease-out"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            boxShadow: `0 0 ${star.size * 2}px rgba(0, 188, 212, 0.9), 0 0 ${star.size * 4}px rgba(0, 188, 212, 0.5), 0 0 ${star.size * 6}px rgba(0, 188, 212, 0.2)`,
                            animation: `starTwinkle ${star.duration}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            animationDelay: `${star.delay}s`,
                            opacity: star.opacity,
                            willChange: 'opacity, transform',
                        }}
                    />
                ))}

                {/* Animated Stars Layer 2 - Medium Glowing Stars */}
                {starsData.mediumStars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full bg-cyan-400 transition-all duration-1000 ease-out"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            boxShadow: `0 0 ${star.size * 3}px rgba(0, 188, 212, 1), 0 0 ${star.size * 6}px rgba(0, 188, 212, 0.7), 0 0 ${star.size * 9}px rgba(0, 188, 212, 0.4), 0 0 ${star.size * 12}px rgba(0, 188, 212, 0.1)`,
                            animation: `starPulse ${star.duration}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            animationDelay: `${star.delay}s`,
                            filter: 'blur(0.5px)',
                            opacity: star.opacity,
                            willChange: 'opacity, transform, filter',
                        }}
                    />
                ))}

                {/* Animated Stars Layer 3 - Large Bright Stars */}
                {starsData.largeStars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full transition-all duration-1000 ease-out"
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            background: `radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(0, 188, 212, 0.9) 40%, rgba(0, 188, 212, 0.6) 70%, transparent 100%)`,
                            boxShadow: `0 0 ${star.size * 4}px rgba(0, 188, 212, 1), 0 0 ${star.size * 8}px rgba(0, 188, 212, 0.9), 0 0 ${star.size * 12}px rgba(0, 188, 212, 0.6), 0 0 ${star.size * 16}px rgba(0, 188, 212, 0.3)`,
                            animation: `starGlow ${star.duration}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            animationDelay: `${star.delay}s`,
                            filter: 'blur(1px)',
                            opacity: star.opacity,
                            willChange: 'opacity, transform, filter',
                        }}
                    />
                ))}

                {/* Shooting Stars - Enhanced */}
                {[...Array(2)].map((_, i) => {
                    const delay = i * 3;
                    const duration = 6 + i * 1.5;
                    const startX = 15 + i * 25;
                    const startY = 5 + i * 20;

                    return (
                        <div
                            key={`shooting-${i}`}
                            className="absolute"
                            style={{
                                left: `${startX}%`,
                                top: `${startY}%`,
                                width: '3px',
                                height: '120px',
                                background: `linear-gradient(to bottom, 
                  transparent 0%,
                  rgba(0, 188, 212, 0.3) 20%,
                  rgba(0, 188, 212, 0.9) 50%,
                  rgba(255, 255, 255, 0.8) 55%,
                  rgba(0, 188, 212, 0.3) 80%,
                  transparent 100%
                )`,
                                transform: `rotate(${-45 + i * 12}deg)`,
                                animation: `shootingStar ${duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                                animationDelay: `${delay}s`,
                                filter: 'blur(1.5px)',
                                willChange: 'transform, opacity',
                            }}
                        />
                    );
                })}

                {/* Floating Light Particles */}
                {[...Array(8)].map((_, i) => {
                    const size = Math.random() * 3 + 1;
                    const duration = 8 + Math.random() * 4;
                    const delay = Math.random() * 5;
                    const startX = Math.random() * 100;
                    const startY = 100 + Math.random() * 20;

                    return (
                        <div
                            key={`particle-${i}`}
                            className="absolute rounded-full bg-cyan-400"
                            style={{
                                left: `${startX}%`,
                                top: `${startY}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                boxShadow: `0 0 ${size * 4}px rgba(0, 188, 212, 0.8), 0 0 ${size * 8}px rgba(0, 188, 212, 0.4)`,
                                animation: `floatUp ${duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                                animationDelay: `${delay}s`,
                                opacity: 0.6,
                                willChange: 'transform, opacity',
                            }}
                        />
                    );
                })}
            </div>

            {/* Background Pattern - Gradient Orbs */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <div className="absolute top-10 left-20 w-64 h-64 bg-primary/15 rounded-full blur-3xl animate-orb"></div>
                <div className="absolute bottom-10 right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-orb-delayed"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
            </div>
            {/* Smooth transition gradient to next section */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none"></div>

            <div className="container mx-auto text-center relative z-10 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 px-4" dir={isArabic ? 'rtl' : 'ltr'}>

            <div className="flex items-center justify-center mb-2">
                <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold tracking-[0.25em] uppercase shadow-[0_0_15px_rgba(0,188,212,0.15)]">
                    LUMOS YOUR DIGITAL PARTNER
                </span>
            </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
                    {t('نبني', 'We Build')}{" "}
                    <span className={`text-primary inline-block min-w-[120px] sm:min-w-[160px] md:min-w-[240px] lg:min-w-[300px] ${isArabic ? 'text-right' : 'text-left'}`}>
                        {currentText}
                        <span className="animate-pulse">|</span>
                    </span>
                    <br />
                    <span className="text-foreground/80">{t('تستحق الانتباه', 'That Demand Attention')}</span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto px-2">
                    {t(
                        'نحوّل الأفكار إلى براندات واضحة، مواقع عالية التحويل، ومحتوى يدعم النمو التجاري من التخطيط حتى الإطلاق.',
                        'We turn ideas into clear brands, high-converting websites, and growth-ready content from strategy to launch.'
                    )}
                </p>

                {/* Buttons Container */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">


                    <button
                        onClick={scrollToContact}
                        className="btn-glow glow-ring px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 rounded-full text-sm sm:text-base lg:text-lg font-bold relative group"
                    >
                        <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                            <span className="hidden sm:inline">{t('احصل على استشارة مجانية', 'Get a Free Consultation')}</span>
                            <span className="sm:hidden">{t('استشارة مجانية', 'Free Consultation')}</span>
                            <span className="inline-flex w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-ping" />
                        </span>
                        <span className="absolute inset-[2px] rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
                    </button>

                    {/* Client Portal Button */}
                    <Link
                        to={isAuthenticated ? (isAdmin ? '/dashboard' : '/clients/profile') : '/client-login'}
                        className="px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 rounded-full text-sm sm:text-base lg:text-lg font-bold relative group border-2 border-primary/60 text-primary hover:border-primary hover:shadow-[0_0_24px_rgba(0,188,212,0.15)] transition-all duration-300 inline-flex items-center gap-2"
                    >
                        {isAuthenticated ? (
                            <>
                                <span className="relative z-10 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                                    <span className="hidden sm:inline">{t('اذهب إلى لوحة التحكم', 'Go to Dashboard')}</span>
                                    <span className="sm:hidden">{t('لوحة التحكم', 'Dashboard')}</span>
                                    <ArrowRight className={`w-4 h-4 transition-transform ${isArabic ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="relative z-10 flex items-center gap-2">
                                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="hidden sm:inline">{t('بوابة العميل', 'Client Portal')}</span>
                                    <span className="sm:hidden">{t('البوابة', 'Portal')}</span>
                                </span>
                                {/* Subtle glow on hover */}
                                <span className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </>
                        )}
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground px-2">
                    <span className="uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary/80">
                        {t('جودة لا مساومة', 'Uncompromising Quality')}
                    </span>
                    <span className="h-px w-8 sm:w-12 bg-primary/30 hidden sm:block" />
                    <span className="text-center">{t('تسليم احترافي · دعم مستمر · نتائج حقيقية', 'Professional Delivery · Ongoing Support · Real Results')}</span>
                </div>

                {/* Easter Egg */}
                <p
                    className="text-[10px] tracking-[0.5em] uppercase text-primary/15 select-none"
                    title="🪄 Lumos Maxima"
                >
                    ✦ Lumos Maxima ✦
                </p>

                {/* Team signature — subtle portfolio-style trigger */}
                <button
                    onClick={() => setTeamOpen(true)}
                    className="group mx-auto flex items-center gap-3 opacity-25 hover:opacity-80 transition-all duration-500 cursor-pointer select-none"
                    title={t('تعرف على الفريق', 'Meet the team')}
                >
                    {/* Overlapping avatars */}
                    <div className="flex items-center">
                        {[
                            { src: '/team/JAKE.jpeg',   z: 30 },
                            { src: '/team/JOHN.jpeg',   z: 20 },
                            { src: '/team/MARIAM.jpeg', z: 10 },
                        ].map(({ src, z }, i) => (
                            <img
                                key={src}
                                src={src}
                                alt=""
                                className="w-6 h-6 rounded-full border border-background/60 object-cover object-top group-hover:scale-110 transition-transform duration-300"
                                style={{
                                    marginLeft: i === 0 ? 0 : '-8px',
                                    zIndex: z,
                                    transitionDelay: `${i * 40}ms`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Label */}
                    <span className="text-[10px] tracking-[0.3em] uppercase text-primary/50 group-hover:text-primary transition-colors duration-300 font-medium">
                        {t('صُنع بواسطة فريقنا', 'crafted by our team')}
                    </span>

                    {/* Arrow that slides in on hover */}
                    <span className="text-primary/40 group-hover:text-primary text-xs translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                        →
                    </span>
                </button>

                <TeamModal open={teamOpen} onClose={() => setTeamOpen(false)} />
            </div>


        </section>
    );
};

export default TypewriterHero;

