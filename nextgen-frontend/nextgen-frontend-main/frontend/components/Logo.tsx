import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center flex-shrink-0 ${className}`}>
      <svg viewBox="0 0 20 20" fill="none" className={sizeClasses[size]}>
        {/* Big squares */}
        <rect x="0.5"  y="0.5"  width="9" height="9" rx="2" fill="#6D6AF5"/>
        <rect x="10.5" y="0.5"  width="9" height="9" rx="2" fill="#9C97F9"/>
        <rect x="0.5"  y="10.5" width="9" height="9" rx="2" fill="#CFCBFF"/>

        {/* Small grid */}
        <rect x="11.3" y="11.3" width="3.5" height="3.5" rx="0.5" fill="#918cdf"/>
        <rect x="15.5" y="11.3" width="3.5" height="3.5" rx="0.5" fill="#9C97F9"/>
        <rect x="11.3" y="15.5" width="3.5" height="3.5" rx="0.5" fill="#9C97F9"/>
        <rect x="15.5" y="15.5" width="3.5" height="3.5" rx="0.5" fill="#9695dd"/>
      </svg>
    </div>
  );
};

export default Logo;
