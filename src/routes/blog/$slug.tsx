import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { BLOG_POSTS } from '~/data/blog-posts'

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPost,
  head: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug)
    if (!post) return { meta: [{ title: 'Post Not Found | DJ EPK' }] }
    return {
      meta: [
        { title: `${post.title} | DJ EPK` },
        { name: 'description', content: post.metaDescription },
        { name: 'og:title', content: post.title },
        { name: 'og:description', content: post.metaDescription },
        { name: 'og:type', content: 'article' },
      ],
    }
  },
})

function BlogPost() {
  const { slug } = Route.useParams()
  const post = BLOG_POSTS.find((p) => p.slug === slug)

  if (!post) {
    throw notFound()
  }

  const Content = post.content

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2">
            DJ EPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/blog" className="text-xs font-medium uppercase tracking-wider hover:text-accent transition-colors">
              &larr; All Posts
            </Link>
            <Link to="/signup" className="text-xs font-semibold uppercase tracking-wider bg-text-primary text-white px-5 py-2 hover:bg-accent transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="pt-32 pb-24">
        <div className="max-w-[700px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 text-xs text-text-secondary uppercase tracking-wider mb-4">
              <time>
                {new Date(post.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
              <span>&middot;</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="font-display font-extrabold text-[clamp(2rem,5vw,3.5rem)] tracking-tighter leading-[1.05]">
              {post.title}
            </h1>
          </header>

          {/* Content */}
          <div className="prose prose-lg max-w-none
            [&>p]:text-text-secondary [&>p]:leading-relaxed [&>p]:mb-6
            [&>h2]:font-display [&>h2]:font-bold [&>h2]:text-2xl [&>h2]:tracking-tight [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:text-text-primary
            [&>ul]:text-text-secondary [&>ul]:leading-relaxed [&>ul]:mb-6 [&>ul]:pl-6 [&>ul]:list-disc
            [&>ol]:text-text-secondary [&>ol]:leading-relaxed [&>ol]:mb-6 [&>ol]:pl-6 [&>ol]:list-decimal
            [&>ul>li]:mb-2 [&>ol>li]:mb-2
            [&>blockquote]:border-l-4 [&>blockquote]:border-accent [&>blockquote]:pl-6 [&>blockquote]:py-2 [&>blockquote]:my-8 [&>blockquote]:bg-gray-50
            [&>blockquote>p]:text-text-primary [&>blockquote>p]:italic [&>blockquote>p]:text-base [&>blockquote>p]:leading-relaxed [&>blockquote>p]:mb-0
          ">
            <Content />
          </div>
        </div>
      </article>

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
