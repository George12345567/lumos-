import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className }) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);
    const shimmer = useTransform(mouseX, [-0.5, 0.5], ["-100%", "200%"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXPos = e.clientX - rect.left;
        const mouseYPos = e.clientY - rect.top;
        const xPct = mouseXPos / width - 0.5;
        const yPct = mouseYPos / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative transform-gpu perspective-1000 ${className}`}
        >
            <div style={{ transform: "translateZ(0px)" }} className="relative w-full h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white/50 backdrop-blur-xl overflow-hidden">

                {/* Shimmer Effect */}
                <motion.div
                    style={{
                        background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.8) 50%, transparent 80%)',
                        x: shimmer,
                        top: 0,
                        bottom: 0,
                        width: '50%',
                        position: 'absolute',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                />

                <div style={{ transform: "translateZ(20px)" }} className="relative z-10 w-full h-full">
                    {children}
                </div>
            </div>
        </motion.div>
    );
};
