import React from 'react';

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({children, className}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{
  onClick?: () => void, 
  variant?: 'primary' | 'danger' | 'ghost', 
  children: React.ReactNode,
  className?: string,
  disabled?: boolean
}> = ({onClick, variant = 'primary', children, className, disabled}) => {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "bg-slate-100 hover:bg-slate-200 text-slate-700"
  };
  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
