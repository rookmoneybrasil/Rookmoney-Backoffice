'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; transform: string } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function show() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    if      (position === 'top')    setCoords({ top: r.top - 8,              left: r.left + r.width / 2,  transform: 'translate(-50%, -100%)' })
    else if (position === 'bottom') setCoords({ top: r.bottom + 8,           left: r.left + r.width / 2,  transform: 'translate(-50%, 0)'     })
    else if (position === 'left')   setCoords({ top: r.top + r.height / 2,   left: r.left - 8,             transform: 'translate(-100%, -50%)' })
    else                            setCoords({ top: r.top + r.height / 2,   left: r.right + 8,            transform: 'translate(0, -50%)'     })
  }

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={() => setCoords(null)} className="inline-flex items-center">
        {children}
      </span>
      {mounted && coords && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] w-max max-w-[220px] whitespace-normal"
          style={{ top: coords.top, left: coords.left, transform: coords.transform }}
        >
          <span className="block bg-gray-950 border border-white/20 text-slate-300 text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-2xl">
            {text}
          </span>
        </div>,
        document.body
      )}
    </>
  )
}

export function InfoIcon({ text, position }: { text: string; position?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="inline-flex items-center justify-center size-3.5 rounded-full bg-ink-700 border border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 cursor-help text-[9px] font-bold leading-none select-none transition-colors shrink-0">
        ?
      </span>
    </Tooltip>
  )
}
