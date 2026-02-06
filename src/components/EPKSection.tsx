import { FadeIn } from './FadeIn'
import { SectionHeading } from './SectionHeading'

interface EPKSectionProps {
  id: string
  heading: React.ReactNode
  maxWidth?: 'max-w-4xl' | 'max-w-6xl'
  children: React.ReactNode
  animate?: boolean
}

export function EPKSection({ id, heading, maxWidth = 'max-w-6xl', children, animate = true }: EPKSectionProps) {
  return (
    <FadeIn enabled={animate}>
      <section id={id} className="py-20 px-4">
        <div className={`${maxWidth} mx-auto`}>
          <SectionHeading>{heading}</SectionHeading>
          {children}
        </div>
      </section>
    </FadeIn>
  )
}
