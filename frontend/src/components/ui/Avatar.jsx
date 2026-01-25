import React from 'react'

export default function Avatar({ src, name, size=48 }){
  if(src) return <img src={src} alt={name||'avatar'} className="w-12 h-12 rounded-full object-cover" />
  const initials = name ? name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase() : 'U'
  return (
    <div style={{width:size, height:size}} className="rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">{initials}</div>
  )
}
