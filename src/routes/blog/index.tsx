import { createFileRoute, Link } from '@tanstack/react-router'
import { BLOG_POSTS } from '~/data/blog-posts'

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: 'Blog | myEPK — Tips for DJs & Artists' },
      { name: 'description', content: 'Guides and tips for DJs: how to make a press kit, what to include, how to get booked, and more.' },
      { property: 'og:title', content: 'Blog | myEPK' },
      { property: 'og:description', content: 'Guides and tips for DJs: how to make a press kit, what to include, how to get booked, and more.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
})

function BlogIndex() {
  return (
    <div className="theme-dark min-h-screen bg-bg text-text-primary font-body">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg tracking-tight flex items-center gap-2">
            myEPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <a href="/#features" className="hidden sm:inline text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">Features</a>
            <a href="/#pricing" className="hidden sm:inline text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">Pricing</a>
            <Link to="/blog" className="hidden sm:inline text-xs font-medium tracking-wider text-accent">Blog</Link>
            <Link to="/login" className="text-xs font-medium tracking-wider text-text-secondary hover:text-text-primary transition-colors">Log in</Link>
            <Link to="/signup" className="text-xs font-semibold tracking-wider bg-accent text-white px-5 py-2 rounded-full hover:brightness-110 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px w-12 bg-accent" />
            <span className="text-xs font-medium tracking-widest text-accent uppercase">Blog</span>
          </div>
          <h1 className="font-display font-bold text-[clamp(2rem,5vw,3.5rem)] tracking-tight leading-none">
            Guides for <span className="text-accent">DJs</span>
          </h1>
          <p className="mt-4 text-text-secondary max-w-[500px]">
            Practical advice on press kits, getting booked, and presenting yourself professionally.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="pb-24">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group bg-surface border border-border rounded-xl p-8 hover:border-accent/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3 text-xs text-text-secondary tracking-wider mb-4">
                  <time dateTime={post.publishedDate}>
                    {new Date(post.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                  <span className="text-border">&middot;</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="font-display font-semibold text-lg tracking-tight mb-3 group-hover:text-accent transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  {post.excerpt}
                </p>
                <span className="text-xs font-semibold tracking-wider text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Read &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] flex items-center justify-between">
          <span className="font-display font-bold text-sm">myEPK <span className="text-accent">&bull;</span></span>
          <span className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} myEPK</span>
        </div>
      </footer>
    </div>
  )
}
