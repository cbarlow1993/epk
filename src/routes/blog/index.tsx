import { createFileRoute, Link } from '@tanstack/react-router'
import { BLOG_POSTS } from '~/data/blog-posts'

export const Route = createFileRoute('/blog/')({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: 'Blog | DJ EPK — Tips for DJs & Artists' },
      { name: 'description', content: 'Guides and tips for DJs: how to make a press kit, what to include, how to get booked, and more.' },
      { property: 'og:title', content: 'Blog | DJ EPK' },
      { property: 'og:description', content: 'Guides and tips for DJs: how to make a press kit, what to include, how to get booked, and more.' },
      { property: 'og:type', content: 'website' },
    ],
  }),
})

function BlogIndex() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2">
            DJ EPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/blog" className="text-xs font-medium uppercase tracking-wider text-accent">Blog</Link>
            <Link to="/login" className="text-xs font-medium uppercase tracking-wider hover:text-accent transition-colors">Log in</Link>
            <Link to="/signup" className="text-xs font-semibold uppercase tracking-wider bg-text-primary text-white px-5 py-2 hover:bg-accent transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-baseline gap-8">
            <span className="font-display font-bold text-sm tracking-wider text-text-secondary">Blog</span>
            <h1 className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] tracking-tighter uppercase leading-none">
              Guides for <span className="text-accent">DJs</span>
            </h1>
          </div>
          <p className="mt-4 text-text-secondary max-w-[500px]">
            Practical advice on press kits, getting booked, and presenting yourself professionally.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="bg-bg p-8 group hover:bg-gray-50 transition-colors"
              >
                <time dateTime={post.publishedDate} className="text-xs text-text-secondary uppercase tracking-wider">
                  {new Date(post.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
                <span className="text-xs text-text-secondary ml-3">{post.readTime}</span>
                <h2 className="font-display font-bold text-xl tracking-tight mt-3 mb-3 group-hover:text-accent transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {post.excerpt}
                </p>
                <span className="inline-block mt-4 text-xs font-semibold uppercase tracking-wider text-accent">
                  Read &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-text-primary py-6">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] flex items-center justify-between">
          <span className="font-display font-bold text-sm">DJ EPK <span className="text-accent">&#9679;</span></span>
          <span className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} DJ EPK</span>
        </div>
      </footer>
    </div>
  )
}
