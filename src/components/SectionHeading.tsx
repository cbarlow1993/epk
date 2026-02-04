export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
      <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
        {children}
      </h2>
    </>
  )
}
