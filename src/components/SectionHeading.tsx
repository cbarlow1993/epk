export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="w-12 h-[3px] bg-accent mb-8" />
      <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tighter uppercase mb-12">
        {children}
      </h2>
    </>
  )
}
