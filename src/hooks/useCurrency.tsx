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

/**
 * ═══════════════════════════════════════════════════════════════════
 * useCurrency Hook - AUTO LOCATION DETECTION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Automatically detects user location using IP geolocation
 * Sets language and currency based on location:
 * - Egypt → Arabic + EGP
 * - Outside Egypt → English + USD
 * 
 * ═══════════════════════════════════════════════════════════════════
 */
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

        const fallback = () => {
            if (!mounted) return;
            setCurrencyData(prev => ({ ...prev, loading: false }));
        };

        const detectLocation = async () => {
            try {
                const cached = localStorage.getItem('lumos_geo_cache_v1');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached) as { ts: number; data: GeoLocation };
                        if (parsed?.ts && Date.now() - parsed.ts < 24 * 60 * 60 * 1000 && parsed.data) {
                            applyGeo(parsed.data);
                            return;
                        }
                    } catch { /* ignore cache parse issues */ }
                }

                const response = await fetch(
                    'https://ip-api.com/json/?fields=status,countryCode,country',
                    { signal: controller.signal }
                );

                if (!response.ok) throw new Error('Geolocation API failed');

                const raw = await response.json() as { status: string; countryCode?: string; country?: string };
                if (raw.status !== 'success') throw new Error('Geolocation API returned error');

                const data: GeoLocation = {
                    country_code: raw.countryCode || '',
                    country_name: raw.country || '',
                };

                try {
                    localStorage.setItem('lumos_geo_cache_v1', JSON.stringify({ ts: Date.now(), data }));
                } catch { /* ignore storage quota issues */ }

                applyGeo(data);

            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
                console.warn('Location detection failed, defaulting to Egypt:', error);
                fallback();
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
