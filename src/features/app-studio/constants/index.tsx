import { Flame, Coffee, Scissors, Pill, Store, Building2 } from 'lucide-react';
import type { ServiceType, Theme, MenuItem } from '../types';

// Service Types with Categories
export const SERVICE_TYPES: ServiceType[] = [
    {
        id: 'restaurant',
        name: 'مطعم',
        icon: <Flame className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '🍽️' },
            { id: 'grill', name: 'مشويات', icon: '🔥' },
            { id: 'sandwiches', name: 'سندوتشات', icon: '🥪' },
            { id: 'drinks', name: 'مشروبات', icon: '🥤' },
            { id: 'desserts', name: 'حلويات', icon: '🍰' },
        ],
        placeholder: 'مثال: مطعم الكبابجي',
        itemLabel: 'طبق',
    },
    {
        id: 'cafe',
        name: 'كافيه',
        icon: <Coffee className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '☕' },
            { id: 'hot', name: 'ساخن', icon: '🔥' },
            { id: 'cold', name: 'بارد', icon: '🧊' },
            { id: 'desserts', name: 'حلويات', icon: '🍰' },
            { id: 'snacks', name: 'سناكس', icon: '🍪' },
        ],
        placeholder: 'مثال: كافيه لافازا',
        itemLabel: 'منتج',
    },
    {
        id: 'salon',
        name: 'صالون',
        icon: <Scissors className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '✂️' },
            { id: 'haircut', name: 'قصات', icon: '💇' },
            { id: 'styling', name: 'تصفيف', icon: '💅' },
            { id: 'coloring', name: 'صبغات', icon: '🎨' },
            { id: 'treatments', name: 'علاجات', icon: '🧴' },
        ],
        placeholder: 'مثال: صالون جنى',
        itemLabel: 'خدمة',
    },
    {
        id: 'pharmacy',
        name: 'صيدلية',
        icon: <Pill className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '💊' },
            { id: 'medicines', name: 'أدوية', icon: '💉' },
            { id: 'vitamins', name: 'فيتامينات', icon: '🧪' },
            { id: 'cosmetics', name: 'مستحضرات', icon: '🧴' },
            { id: 'baby', name: 'أطفال', icon: '👶' },
        ],
        placeholder: 'مثال: صيدلية النور',
        itemLabel: 'منتج',
    },
    {
        id: 'store',
        name: 'متجر',
        icon: <Store className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '🛍️' },
            { id: 'electronics', name: 'إلكترونيات', icon: '📱' },
            { id: 'clothing', name: 'ملابس', icon: '👕' },
            { id: 'home', name: 'منزل', icon: '🏠' },
            { id: 'sports', name: 'رياضة', icon: '⚽' },
        ],
        placeholder: 'مثال: متجر الأحلام',
        itemLabel: 'منتج',
    },
    {
        id: 'clinic',
        name: 'عيادة',
        icon: <Building2 className="w-5 h-5" />,
        categories: [
            { id: 'all', name: 'الكل', icon: '🏥' },
            { id: 'consultation', name: 'استشارة', icon: '👨‍⚕️' },
            { id: 'examination', name: 'فحص', icon: '🔬' },
            { id: 'treatment', name: 'علاجات', icon: '💊' },
            { id: 'tests', name: 'تحاليل', icon: '🧪' },
        ],
        placeholder: 'مثال: عيادة النور',
        itemLabel: 'خدمة',
    },
];

