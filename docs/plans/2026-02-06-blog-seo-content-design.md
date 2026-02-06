# Blog SEO Content — Design

## Goal

Add a blog section to the DJ EPK platform targeting low-competition, high-intent keywords that DJs search for. Each post funnels readers toward signing up. Blog appears on the landing page and as standalone pages.

## Routes & Structure

### New files

- `src/data/blog-posts.ts` — Array of post objects (title, slug, excerpt, meta description, content as JSX, published date, read time)
- `src/routes/blog.tsx` — Layout wrapper (nav + footer, no sidebar)
- `src/routes/blog/index.tsx` — Blog listing page (all posts as cards)
- `src/routes/blog/$slug.tsx` — Individual post page with SEO meta tags

### Modified files

- `src/routes/index.tsx` — Add "From the Blog" section between Pricing and CTA, add "Blog" nav link

## Blog Posts (5 total)

1. **"How to Make a DJ Press Kit in 2025"** (~800 words)
   - Keywords: "how to make a DJ press kit", "DJ press kit"
   - Step-by-step guide to creating an EPK manually, then CTA

2. **"What to Include in a DJ Press Kit (Complete Checklist)"** (~700 words)
   - Keywords: "what to include in a DJ press kit", "DJ EPK checklist"
   - Scannable checklist format, each item with short explanation

3. **"Free DJ EPK Template: Stop Sending PDFs"** (~600 words)
   - Keywords: "DJ EPK template", "free DJ press kit template"
   - Problems with PDF templates, why hosted EPKs win

4. **"How to Get Booked as a DJ: The Press Kit Angle"** (~800 words)
   - Keywords: "how to get booked as a DJ", "DJ booking tips"
   - What promoters look for, role of a professional EPK

5. **"DJ Bio Examples: How to Write One That Gets You Booked"** (~600 words)
   - Keywords: "DJ bio examples", "how to write a DJ bio"
   - Common mistakes, simple formula, example bios

Each post ends with: "Or just use DJ EPK for free." linked to /signup.

## Visual Design

### Landing page "From the Blog" section
- Section heading matching existing style (Features/Pricing)
- 3 cards in a row (stack on mobile)
- Each card: title, 1-2 line excerpt, "Read →" link
- Scroll-reveal animation matching feature cards
- "View all posts →" link below grid

### Blog index (`/blog`)
- Dark background matching landing page
- Cards for all 5 posts: title, excerpt, read time, date
- Simple grid layout

### Individual post (`/blog/$slug`)
- Minimal header: logo → home, "Back to blog" link
- Large H1, publish date, read time
- Body: ~65ch max-width, comfortable spacing
- H2 subheadings for scannability
- Closing CTA styled as standout block with signup link
- Landing page footer

### SEO per post
- Unique `<title>` — e.g. "How to Make a DJ Press Kit in 2025 | DJ EPK"
- Unique `<meta name="description">`
- OG tags reusing existing OG image

## Non-goals
- No images within blog posts (text only for now)
- No comments or social sharing
- No markdown parsing (content is JSX in data file)
- No CMS / database storage
