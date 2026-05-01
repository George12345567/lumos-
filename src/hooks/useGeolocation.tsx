import { useState, useCallback } from 'react';

interface GeolocationState {
    location: string | null;
    coordinates: { lat: number; lng: number } | null;
    error: string | null;
    loading: boolean;
}

export const useGeolocation = () => {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        coordinates: null,
        error: null,
        loading: false,
    });

    const requestLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: 'Geolocation is not supported by your browser',
            }));
            return;
        }

        // Check permission state before prompting — avoids browser
        // console warning when user has permanently dismissed the prompt
        if (navigator.permissions) {
            try {
                const perm = await navigator.permissions.query({ name: 'geolocation' });
                if (perm.state === 'denied') {
                    setState(prev => ({
                        ...prev,
                        error: 'Location permission denied',
                        loading: false,
                    }));
                    return;
                }
            } catch {
                // Permissions API not fully supported — fall through
            }
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

                setState({
                    location: mapsLink,
                    coordinates: { lat, lng },
                    error: null,
                    loading: false,
                });
            },
            (error) => {
                let errorMessage = 'Unable to retrieve location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }

                setState({
                    location: null,
                    coordinates: null,
                    error: errorMessage,
                    loading: false,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    const clearLocation = useCallback(() => {
        setState({
            location: null,
            coordinates: null,
            error: null,
            loading: false,
        });
    }, []);

    return {
        ...state,
        requestLocation,
        clearLocation,
    };
};
