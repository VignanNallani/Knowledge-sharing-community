import React from 'react'

export default function Card({ children, className = '' }){
  return (
    <div className={`p-4 ${className} bg-gradient-to-b from-white/3 to-white/2 rounded-xl border border-white/5 shadow-sm`}>{children}</div>
  )
}
