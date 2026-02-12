import { useRef } from 'react'

export function EqBars({ className = '', barCount = 48 }: { className?: string; barCount?: number }) {
  const bars = useRef(
    Array.from({ length: barCount }, () => ({
      height: 8 + Math.random() * 44,
      delay: Math.random() * 1.6,
      duration: 1.0 + Math.random() * 0.8,
    }))
  )

  return (
    <div className={`flex items-end justify-center gap-[2px] ${className}`}>
      {bars.current.map((bar, i) => (
        <div
          key={i}
          className="w-[3px] rounded-t-sm bg-accent/30"
          style={{
            height: '4px',
            animation: `eq-bar ${bar.duration}s ease-in-out infinite`,
            animationDelay: `${bar.delay}s`,
            '--eq-height': `${bar.height}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
