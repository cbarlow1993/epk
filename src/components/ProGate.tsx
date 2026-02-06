interface ProGateProps {
  isPro: boolean
  children: React.ReactNode
  feature?: string
}

export function ProGate({ isPro, children, feature }: ProGateProps) {
  if (isPro) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-text-primary/10">
            <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-text-primary">
            {feature ? `Unlock ${feature}` : 'Pro Feature'}
          </p>
          <a
            href="/dashboard/settings"
            className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-accent hover:underline"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  )
}
