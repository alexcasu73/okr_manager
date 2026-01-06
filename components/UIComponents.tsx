import React, { useState, useRef, useEffect } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action, onClick }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-800/90 rounded-3xl p-5 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700/50 flex flex-col transition-colors duration-300 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {(title || action) && (
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          {title && <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900";

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus:ring-slate-900 dark:focus:ring-slate-400",
    secondary: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70 focus:ring-indigo-500",
    outline: "border border-gray-200 text-gray-700 bg-transparent hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50 focus:ring-gray-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 focus:ring-red-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'gray', className = '' }) => {
  const colors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'bg-blue-500', height = 'h-2' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`w-full bg-gray-100 dark:bg-gray-700 rounded-full ${height}`}>
      <div
        className={`${height} rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

// Tooltip Component
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 200,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let x = 0;
      let y = 0;

      switch (position) {
        case 'top':
          x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          y = triggerRect.top - tooltipRect.height - 8;
          break;
        case 'bottom':
          x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          y = triggerRect.bottom + 8;
          break;
        case 'left':
          x = triggerRect.left - tooltipRect.width - 8;
          y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          break;
        case 'right':
          x = triggerRect.right + 8;
          y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          break;
      }

      // Keep tooltip within viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

      setCoords({ x, y });
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`absolute z-[9999] ${positionClasses[position]} pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// InfoTooltip - A small info icon with tooltip
interface InfoTooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, position = 'top' }) => {
  return (
    <Tooltip content={content} position={position}>
      <span className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      </span>
    </Tooltip>
  );
};
