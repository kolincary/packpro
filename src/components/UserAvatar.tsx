import React from 'react';

interface UserAvatarProps {
  role: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  role,
  size = 'md',
  className = '',
}) => {
  const normalizedRole = role.toLowerCase();

  // Define premium hand-crafted gradient themes and typography initials for each role
  let theme = {
    bg: 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857]', // Emerald
    ring: 'ring-emerald-500/20',
    text: 'text-white font-extrabold',
    initials: 'OP',
    single: 'O',
    borderColor: 'border-emerald-300/40',
  };

  if (normalizedRole === 'admin') {
    theme = {
      bg: 'bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]', // Royal Blue
      ring: 'ring-blue-500/20',
      text: 'text-white font-extrabold',
      initials: 'AD',
      single: 'A',
      borderColor: 'border-blue-300/40',
    };
  } else if (normalizedRole === 'developer') {
    theme = {
      bg: 'bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]', // Deep Purple
      ring: 'ring-purple-500/20',
      text: 'text-white font-extrabold',
      initials: 'DV',
      single: 'D',
      borderColor: 'border-purple-300/40',
    };
  }

  // Size dimensions matching standard UI requirements
  const sizeClasses = {
    xs: 'h-6 w-6 text-[9px] tracking-tighter',
    sm: 'h-8 w-8 text-[11px] tracking-tight',
    md: 'h-10 w-10 text-[13px] tracking-normal',
    lg: 'h-11 w-11 text-[14px] tracking-normal',
    xl: 'h-14 w-14 text-[16px] tracking-wide',
    '2xl': 'h-16 w-16 text-[18px] tracking-widest',
  }[size];

  const useSingle = size === 'xs';
  const displayText = useSingle ? theme.single : theme.initials;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-full ${theme.bg} ${theme.text} ${sizeClasses} shadow-md border ${theme.borderColor} ring-2 ring-offset-1 ring-slate-100 font-sans font-black select-none ${className}`}
      id={`avatar-${normalizedRole}-${size}`}
    >
      <span className="font-bold font-mono tracking-normal leading-none">{displayText}</span>
      
      {/* Premium glossy overlay highlight */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
    </div>
  );
};