// Theme Presets
export const THEME_PRESETS: Theme[] = [
    {
        id: 'violet',
        name: 'بنفسجي',
        primary: '#7c3aed',
        accent: '#a78bfa',
        background: '#faf5ff',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    },
    {
        id: 'rose',
        name: 'وردي',
        primary: '#e11d48',
        accent: '#fb7185',
        background: '#fff1f2',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #e11d48, #fb7185)',
    },
    {
        id: 'emerald',
        name: 'زمردي',
        primary: '#059669',
        accent: '#34d399',
        background: '#ecfdf5',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #059669, #34d399)',
    },
    {
        id: 'amber',
        name: 'عنبري',
        primary: '#d97706',
        accent: '#fbbf24',
        background: '#fef3c7',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #d97706, #fbbf24)',
    },
    {
        id: 'cyan',
        name: 'سماوي',
        primary: '#0891b2',
        accent: '#22d3ee',
        background: '#ecfeff',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)',
    },
    {
        id: 'indigo',
        name: 'نيلي',
        primary: '#4f46e5',
        accent: '#818cf8',
        background: '#eef2ff',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #4f46e5, #818cf8)',
    },
    {
        id: 'slate',
        name: 'رمادي',
        primary: '#475569',
        accent: '#94a3b8',
        background: '#f8fafc',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #475569, #94a3b8)',
    },
    {
        id: 'fuchsia',
        name: 'فوشيا',
        primary: '#c026d3',
        accent: '#e879f9',
        background: '#fae8ff',
        text: '#1f2937',
        gradient: 'linear-gradient(135deg, #c026d3, #e879f9)',
    },
];

// Magic Names for Auto-generation
export const MAGIC_NAMES = [
    'Lumos Elite',
    'Nova Digital',
    'Zenith Tech',
    'Aura Systems',
    'Pulse Media',
    'Velocity App',
    'Quantum Soft',
    'Nexus Core',
    'Vortex AI',
    'Echo Labs',
];

// Default Items by Service Type (from existing constants)
export const DEFAULT_ITEMS_BY_SERVICE: Record<string, MenuItem[]> = {
    restaurant: [
        {
            id: 1,
            name: 'ريش ضاني مدخنة',
            description: 'ريش ضاني طازجة مدخنة على الفحم مع الأرز والسلطة',
            price: 265,
            category: 'grill',
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        },
        {
            id: 2,
            name: 'شطيرة بريسكت',
            description: 'بريسكت مشوي مع الخضار الطازج والصلصة الخاصة',
            price: 210,
            category: 'sandwiches',
            image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
        },
        {
            id: 3,
            name: 'كوب شاي تركي',
            description: 'شاي تركي أصيل مع النعناع والليمون',
            price: 25,
            category: 'drinks',
            image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400',
        },
    ],
    cafe: [
        {
            id: 101,
            name: 'إسبريسو إيطالي',
            description: 'قهوة إسبريسو قوية ومكثفة من أجود أنواع البن',
            price: 35,
            category: 'hot',
            image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400',
        },
        {
            id: 102,
            name: 'كابتشينو كريمي',
            description: 'كابتشينو مع رغوة الحليب الكريمية والكاكاو',
            price: 45,
            category: 'hot',
            image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400',
        },
    ],
    salon: [
        {
            id: 201,
            name: 'قص شعر رجالي',
            description: 'قص شعر احترافي مع تصفيف وتشذيب',
            price: 120,
            category: 'haircut',
            image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400',
        },
    ],
    pharmacy: [
        {
            id: 301,
            name: 'باراسيتامول 500 مجم',
            description: 'مسكن للآلام وخافض للحرارة',
            price: 15,
            category: 'medicines',
            image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        },
    ],
    store: [
        {
            id: 401,
            name: 'هاتف ذكي',
            description: 'هاتف ذكي بشاشة 6.7 بوصة وكاميرا 108 ميجابكسل',
            price: 8500,
            category: 'electronics',
            image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        },
    ],
    clinic: [
        {
            id: 501,
            name: 'استشارة طبية عامة',
            description: 'فحص طبي شامل مع طبيب مختص',
            price: 200,
            category: 'consultation',
            image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400',
        },
    ],
};

// Default Design Config
export const DEFAULT_DESIGN_CONFIG = {
    layout: {
        spacing: 'classic' as const,
        viewMode: 'grid' as const,
        cardStyle: 'elevated' as const,
    },
    typography: {
        fontFamily: 'Cairo',
        fontSize: 'medium' as const,
        fontWeight: 'normal' as const,
    },
    effects: {
        enableGlass: true,
        glassOpacity: 0.1,
        blurStrength: 10,
        enableShadows: true,
        enableAnimations: true,
    },
    colors: {},
};
