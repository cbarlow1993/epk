import { useState } from 'react'

export function TechnicalRider() {
  const [open, setOpen] = useState<'preferred' | 'alternative' | null>('preferred')

  return (
    <section id="technical" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-4">Technical</h2>
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-12">Rider</h3>

        <div className="bg-dark-card backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <p className="text-sm uppercase tracking-widest font-bold text-accent">DJ Equipment Information</p>
          </div>

          {/* Preferred Setup */}
          <button
            onClick={() => setOpen(open === 'preferred' ? null : 'preferred')}
            className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm uppercase tracking-widest font-bold">Preferred Setup</span>
            <svg
              className={`w-5 h-5 transition-transform ${open === 'preferred' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === 'preferred' && (
            <div className="px-6 py-4 text-text-secondary text-sm leading-relaxed space-y-3 border-b border-white/5">
              <p>3 x CDJ-3000 (or CDJ-3000x) and 1x Pioneer DJM-A9 mixer (or DJM-900 NXS2). ALL CDJs &amp; Mixer to be LINKED via Ethernet Cable.</p>
              <p>1 x microphone connected to and controlled from the mixer. If only 2 CDJs are available that will suffice.</p>
              <p>2 x high powered monitor speakers positioned on the left and right of the DJ and with the volume controlled from the mixer.</p>
            </div>
          )}

          {/* Alternative Setup */}
          <button
            onClick={() => setOpen(open === 'alternative' ? null : 'alternative')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="text-sm uppercase tracking-widest font-bold">Alternative Setup</span>
            <svg
              className={`w-5 h-5 transition-transform ${open === 'alternative' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === 'alternative' && (
            <div className="px-6 py-4 text-text-secondary text-sm leading-relaxed space-y-3">
              <p>1x all in one Pioneer/AlphaTheta XDJ-AZ, XDJ-RX3, XDJ-XZ or XDJ-RR (or similar Pioneer/AlphaTheta models accessible with USB).</p>
              <p>1 x microphone connected to and controlled from the mixer.</p>
              <p>2 x high powered monitor speakers positioned on the left and right of the DJ and with the volume controlled from the mixer.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
