'use client'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const posClass =
    position === 'top'    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
    position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' :
    position === 'left'   ? 'right-full top-1/2 -translate-y-1/2 mr-2' :
                            'left-full top-1/2 -translate-y-1/2 ml-2'

  const arrowClass =
    position === 'top'    ? 'top-full left-1/2 -translate-x-1/2 border-t-ink-600' :
    position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-ink-600' :
    position === 'left'   ? 'left-full top-1/2 -translate-y-1/2 border-l-ink-600' :
                            'right-full top-1/2 -translate-y-1/2 border-r-ink-600'

  return (
    <span className="relative group/tt inline-flex items-center">
      {children}
      <span className={`absolute ${posClass} z-[9999] hidden group-hover/tt:block pointer-events-none w-max max-w-[220px] whitespace-normal`}>
        <span className="block bg-ink-600 border border-white/12 text-slate-300 text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-2xl">
          {text}
        </span>
        <span className={`absolute ${arrowClass} border-4 border-transparent`} />
      </span>
    </span>
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
