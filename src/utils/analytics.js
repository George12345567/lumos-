// Track page load time for engagement metrics
const PAGE_LOAD_TIME = performance.now();

/**
 * Parse UTM parameters from URL for marketing attribution
 * @returns {Object} UTM parameters or categorized traffic source
 */
function getMarketingAttribution() {
    const urlParams = new URLSearchParams(window.location.search);

    const utm_source = urlParams.get('utm_source');
    const utm_medium = urlParams.get('utm_medium');
    const utm_campaign = urlParams.get('utm_campaign');
    const utm_term = urlParams.get('utm_term');
    const utm_content = urlParams.get('utm_content');

    // If UTM parameters exist, use them
    if (utm_source || utm_medium || utm_campaign) {
        return {
            source: utm_source || 'unknown',
            medium: utm_medium || 'unknown',
            campaign: utm_campaign || 'unknown',
            term: utm_term || null,
            content: utm_content || null,
            attribution_type: 'utm_tracked'
        };
    }

    // Otherwise categorize based on referrer
    const referrer = document.referrer;

    if (!referrer) {
        return {
            source: 'direct',
            medium: 'none',
            campaign: 'direct_traffic',
            term: null,
            content: null,
            attribution_type: 'direct'
        };
    }

    // Check for common search engines
    if (referrer.includes('google.com')) {
        return {
            source: 'google',
            medium: 'organic',
            campaign: 'organic_search',
            term: null,
            content: null,
            attribution_type: 'organic'
        };
    } else if (referrer.includes('facebook.com') || referrer.includes('fb.com')) {
        return {
            source: 'facebook',
            medium: 'social',
            campaign: 'social_referral',
            term: null,
            content: null,
            attribution_type: 'social'
        };
    } else if (referrer.includes('instagram.com')) {
        return {
            source: 'instagram',
            medium: 'social',
            campaign: 'social_referral',
            term: null,
            content: null,
            attribution_type: 'social'
        };
    } else if (referrer.includes('linkedin.com')) {
        return {
            source: 'linkedin',
            medium: 'social',
            campaign: 'social_referral',
            term: null,
            content: null,
            attribution_type: 'social'
        };
    } else if (referrer.includes('twitter.com') || referrer.includes('t.co')) {
        return {
            source: 'twitter',
            medium: 'social',
            campaign: 'social_referral',
            term: null,
            content: null,
            attribution_type: 'social'
        };
    }

    // Generic referral
    return {
        source: new URL(referrer).hostname,
        medium: 'referral',
        campaign: 'referral_traffic',
        term: null,
        content: null,
        attribution_type: 'referral'
    };
}

/**
 * Fetch IP-based geolocation data from public API
 * @returns {Promise<Object>} Location data with IP, City, Country, ISP
 */
async function getIPGeolocation() {
    try {
        // Try ipapi.co first
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('ipapi.co failed');

        const data = await response.json();

        return {
            ip: data.ip || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            country_code: data.country_code || 'Unknown',
            isp: data.org || 'Unknown',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            timezone_ip: data.timezone || 'Unknown',
            api_used: 'ipapi.co'
        };
    } catch (error) {
        console.warn('IP Geolocation failed:', error);

        // Fallback: Try ipwho.is
        try {
            const fallbackResponse = await fetch('https://ipwho.is/', {
                method: 'GET'
            });

            const fallbackData = await fallbackResponse.json();

            if (fallbackData.success) {
                return {
                    ip: fallbackData.ip || 'Unknown',
                    city: fallbackData.city || 'Unknown',
                    region: fallbackData.region || 'Unknown',
                    country: fallbackData.country || 'Unknown',
                    country_code: fallbackData.country_code || 'Unknown',
                    isp: fallbackData.connection?.isp || 'Unknown',
                    latitude: fallbackData.latitude || null,
                    longitude: fallbackData.longitude || null,
                    timezone_ip: fallbackData.timezone?.id || 'Unknown',
                    api_used: 'ipwho.is'
                };
            }
        } catch (fallbackError) {
            console.warn('Fallback IP API failed:', fallbackError);
        }

        // Return unknown if all APIs fail
        return {
            ip: 'API_Failed',
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            country_code: 'Unknown',
            isp: 'Unknown',
            latitude: null,
            longitude: null,
            timezone_ip: 'Unknown',
            api_used: 'none'
        };
    }
}

/**
 * Calculate engagement metrics (time on site, visit count)
 * @returns {Object} Engagement data
 */
