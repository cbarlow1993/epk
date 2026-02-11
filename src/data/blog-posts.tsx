import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

export interface BlogPost {
  title: string
  slug: string
  excerpt: string
  metaDescription: string
  publishedDate: string
  readTime: string
  content: () => ReactNode
}

function BlogCTA() {
  return (
    <div className="mt-16 pt-8 border-t border-border">
      <p className="text-xl font-display font-semibold tracking-tight mb-4 !text-text-primary">
        Or just use <span className="text-accent">myEPK</span> for free.
      </p>
      <p className="text-text-secondary mb-6">
        Skip the hassle. Build your professional press kit in minutes — bio, mixes, events, technical rider, press assets, and booking contact — all in one link.
      </p>
      <Link
        to="/signup"
        className="inline-block px-8 py-3 bg-accent text-white text-sm font-semibold tracking-wider rounded-full hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,85,0,0.25)] transition-all"
      >
        Create Your Free EPK
      </Link>
    </div>
  )
}

export const BLOG_POSTS: BlogPost[] = [
  {
    title: 'How to Make a DJ Press Kit in 2026',
    slug: 'how-to-make-a-dj-press-kit',
    excerpt: 'Everything you need to build a press kit that actually gets you booked — from your bio to your tech rider.',
    metaDescription: 'Learn how to make a DJ press kit that gets you booked. Step-by-step guide covering bio, photos, mixes, technical rider, and booking contact.',
    publishedDate: '2026-01-15',
    readTime: '6 min read',
    content: () => (
      <>
        <p>
          If you're serious about getting booked, you need a press kit. Not a PDF you threw together in Google Docs. Not a folder of random photos on Google Drive. A proper electronic press kit — an EPK — that tells promoters exactly who you are and why they should book you.
        </p>
        <p>
          An EPK is the standard in the music industry. It's how promoters, agents, venues, and festivals evaluate whether you're the right fit. Send a good one and you look professional. Send a bad one — or worse, don't have one at all — and you're making it easy for them to say no.
        </p>
        <p>
          Here's how to build one that works.
        </p>

        <h2>Start With Your Bio</h2>
        <p>
          Your bio is the first thing anyone reads. Keep it short — 150 words max for the summary. Write in third person. Cover four things: who you are, what you play, where you've played, and what makes you different.
        </p>
        <p>
          Bad example: "I've been DJing since I was 15 and I love all kinds of music." That tells a promoter nothing.
        </p>
        <p>
          Better: "Berlin-based DJ and selector specialising in deep house and minimal techno. Resident at Panorama Bar since 2023, with sets at Dekmantel, Sónar, and Fabric. Known for marathon sets that move between dub techno and breakbeat."
        </p>
        <p>
          Concrete details beat vague enthusiasm every time.
        </p>

        <h2>Add Your Best Mixes</h2>
        <p>
          Include 3–5 of your strongest mixes. Not your entire back catalogue. Promoters don't have time to sift through 40 SoundCloud uploads. Pick your best work and make it easy to listen to — embedded players, not download links.
        </p>
        <p>
          If you have mixes on SoundCloud or Mixcloud, embed them directly. If you have tracks on Spotify or Beatport, link those too. The goal is one click to hear your sound.
        </p>

        <h2>Showcase Your Events</h2>
        <p>
          List the venues, festivals, and brands you've worked with. This is social proof. If you've played at recognisable names, make sure they're front and centre. Include logos if you have them — they're more scannable than a text list.
        </p>
        <p>
          Don't have big names yet? That's fine. List what you have. A DJ with 10 local gigs and a clean EPK will get booked over a DJ with 50 gigs and no press kit.
        </p>

        <h2>Include a Technical Rider</h2>
        <p>
          Your tech rider tells the venue what equipment you need. Deck model and quantity, mixer preference, monitoring requirements, and any extras. This saves everyone time — no back-and-forth emails about whether they have CDJ-3000s or a DJM-A9.
        </p>
        <p>
          Keep it realistic. If you can play on anything, say so but list your preference. If you absolutely need specific equipment, be clear about it.
        </p>

        <h2>Press Assets</h2>
        <p>
          Include 3–5 high-resolution photos. At least one portrait, one action shot, and one landscape. These need to be print-quality — promoters will use them for flyers, social media, and websites.
        </p>
        <p>
          If you have a logo, include it in multiple formats (PNG with transparent background, ideally). Make everything downloadable in one click.
        </p>

        <h2>Booking Contact</h2>
        <p>
          Make it obvious how to book you. Name, email, phone number. If you have a manager or agent, list their details. If it's just you, that's perfectly fine — just make the information easy to find.
        </p>
        <p>
          The worst thing you can do is make a promoter hunt for your contact details. They won't. They'll move on to the next DJ.
        </p>

        <h2>Put It All Together</h2>
        <p>
          You can build this yourself with a website builder, a PDF, or a landing page tool. But here's the problem: PDFs go out of date. Websites need maintenance. Google Docs look unprofessional. And none of them give you analytics — you have no idea if anyone actually looked at your press kit.
        </p>
        <p>
          The best approach is a dedicated EPK platform that keeps everything in one place, looks professional on any device, and lets you update it in minutes.
        </p>

        <BlogCTA />
      </>
    ),
  },
  {
    title: 'What to Include in a DJ Press Kit (Complete Checklist)',
    slug: 'what-to-include-in-a-dj-press-kit',
    excerpt: 'The complete checklist of everything your DJ press kit needs — nothing more, nothing less.',
    metaDescription: 'Complete checklist of what to include in a DJ press kit. Bio, photos, mixes, tech rider, press assets, and booking contact — everything promoters need.',
    publishedDate: '2026-01-22',
    readTime: '5 min read',
    content: () => (
      <>
        <p>
          You've decided to build a DJ press kit. Good. But what actually goes in it? Too many DJs either leave out critical information or pad their EPK with irrelevant filler. Here's the complete checklist — everything a promoter needs to make a booking decision, and nothing they don't.
        </p>

        <h2>1. Artist Bio</h2>
        <p>
          A short summary (100–150 words) written in third person. Cover who you are, what genres you play, notable gigs or residencies, and what sets you apart. This is not your life story. It's a pitch.
        </p>
        <p>
          Optionally include a longer bio (300–500 words) for press and publications that need more detail. But the short version does the heavy lifting.
        </p>

        <h2>2. Profile Photo</h2>
        <p>
          One high-quality headshot or press photo. Professional lighting, clean background, decent resolution (at least 2000px wide). This is what appears on flyers, lineups, and social media when you get booked.
        </p>

        <h2>3. Genre Tags and Location</h2>
        <p>
          Promoters filter by genre and geography. If you play deep house and afro house and you're based in Manchester, say so. Make yourself easy to categorise and find.
        </p>

        <h2>4. Mixes and Music</h2>
        <p>
          3–5 of your best mixes or tracks. Embedded players (SoundCloud, Mixcloud, Spotify) are better than download links. Promoters want to press play, not download a file. Label each mix with the genre or vibe so they can pick the most relevant one quickly.
        </p>

        <h2>5. Events and Venues</h2>
        <p>
          A list of where you've played. Venues, festivals, club nights, brands. Include logos where possible — they're visual social proof that registers instantly. Even a handful of recognisable names builds credibility.
        </p>

        <h2>6. Technical Rider</h2>
        <p>
          Your equipment requirements. Minimum: deck model and quantity, mixer preference, monitoring needs. Optional: specific software, controllers, or special requirements. This prevents last-minute surprises at the venue.
        </p>

        <h2>7. Press Assets</h2>
        <p>
          3–5 high-resolution photos in different formats (portrait, landscape, action). A logo if you have one. All downloadable. Promoters will use these for marketing — make it easy for them.
        </p>

        <h2>8. Social Links</h2>
        <p>
          Links to your Instagram, SoundCloud, Spotify, Mixcloud, Resident Advisor — whatever platforms you're active on. Follower counts are optional but can help. These links let promoters verify your presence and reach.
        </p>

        <h2>9. Booking Contact</h2>
        <p>
          Name, email, and optionally phone number. If you have management or an agent, list their details. Make this impossible to miss. A press kit without clear contact info is useless.
        </p>

        <h2>What to Leave Out</h2>
        <p>
          Skip the essay about how you fell in love with music at age 12. Skip the full discography. Skip the low-resolution phone photos. Skip the "DJ since 2015" timeline. Promoters are busy — give them what they need to make a decision and nothing more.
        </p>

        <BlogCTA />
      </>
    ),
  },
  {
    title: 'Free myEPK Template: Stop Sending PDFs',
    slug: 'free-dj-epk-template',
    excerpt: 'PDF press kits are outdated the moment you send them. There\'s a better way.',
    metaDescription: 'Why PDF DJ press kits fail and what to use instead. Free myEPK template that stays up to date, looks professional, and works on any device.',
    publishedDate: '2026-01-29',
    readTime: '4 min read',
    content: () => (
      <>
        <p>
          Search "myEPK template" and you'll find dozens of free PDF and Google Doc templates. They look decent. They have all the right sections. So you fill one in, export it as a PDF, and start emailing it to promoters.
        </p>
        <p>
          Here's the problem: that PDF is already out of date.
        </p>

        <h2>The Problem With PDF Press Kits</h2>
        <p>
          The moment you export a PDF, it's frozen in time. Play a new gig? The PDF doesn't know. Upload a new mix? The PDF doesn't know. Change your booking email? You guessed it.
        </p>
        <p>
          Every time anything changes, you need to update the document, re-export it, and re-send it to everyone who has the old version. Nobody does this. So promoters end up with outdated information, dead links, and old photos.
        </p>
        <p>
          PDFs have other problems too:
        </p>
        <ul>
          <li><strong>No embedded audio.</strong> You can't play a SoundCloud mix inside a PDF. You have to link out, and promoters have to click, open a browser, and hope the link still works.</li>
          <li><strong>No analytics.</strong> You have no idea if anyone opened your press kit, how long they spent on it, or which sections they looked at.</li>
          <li><strong>Fixed layout.</strong> PDFs look fine on a laptop but terrible on a phone. Promoters check things on the go — your press kit needs to work on mobile.</li>
          <li><strong>File size.</strong> Include a few high-res photos and your PDF is 20MB. Good luck getting that through an email filter.</li>
        </ul>

        <h2>Google Docs Aren't Much Better</h2>
        <p>
          Some DJs use Google Docs or Notion pages as press kits. They're easier to update, but they still look unprofessional. A Google Doc with your bio and a few links doesn't say "book me for your festival." It says "I spent 10 minutes on this."
        </p>
        <p>
          Presentation matters. A promoter looking at 50 submissions will pay more attention to the one that looks polished and professional.
        </p>

        <h2>What Actually Works</h2>
        <p>
          A hosted EPK — a dedicated web page for your press kit — solves every problem PDFs create:
        </p>
        <ul>
          <li><strong>Always current.</strong> Update once, everyone sees the latest version.</li>
          <li><strong>Embedded audio.</strong> SoundCloud, Mixcloud, and Spotify players built right in.</li>
          <li><strong>Mobile-friendly.</strong> Responsive design that works on any screen.</li>
          <li><strong>One link.</strong> Share a single URL instead of attaching files to emails.</li>
          <li><strong>Professional.</strong> Custom themes, typography, and layout that match your brand.</li>
        </ul>
        <p>
          You could build one yourself with Squarespace or WordPress, but then you're maintaining a website. You need a solution that's built specifically for DJs and musicians — one that knows what sections an EPK needs and makes it effortless to keep them updated.
        </p>

        <BlogCTA />
      </>
    ),
  },
  {
    title: 'How to Get Booked as a DJ: The Press Kit Angle',
    slug: 'how-to-get-booked-as-a-dj',
    excerpt: 'Getting booked isn\'t just about talent. It\'s about making it easy for promoters to say yes.',
    metaDescription: 'How to get booked as a DJ by having a professional press kit. What promoters look for, how to stand out, and why your EPK is your most important tool.',
    publishedDate: '2026-02-05',
    readTime: '6 min read',
    content: () => (
      <>
        <p>
          Every DJ wants more bookings. The advice you'll find online is usually the same: network, promote yourself on social media, play free gigs to get noticed. That's all true. But there's one thing that almost nobody talks about — and it's the difference between DJs who get booked and DJs who get ignored.
        </p>
        <p>
          Make it easy for promoters to say yes.
        </p>

        <h2>What Promoters Actually Want</h2>
        <p>
          Promoters aren't browsing Instagram looking for DJs to book. They're busy. They're putting together lineups under time pressure. When they evaluate a DJ, they need to answer a few questions fast:
        </p>
        <ul>
          <li>What genre does this DJ play? Will they fit the vibe?</li>
          <li>Are they any good? What do they sound like?</li>
          <li>Have they played anywhere credible?</li>
          <li>What equipment do they need?</li>
          <li>How do I contact them or their agent?</li>
        </ul>
        <p>
          If a promoter can answer all five questions in under two minutes, you're in a strong position. If they have to dig through your Instagram, find your SoundCloud, guess your email from your bio, and ask you about your rider — they'll probably just book someone else.
        </p>

        <h2>Your EPK Is Your Sales Page</h2>
        <p>
          Think of your electronic press kit as a sales page for yourself. It's not a CV. It's not a portfolio. It's a tool designed to get one specific outcome: a booking enquiry.
        </p>
        <p>
          That means every section needs to earn its place. Your bio should be concise and specific. Your mixes should be your best work — not everything you've ever recorded. Your events list should highlight the names that matter most. Your tech rider should save the promoter a conversation.
        </p>
        <p>
          And all of it needs to be accessible in one link.
        </p>

        <h2>The Follow-Up Problem</h2>
        <p>
          Most DJs reach out to promoters via DM or email. That's fine — you have to put yourself out there. But what happens after the initial message? The promoter clicks your link, looks at your press kit, and makes a decision.
        </p>
        <p>
          If your "press kit" is a PDF from six months ago with broken SoundCloud links and photos from 2022, you've wasted the opportunity. If it's a professional, up-to-date EPK with embedded mixes, a clear bio, and a tech rider ready to go — you've made their job easy.
        </p>
        <p>
          Getting booked isn't just about being talented. Plenty of talented DJs never get booked because they make it too hard for promoters to evaluate them. The ones who succeed make the entire process frictionless.
        </p>

        <h2>Stand Out From the Stack</h2>
        <p>
          A promoter for a medium-sized club night might get 20–30 demo submissions a week. Most of them look the same: a SoundCloud link, a couple of sentences, and maybe an Instagram handle. No bio. No rider. No press photos.
        </p>
        <p>
          Now imagine you send a single link to a polished EPK with your bio, best mixes, past events with logos, a tech rider, downloadable press photos, and a clear booking contact. You've just put yourself in the top 10% of submissions — not because you're necessarily a better DJ, but because you took it seriously.
        </p>
        <p>
          Professionalism is a signal. It tells promoters that you'll show up on time, you'll be prepared, and you'll be easy to work with. Your press kit is the first evidence of that.
        </p>

        <h2>One Link. That's It.</h2>
        <p>
          The ultimate goal is to be able to put one link in your email, your Instagram bio, your DMs — and have it say everything a promoter needs to know. No attachments. No "check out my SoundCloud and also here's my rider and oh here are some photos." One link. Done.
        </p>

        <BlogCTA />
      </>
    ),
  },
  {
    title: 'DJ Bio Examples: How to Write One That Gets You Booked',
    slug: 'dj-bio-examples',
    excerpt: 'Your bio is the first thing promoters read. Here\'s how to write one that actually works.',
    metaDescription: 'DJ bio examples and a simple formula for writing one that gets you booked. Common mistakes, what to include, and 3 example bios you can adapt.',
    publishedDate: '2026-02-05',
    readTime: '5 min read',
    content: () => (
      <>
        <p>
          Your bio is the most-read section of your press kit. It's also the section DJs struggle with most. Too long, too vague, too much backstory, not enough substance. A good bio takes five minutes to write once you know the formula.
        </p>

        <h2>Common Mistakes</h2>
        <p>
          Before the formula, here's what to avoid:
        </p>
        <ul>
          <li><strong>The autobiography.</strong> "Born in London in 1995, I first discovered electronic music when my older brother took me to a warehouse party at age 16..." Nobody needs your origin story. Save it for the documentary.</li>
          <li><strong>The genre list.</strong> "Playing everything from deep house to techno to drum and bass to garage to ambient to..." If you play everything, you stand for nothing. Pick 2–3 genres max.</li>
          <li><strong>First person.</strong> "I play deep house and I've been DJing for 8 years." Press kits use third person. It's an industry convention and it makes your bio usable by publications and promoters without editing.</li>
          <li><strong>Vague adjectives.</strong> "An eclectic and passionate DJ with a unique sound." This describes every DJ who has ever lived. Be specific.</li>
        </ul>

        <h2>The Formula</h2>
        <p>
          A good DJ bio answers four questions in under 150 words:
        </p>
        <ol>
          <li><strong>Who are you?</strong> Name, location, what you do.</li>
          <li><strong>What do you play?</strong> Genres, style, vibe — be specific.</li>
          <li><strong>Where have you played?</strong> Venues, festivals, residencies, brands.</li>
          <li><strong>What makes you different?</strong> Your angle, your niche, your reputation.</li>
        </ol>
        <p>
          That's it. Four sentences if you're concise, a short paragraph if you need more room. The point is density — every word should earn its place.
        </p>

        <h2>Example 1: The Established Selector</h2>
        <blockquote>
          <p>
            Maya Chen is a Berlin-based DJ and producer specialising in deep house and minimal techno. A resident at About Blank since 2023, she has played Dekmantel, Sónar Off, and Fabric's Room One. Her sets are known for meticulous track selection and seamless transitions between dub techno, deep house, and breakbeat. She hosts the monthly "Deep Focus" series on Rinse FM.
          </p>
        </blockquote>
        <p>
          Why this works: specific genres, real venues, a residency, a radio show. A promoter knows exactly what they're getting.
        </p>

        <h2>Example 2: The Rising Local</h2>
        <blockquote>
          <p>
            Manchester-based DJ Kilo started making waves in the city's underground scene in 2023 with his high-energy blend of UKG and jungle. A resident at Soup Kitchen's "Bass Therapy" night, he has supported Interplanetary Criminal, Sherelle, and Conducta. When he's not behind the decks, he runs the "Rinse Out" mix series on SoundCloud, which has racked up over 200K plays.
          </p>
        </blockquote>
        <p>
          Why this works: doesn't pretend to be bigger than he is. Local residency, support slots with recognisable names, a concrete metric (200K plays). Honest and credible.
        </p>

        <h2>Example 3: The Specialist</h2>
        <blockquote>
          <p>
            Priya Sharma is one of London's leading selectors in the Afro house and amapiano space. Since 2022, she has held residencies at Phonox and XOYO, and her "Amapiano Brunch" events regularly sell out 500-capacity venues. She has been featured in DJ Mag, Mixmag, and Resident Advisor, and her Boiler Room set has over 1.5M views.
          </p>
        </blockquote>
        <p>
          Why this works: clear niche (Afro house and amapiano), strong social proof (publications, Boiler Room), concrete numbers (500-capacity, 1.5M views).
        </p>

        <h2>Write Yours in 10 Minutes</h2>
        <p>
          Open a blank document. Answer the four questions. Write it in third person. Cut it to 150 words or fewer. Read it out loud — if it sounds like a press release, you're on the right track. If it sounds like a dating profile, start over.
        </p>
        <p>
          Your bio doesn't need to be clever or poetic. It needs to be clear, specific, and useful. A promoter should be able to read it in 30 seconds and know whether you're the right fit for their event.
        </p>

        <BlogCTA />
      </>
    ),
  },
]
