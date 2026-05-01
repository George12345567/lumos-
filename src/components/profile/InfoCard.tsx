import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InfoCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    title?: string;
    icon?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({ children, className, onClick, title, icon }) => {
    return (
        <motion.div
            whileHover={onClick ? { y: -4, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)' } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onClick}
            className={cn(
                "bg-card rounded-[2rem] p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-100/50 backdrop-blur-xl transition-all relative overflow-hidden group",
                onClick && "cursor-pointer",
                className
            )}
        >
            {/* Shine effect on hover */}
            {onClick && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {(title || icon) && (
                <div className="flex items-center gap-3 mb-6">
                    {icon && <div className="text-slate-400 group-hover:text-cyan-600 transition-colors">{icon}</div>}
                    {title && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-muted-foreground transition-colors">{title}</h3>}
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};
