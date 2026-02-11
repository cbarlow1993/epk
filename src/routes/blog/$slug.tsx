import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { BLOG_POSTS } from '~/data/blog-posts'

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPost,
  notFoundComponent: () => (
    <div className="theme-dark min-h-screen bg-bg font-body flex flex-col items-center justify-center px-8 text-center">
      <h1 className="font-display font-bold text-4xl tracking-tight text-text-primary mb-4">Post not found</h1>
      <p className="text-text-secondary mb-8">The blog post you're looking for doesn't exist.</p>
      <Link to="/blog" className="text-xs font-semibold tracking-wider text-accent hover:underline">
        &larr; Back to blog
      </Link>
    </div>
  ),
  head: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug)
    if (!post) return { meta: [{ title: 'Post Not Found | myEPK' }] }
    return {
      meta: [
        { title: `${post.title} | myEPK` },
        { name: 'description', content: post.metaDescription },
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.metaDescription },
        { property: 'og:type', content: 'article' },
        { property: 'article:published_time', content: post.publishedDate },
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
    <div className="theme-dark min-h-screen bg-bg text-text-primary font-body">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg tracking-tight flex items-center gap-2">
            myEPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/blog" className="text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">
              &larr; All Posts
            </Link>
            <Link to="/signup" className="text-xs font-semibold tracking-wider bg-accent text-white px-5 py-2 rounded-full hover:brightness-110 transition-all">
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
            <div className="flex items-center gap-3 text-xs text-text-secondary tracking-wider mb-4">
              <time dateTime={post.publishedDate}>
                {new Date(post.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
              <span>&middot;</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="font-display font-bold text-[clamp(2rem,5vw,3rem)] tracking-tight leading-[1.1]">
              {post.title}
            </h1>
          </header>

          {/* Content */}
          <div className="max-w-none
            [&>p]:text-text-secondary [&>p]:leading-relaxed [&>p]:mb-6
            [&>h2]:font-display [&>h2]:font-semibold [&>h2]:text-xl [&>h2]:tracking-tight [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:text-text-primary
            [&>ul]:text-text-secondary [&>ul]:leading-relaxed [&>ul]:mb-6 [&>ul]:pl-6 [&>ul]:list-disc
            [&>ol]:text-text-secondary [&>ol]:leading-relaxed [&>ol]:mb-6 [&>ol]:pl-6 [&>ol]:list-decimal
            [&>ul>li]:mb-2 [&>ol>li]:mb-2
            [&>ul>li>strong]:text-text-primary [&>ol>li>strong]:text-text-primary
            [&>blockquote]:border-l-4 [&>blockquote]:border-accent [&>blockquote]:pl-6 [&>blockquote]:py-3 [&>blockquote]:my-8 [&>blockquote]:bg-surface [&>blockquote]:rounded-r-lg
            [&>blockquote>p]:text-text-primary [&>blockquote>p]:italic [&>blockquote>p]:text-base [&>blockquote>p]:leading-relaxed [&>blockquote>p]:mb-0
          ">
            <Content />
          </div>
        </div>
      </article>

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
