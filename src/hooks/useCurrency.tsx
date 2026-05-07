import { useState, useEffect, useCallback } from 'react';

interface CurrencyData {
    country: string;
    countryCode: string;
    currency: 'EGP' | 'USD';
    currencySymbol: string;
    exchangeRate: number;
    isEgypt: boolean;
    language: 'ar' | 'en';
    loading: boolean;
}

interface GeoLocation {
    country_code?: string;
    country_name?: string;
}

const GEO_CACHE_KEY = 'lumos_geo_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const detectFromTimezone = (): GeoLocation => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Cairo') || tz.startsWith('Africa/')) {
            return { country_code: 'EG', country_name: 'Egypt' };
        }
    } catch {
        // best-effort detection; fall through to default
    }
    return { country_code: '', country_name: '' };
};

const detectFromIntl = (): GeoLocation => {
    try {
        const locale = navigator.language || '';
        if (locale.includes('ar-EG') || locale === 'ar') {
            return { country_code: 'EG', country_name: 'Egypt' };
        }
    } catch {
        // best-effort detection; fall through to default
    }
    return { country_code: '', country_name: '' };
};

async function fetchGeoAPIs(controller: AbortController): Promise<GeoLocation | null> {
    const apis: { url: string; parse: (data: Record<string, unknown>) => GeoLocation }[] = [
        {
            url: 'https://ipapi.co/json/',
            parse: (data) => ({
                country_code: (data.country_code as string) || '',
                country_name: (data.country_name as string) || '',
            }),
        },
        {
            url: 'https://ipwho.is/',
            parse: (data) => ({
                country_code: (data.country_code as string) || '',
                country_name: (data.country as string) || '',
            }),
        },
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api.url, { signal: controller.signal });
            if (!response.ok) continue;
            const data = await response.json();
            const geo = api.parse(data);
            if (geo.country_code) return geo;
        } catch {
            continue;
        }
    }
    return null;
}

export const useCurrency = () => {
    const [currencyData, setCurrencyData] = useState<CurrencyData>({
        country: 'Egypt',
        countryCode: 'EG',
        currency: 'EGP',
        currencySymbol: 'ج.م',
        exchangeRate: 1,
        isEgypt: true,
        language: 'ar',
        loading: true,
    });

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const applyGeo = (data: GeoLocation) => {
            if (!mounted) return;
            const isInEgypt = data.country_code === 'EG';
            setCurrencyData({
                country: data.country_name || 'Egypt',
                countryCode: data.country_code || 'EG',
                currency: isInEgypt ? 'EGP' : 'USD',
                currencySymbol: isInEgypt ? 'ج.م' : '$',
                exchangeRate: isInEgypt ? 1 : 0.032,
                isEgypt: isInEgypt,
                language: isInEgypt ? 'ar' : 'en',
                loading: false,
            });
        };

        const fallback = (geo?: GeoLocation) => {
            if (!mounted) return;
            if (geo?.country_code) {
                applyGeo(geo);
                return;
            }
            setCurrencyData(prev => ({ ...prev, loading: false }));
        };

        const detectLocation = async () => {
            try {
                const cached = localStorage.getItem(GEO_CACHE_KEY);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as { ts: number; data: GeoLocation };
                        if (parsed?.ts && Date.now() - parsed.ts < CACHE_TTL_MS && parsed.data?.country_code) {
                            applyGeo(parsed.data);
                            return;
                        }
                    } catch { /* ignore cache parse issues */ }
                }

                const apiResult = await fetchGeoAPIs(controller);
                if (apiResult) {
                    try {
                        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: apiResult }));
                    } catch { /* ignore quota */ }
                    if (mounted) applyGeo(apiResult);
                    return;
                }

                const tzGeo = detectFromTimezone();
                if (tzGeo.country_code) {
                    if (mounted) fallback(tzGeo);
                    return;
                }

                const intlGeo = detectFromIntl();
                if (mounted) fallback(intlGeo);
            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
                if (mounted) fallback();
            }
        };

        void detectLocation();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    const convertPrice = useCallback((priceInEGP: number): number => {
        if (currencyData.isEgypt) return priceInEGP;
        return Math.round(priceInEGP * currencyData.exchangeRate);
    }, [currencyData.isEgypt, currencyData.exchangeRate]);

    const formatPrice = useCallback((priceInEGP: number): string => {
        const convertedPrice = convertPrice(priceInEGP);
        return `${convertedPrice.toLocaleString()} ${currencyData.currencySymbol}`;
    }, [convertPrice, currencyData.currencySymbol]);

    return {
        ...currencyData,
        convertPrice,
        formatPrice,
    };
};