import React from 'react';
import { motion } from 'framer-motion';

interface ProfileSplitLayoutProps {
    children: React.ReactNode;
}

export const ProfileSplitLayout: React.FC<ProfileSplitLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#F8F9FA] relative overflow-hidden font-sans text-slate-900 selection:bg-cyan-500/20">
            {/* ─── AMBIENT BACKGROUND ─── */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Noise Texture */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03] z-0 pointer-events-none">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.6" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                </svg>

                {/* Floating Orbs */}
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                        opacity: [0.5, 0.3, 0.5]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-cyan-400/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 40, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[100px]"
                />
            </div>

            {/* ─── CONTENT CONTAINER ─── */}
            <div className="relative z-10 w-full max-w-[1400px] mx-auto min-h-screen p-6 md:p-12 flex items-center justify-center">
                <div className="w-full grid lg:grid-cols-[400px_1fr] gap-8 items-start">
                    {children}
                </div>
            </div>
        </div>
    );
};
