export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="w-12 h-0.5 bg-accent mb-8" />
      <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight mb-12">
        {children}
      </h2>
    </>
  )
}
