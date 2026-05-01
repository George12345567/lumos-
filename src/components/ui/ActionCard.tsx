/**
 * ActionCard — Reusable lift card that triggers an action/modal
 * Uses Framer Motion for hover-lift effect with soft drop shadow
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ActionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: string | number;
  accentColor?: string;   // Tailwind class e.g. 'bg-cyan-500'
  accentText?: string;    // e.g. 'text-cyan-600'
  accentBg?: string;      // e.g. 'bg-cyan-50'
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

const ActionCard = ({
  icon,
  title,
  subtitle,
  badge,
  accentColor = 'bg-slate-900',
  accentText = 'text-slate-600',
  accentBg = 'bg-slate-50',
  onClick,
  children,
  className = '',
  disabled = false,
}: ActionCardProps) => {
  return (
    <motion.button
      whileHover={disabled ? {} : { y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.10)' }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full text-left rounded-2xl border border-slate-200
        bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]
        transition-colors duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300'}
        ${className}
      `}
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          {/* Icon box */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accentBg}`}>
            <span className={accentText}>{icon}</span>
          </div>
          {/* Badge */}
          {badge !== undefined && badge !== null && (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${accentBg} ${accentText} border border-current/10`}>
              {badge}
            </span>
          )}
        </div>

        {/* Text */}
        <div>
          <h3 className="text-base font-bold text-slate-800 leading-tight mb-0.5">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 font-medium leading-snug">{subtitle}</p>}
        </div>

        {/* Optional extra content */}
        {children && <div className="mt-1">{children}</div>}

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl ${accentColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
      </div>
    </motion.button>
  );
};

export default ActionCard;
