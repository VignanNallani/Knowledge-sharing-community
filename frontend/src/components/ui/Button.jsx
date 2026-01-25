import React from 'react'

export default function Button({ children, className = '', variant = 'primary', ...props }){
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-transform select-none'
  const variants = {
    primary: 'px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-md hover:scale-[0.997] active:scale-95',
    ghost: 'px-3 py-1 text-slate-200 hover:bg-white/5',
  }
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}
