import { useInView } from '~/hooks/useInView'
import type { ReactNode } from 'react'

export function FadeIn({ children, className = '', enabled = true }: { children: ReactNode; className?: string; enabled?: boolean }) {
  const { ref, inView } = useInView()

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 motion-reduce:transition-none ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 motion-reduce:opacity-100 motion-reduce:translate-y-0'} ${className}`}
    >
      {children}
    </div>
  )
}
