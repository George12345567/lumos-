import React from 'react';
import { motion } from 'framer-motion';

interface ProfileLayoutProps {
    children: React.ReactNode;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#F8F9FA] relative overflow-hidden font-sans text-slate-900 selection:bg-cyan-500/20">
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-cyan-400/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-3xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-6 z-10">
                {children}
            </div>
        </div>
    );
};
