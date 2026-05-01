// Utility to collect browser and device metadata
interface NavigatorConnection {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
    connection?: NavigatorConnection;
}

export const collectBrowserData = () => {
    const getBrowserName = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        return 'Unknown';
    };

    const getDeviceType = () => {
        const width = window.innerWidth;
        if (width < 768) return 'Mobile';
        if (width < 1024) return 'Tablet';
        return 'Desktop';
    };

    const getOS = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Win')) return 'Windows';
        if (userAgent.includes('Mac')) return 'MacOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
        return 'Unknown';
    };

    const getNetworkStatus = () => {
        const nav = navigator as NavigatorWithConnection;
        if (nav.connection) {
            const conn = nav.connection;
            return {
                effectiveType: conn?.effectiveType || 'unknown',
                downlink: conn?.downlink || 'unknown',
                rtt: conn?.rtt || 'unknown',
            };
        }
        return { effectiveType: 'unknown', downlink: 'unknown', rtt: 'unknown' };
    };

    const getTimezone = () => {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    };

    return {
        browser: getBrowserName(),
        os: getOS(),
        deviceType: getDeviceType(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        referrer: document.referrer || 'Direct',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timezone: getTimezone(),
        networkStatus: getNetworkStatus(),
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified',
    };
};
