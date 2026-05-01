/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';

export const AnimatedPrice = ({ value }: { value: number }) => {
    const [displayed, setDisplayed] = useState(value);
    const prev = useRef(value);

    useEffect(() => {
        const start = prev.current;
        const diff = value - start;
        if (!diff) return;
        const frames = 12;
        const step = diff / frames;
        let f = 0;
        const t = setInterval(() => {
            f++;
            if (f >= frames) {
                setDisplayed(value);
                prev.current = value;
                clearInterval(t);
            } else {
                setDisplayed(Math.round(start + step * f));
            }
        }, 20);
        return () => clearInterval(t);
    }, [value]);

    return <span>{displayed.toLocaleString('en-US')}</span>;
};

export const slide = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export const isValidPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return false;
    return /^[+\d\s()-]+$/.test(phone);
};
