import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast(){
  return useContext(ToastContext)
}

export default function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 rounded shadow bg-white/5 text-white">{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
