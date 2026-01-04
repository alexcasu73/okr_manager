import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-6">
          {title && <h3 className="text-lg font-bold text-gray-800">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
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
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800 focus:ring-gray-900",
    secondary: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:ring-indigo-500",
    outline: "border border-gray-200 text-gray-700 bg-transparent hover:bg-gray-50 focus:ring-gray-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500"
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
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
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
    <div className={`w-full bg-gray-100 rounded-full ${height}`}>
      <div 
        className={`${height} rounded-full transition-all duration-500 ${color}`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
