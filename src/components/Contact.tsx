export function Contact() {
  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-4">Booking</h2>
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-12">Contact</h3>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm uppercase tracking-widest font-bold mb-2">Name</label>
              <input
                id="name"
                type="text"
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm uppercase tracking-widest font-bold mb-2">Email</label>
              <input
                id="email"
                type="email"
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm uppercase tracking-widest font-bold mb-2">Message</label>
              <textarea
                id="message"
                rows={5}
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none"
                placeholder="Your message..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
            >
              Send Enquiry
            </button>
          </form>

          {/* Social Links & Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-widest font-bold text-accent mb-4">Management &amp; Booking</p>
              <p className="text-text-secondary">Helen</p>
            </div>

            <div className="space-y-3">
              <SocialLink icon="instagram" label="@issysmithdj_official" href="#" />
              <SocialLink icon="soundcloud" label="issysmithdj_official" href="#" />
              <SocialLink icon="tiktok" label="issy.smitheee" href="#" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SocialLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 text-text-secondary hover:text-white transition-colors"
    >
      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
        <span className="text-xs">{icon[0].toUpperCase()}</span>
      </div>
      <span className="text-sm">{label}</span>
    </a>
  )
}