function getEngagementMetrics() {
    // Calculate time on site in seconds
    const timeOnSite = Math.round((performance.now() - PAGE_LOAD_TIME) / 1000);

    // Get or initialize visit count from localStorage
    const VISIT_KEY = 'lumos_visit_count';
    const FIRST_VISIT_KEY = 'lumos_first_visit';

    let visitCount = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
    visitCount += 1;
    localStorage.setItem(VISIT_KEY, visitCount.toString());

    // Track first visit timestamp
    let firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    if (!firstVisit) {
        firstVisit = new Date().toISOString();
        localStorage.setItem(FIRST_VISIT_KEY, firstVisit);
    }

    // Calculate days since first visit
    const daysSinceFirstVisit = Math.floor(
        (Date.now() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
        time_on_site_sec: timeOnSite,
        visit_count: visitCount,
        is_returning_visitor: visitCount > 1,
        first_visit_date: firstVisit,
        days_since_first_visit: daysSinceFirstVisit,
        session_timestamp: new Date().toISOString()
    };
}

/**
 * Collects technical device and browser data
 * @returns {Object} Technical specifications
 */
function getTechnicalData() {
    const userAgent = navigator.userAgent;

    // Detect OS
    let os = 'Unknown';
    if (userAgent.indexOf('Win') !== -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') !== -1) os = 'MacOS';
    else if (userAgent.indexOf('Linux') !== -1) os = 'Linux';
    else if (userAgent.indexOf('Android') !== -1) os = 'Android';
    else if (userAgent.indexOf('iOS') !== -1 || userAgent.indexOf('iPhone') !== -1 || userAgent.indexOf('iPad') !== -1) os = 'iOS';

    // Detect Browser
    let browser = 'Unknown';
    if (userAgent.indexOf('Firefox') !== -1) browser = 'Firefox';
    else if (userAgent.indexOf('Edg') !== -1) browser = 'Edge';
    else if (userAgent.indexOf('Chrome') !== -1) browser = 'Chrome';
    else if (userAgent.indexOf('Safari') !== -1) browser = 'Safari';
    else if (userAgent.indexOf('Opera') !== -1 || userAgent.indexOf('OPR') !== -1) browser = 'Opera';

    // Detect device type
    let deviceType = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
    else if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';

    // Network Type (if available)
    let networkType = 'Unknown';
    let networkSpeed = null;
    if (navigator.connection) {
        networkType = navigator.connection.effectiveType || navigator.connection.type || 'Unknown';
        networkSpeed = {
            downlink: navigator.connection.downlink || null,
            rtt: navigator.connection.rtt || null
        };
    }

    return {
        device_type: deviceType,
        os: os,
        browser: browser,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        screen_size: `${window.screen.width}x${window.screen.height}`,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        color_depth: screen.colorDepth,
        pixel_ratio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        languages: navigator.languages || [navigator.language],
        platform: navigator.platform,
        user_agent: userAgent,
        device_memory: navigator.deviceMemory || 'Unknown',
        hardware_concurrency: navigator.hardwareConcurrency || 'Unknown',
        network_type: networkType,
        network_speed: networkSpeed,
        referrer: document.referrer || 'Direct',
        cookies_enabled: navigator.cookieEnabled,
        do_not_track: navigator.doNotTrack || 'Unspecified'
    };
}

/**
 * MAIN FUNCTION: Collects comprehensive Business Intelligence data
 * @returns {Promise<Object>} Complete analytics data with tech, marketing, location, and behavior
 */
export async function collectUserData() {
    try {
        // Collect all data in parallel for performance
        const [ipLocation, gpsLocation] = await Promise.all([
            getIPGeolocation(),
            getLocationUrl()
        ]);

        const marketing = getMarketingAttribution();
        const engagement = getEngagementMetrics();
        const tech = getTechnicalData();

        return {
            tech: tech,
            marketing: marketing,
            location_ip: ipLocation,
            location_gps: gpsLocation,
            behavior: engagement,
            timestamp: new Date().toISOString(),
            data_version: '2.0'
        };
    } catch (error) {
        console.error('Error collecting user data:', error);

        // Return minimal data if collection fails
        return {
            tech: getTechnicalData(),
            marketing: getMarketingAttribution(),
            location_ip: { ip: 'Collection_Failed', city: 'Unknown', region: 'Unknown', country: 'Unknown', country_code: 'Unknown', isp: 'Unknown', latitude: null, longitude: null, timezone_ip: 'Unknown', api_used: 'none' },
            location_gps: 'Collection_Failed',
            behavior: getEngagementMetrics(),
            timestamp: new Date().toISOString(),
            data_version: '2.0',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Gets user's geolocation and returns Google Maps URL
 * @returns {Promise<string>} Google Maps URL or error message
 */
export async function getLocationUrl() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                resolve(mapsUrl);
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve('Location access denied');
            },
            { timeout: 5000 }
        );
    });
}

// Backwards compatibility exports
export const getTechData = async () => {
    const data = await collectUserData();
    return data.tech;
};
