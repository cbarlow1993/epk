export function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background placeholder - replace with actual hero image */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-dark-bg" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-transparent to-dark-bg/60" />

      <div className="relative z-10 text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
          ISSY SMITH
        </h1>
        <p className="text-lg md:text-xl tracking-[0.3em] text-text-secondary uppercase mb-8">
          Presskit / EPK
        </p>
        <div className="flex items-center justify-center gap-6">
          <a
            href="#"
            aria-label="SoundCloud"
            className="w-10 h-10 rounded-full border border-text-secondary/30 flex items-center justify-center hover:border-accent transition-colors"
          >
            <SoundCloudIcon />
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="w-10 h-10 rounded-full border border-text-secondary/30 flex items-center justify-center hover:border-accent transition-colors"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>
    </section>
  )
}

function SoundCloudIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.055.045.094.107.094.063 0 .09-.045.09-.094l.199-1.308-.192-1.332c0-.057-.029-.094-.093-.094zm1.83-1.229c-.063 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.059-.104-.12-.104zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.787.21 2.61c.014.075.074.135.149.135.075 0 .135-.06.135-.135l.224-2.61-.209-2.787c0-.075-.075-.135-.165-.135zm.96-.315c-.09 0-.165.075-.165.165l-.176 3.063.176 2.633c0 .09.075.164.165.164.089 0 .164-.074.164-.164l.194-2.633-.21-3.063c-.015-.09-.074-.165-.149-.165z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
