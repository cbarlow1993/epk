import { useState } from 'react'

interface AccordionSection {
  id: string
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}

interface AccordionProps {
  sections: AccordionSection[]
  defaultOpen?: string
}

export function Accordion({ sections, defaultOpen }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen || null)

  return (
    <div className="divide-y divide-border">
      {sections.map((section) => {
        const isOpen = openId === section.id
        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between py-3 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                {section.title}
              </span>
              <div className="flex items-center gap-2">
                {section.badge}
                <svg
                  className={`h-4 w-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-[2000px] pb-4 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {section.children}
            </div>
          </div>
        )
      })}
    </div>
  )
}
