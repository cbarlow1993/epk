import type React from 'react'

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

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  soundcloud: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.308c.014.055.044.094.107.094.06 0 .09-.045.09-.094l.199-1.308-.192-1.332c0-.057-.03-.094-.093-.094zM1.83 11.824c-.063 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.059-.104-.12-.104zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.787.21 2.61c.014.075.074.135.149.135.074 0 .134-.06.134-.135l.225-2.61-.21-2.787c0-.075-.074-.135-.165-.135zm.96-.315c-.09 0-.165.075-.165.165l-.176 3.063.176 2.633c0 .09.075.164.165.164.089 0 .164-.074.164-.164l.194-2.633-.21-3.063c-.015-.09-.074-.165-.149-.165zm.973-.104c-.104 0-.194.09-.194.194l-.158 3.166.158 2.58c0 .105.09.194.194.194.104 0 .193-.09.193-.194l.18-2.58-.18-3.166c0-.105-.09-.194-.193-.194zm.973-.09c-.12 0-.209.09-.209.209l-.143 3.259.143 2.52c0 .119.09.209.209.209.12 0 .209-.09.209-.209l.164-2.52-.164-3.259c0-.12-.09-.209-.209-.209zm.99-.074c-.135 0-.239.105-.239.24l-.129 3.33.129 2.459c0 .135.104.24.239.24.135 0 .24-.105.24-.24l.149-2.459-.15-3.33c0-.135-.104-.24-.239-.24zm.99-.06c-.15 0-.27.12-.27.27l-.112 3.39.112 2.401c0 .15.12.27.27.27.15 0 .27-.12.27-.27l.128-2.401-.128-3.39c0-.15-.12-.27-.27-.27zm1.02-.074c-.165 0-.3.135-.3.3l-.097 3.449.097 2.342c0 .165.135.3.3.3.165 0 .3-.135.3-.3l.11-2.342-.11-3.45c0-.164-.135-.299-.3-.299zm1.021-.06c-.18 0-.33.15-.33.33l-.082 3.505.082 2.281c0 .18.15.33.33.33.18 0 .33-.15.33-.33l.097-2.282-.097-3.504c0-.18-.15-.33-.33-.33zm1.875-.81c-.195 0-.375.03-.555.09-.18 0-.33.165-.33.345l-.06 4.245.06 2.22c0 .18.15.345.33.345H21.33c1.47 0 2.67-1.29 2.67-2.865 0-1.575-1.2-2.865-2.67-2.865-.375 0-.72.075-1.05.225C19.86 7.11 17.505 4.965 14.64 4.965c-.6 0-1.17.105-1.68.33z" />
    </svg>
  ),
  tiktok: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
}

function SocialLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 text-text-secondary hover:text-white transition-colors"
    >
      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
        {SOCIAL_ICONS[icon]}
      </div>
      <span className="text-sm">{label}</span>
    </a>
  )
}
