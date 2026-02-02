import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-wider">DJ EPK</span>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm text-text-secondary hover:text-white transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg transition-colors">Sign up free</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-4 py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          Your DJ Press Kit,<br />Online.
        </h1>
        <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
          Create a professional Electronic Press Kit in minutes. Share your bio, mixes, events, technical rider and booking info — all in one link.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  )
}
