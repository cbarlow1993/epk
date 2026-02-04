import { useInView } from '~/hooks/useInView'
import type { ReactNode } from 'react'

export function FadeIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  )
}
