export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="w-12 h-[3px] bg-accent mb-8" />
      <h2
        className="tracking-tighter uppercase mb-12"
        style={{
          fontFamily: 'var(--theme-heading-font)',
          fontSize: 'var(--theme-heading-size)',
          fontWeight: 'var(--theme-heading-weight)',
          color: 'var(--theme-heading-color)',
        }}
      >
        {children}
      </h2>
    </>
  )
}
