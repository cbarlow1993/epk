/**
 * Seed script: Creates 10 test DJ profiles with full data.
 *
 * Usage:
 *   npx tsx scripts/seed-test-profiles.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config() // load .env

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Test profile data ───────────────────────────────────────────────

const TEST_PASSWORD = 'TestPass123!'

interface TestProfile {
  email: string
  display_name: string
  slug: string
  tagline: string
  short_bio: string
  genres: string[]
  template: string
  accent_color: string
  bg_color: string
  hero_style: string
  bio_layout: string
  music_layout: string
  events_layout: string
  profile_image_url: string
  hero_image_url: string
  bpm_min: number
  bpm_max: number
  tier: string
  published: boolean
  onboarding_completed: boolean
  section_order: string[]
  section_visibility: Record<string, boolean>
  social_links: Array<{ platform: string; url: string; handle: string }>
  mixes: Array<{
    title: string
    url: string
    category: string
    description: string
    platform: string
  }>
  events: Array<{
    name: string
    category: string
    description: string
    event_date: string
    event_date_end?: string
    link_url?: string
    image_url?: string
  }>
  photos: Array<{ image_url: string; caption: string }>
  technical: {
    deck_model: string
    deck_quantity: number
    mixer_model: string
    monitor_type: string
    monitor_quantity: number
    additional_notes: string
  }
  booking_contact: {
    manager_name: string
    email: string
    phone: string
  }
}

const profiles: TestProfile[] = [
  // 1. NOVA PULSE — Techno
  {
    email: 'nova.pulse@testepk.com',
    display_name: 'NOVA PULSE',
    slug: 'nova-pulse',
    tagline: 'Berlin-based techno architect',
    short_bio:
      'Crafting hypnotic techno soundscapes since 2015. Resident at Berghain and regular at Awakenings, Dekmantel, and Time Warp.',
    genres: ['Techno', 'Industrial Techno', 'Hard Techno'],
    template: 'techno',
    accent_color: '#00FF88',
    bg_color: '#0A0A0A',
    hero_style: 'fullbleed',
    bio_layout: 'two-column',
    music_layout: 'featured',
    events_layout: 'timeline',
    profile_image_url: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d1e?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1920&h=1080&fit=crop',
    bpm_min: 130,
    bpm_max: 150,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: true, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/novapulse', handle: '@novapulse' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/novapulse', handle: 'novapulse' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/example1', handle: 'NOVA PULSE' },
      { platform: 'residency', url: 'https://ra.co/dj/novapulse', handle: 'RA Profile' },
    ],
    mixes: [
      {
        title: 'Berghain Closing Set — Feb 2026',
        url: 'https://soundcloud.com/amelielens/exhale-radio-110',
        category: 'Live Sets',
        description: 'A 3-hour closing set recorded live at Berghain, Berlin.',
        platform: 'soundcloud',
      },
      {
        title: 'Dark Matter EP',
        url: 'https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa',
        category: 'Originals',
        description: 'Latest release on Drumcode Records. Four tracks of relentless techno.',
        platform: 'spotify',
      },
      {
        title: 'Awakenings Festival 2025 Set',
        url: 'https://www.youtube.com/watch?v=JwHoFi2jCbA',
        category: 'Live Sets',
        description: 'Main stage set from Awakenings Festival, Amsterdam.',
        platform: 'youtube',
      },
    ],
    events: [
      {
        name: 'Awakenings Festival',
        category: 'Festivals',
        description: 'Main stage appearance at Amsterdam\'s premier techno festival.',
        event_date: '2026-06-27',
        event_date_end: '2026-06-28',
        link_url: 'https://www.awakeningsfestival.nl',
        image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
      },
      {
        name: 'Time Warp',
        category: 'Festivals',
        description: 'Returning to Mannheim for the legendary Time Warp.',
        event_date: '2026-04-05',
        link_url: 'https://www.time-warp.de',
        image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop',
      },
      {
        name: 'Berghain',
        category: 'Residencies',
        description: 'Monthly residency at Berlin\'s most iconic club.',
        event_date: '2026-03-15',
        image_url: 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=600&h=400&fit=crop',
      },
      {
        name: 'Tresor',
        category: 'Club Shows',
        description: 'Globus floor headline set.',
        event_date: '2026-05-10',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d1e?w=800&h=600&fit=crop', caption: 'Studio session, Berlin' },
      { image_url: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop', caption: 'Awakenings 2025' },
      { image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop', caption: 'Main stage DJ booth' },
      { image_url: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&h=600&fit=crop', caption: 'Backstage at Time Warp' },
    ],
    technical: {
      deck_model: 'CDJ-3000',
      deck_quantity: 3,
      mixer_model: 'DJM-A9',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 2,
      additional_notes: 'Requires minimum 2x 12" subwoofers in booth. Please provide USB-C charging at the booth.',
    },
    booking_contact: {
      manager_name: 'Marcus Weber',
      email: 'bookings@novapulse-music.com',
      phone: '+49 30 1234567',
    },
  },

  // 2. SAKURA — Deep House / Melodic
  {
    email: 'sakura.dj@testepk.com',
    display_name: 'Sakura',
    slug: 'sakura-sounds',
    tagline: 'Tokyo to Ibiza — melodic deep house journeys',
    short_bio:
      'Japanese-born, Ibiza-based DJ blending Eastern melodies with deep house grooves. Resident at Pacha and regular at Hï Ibiza.',
    genres: ['Deep House', 'Melodic House', 'Progressive House'],
    template: 'sunset',
    accent_color: '#FF6B9D',
    bg_color: '#1A0A14',
    hero_style: 'fullbleed',
    bio_layout: 'two-column',
    music_layout: 'showcase',
    events_layout: 'carousel',
    profile_image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1920&h=1080&fit=crop',
    bpm_min: 118,
    bpm_max: 128,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: false, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/sakurasounds', handle: '@sakurasounds' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/sakurasounds', handle: 'sakurasounds' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/example2', handle: 'Sakura' },
      { platform: 'mixcloud', url: 'https://www.mixcloud.com/sakurasounds/', handle: 'sakurasounds' },
    ],
    mixes: [
      {
        title: 'Sunset Sessions Vol. 12 — Pacha Ibiza',
        url: 'https://soundcloud.com/keinemusik/keinemusik-radio-show-by-adam-port-031',
        category: 'Mixes',
        description: 'Terrace sunset set recorded at Pacha Ibiza.',
        platform: 'soundcloud',
      },
      {
        title: 'Cherry Blossom (Original Mix)',
        url: 'https://open.spotify.com/track/2FDTHlrBguDzQkp7PVj16Q',
        category: 'Originals',
        description: 'Released on Anjunadeep. A journey through Eastern scales and deep house.',
        platform: 'spotify',
      },
      {
        title: 'Melodic House Journey — Tokyo Sessions',
        url: 'https://www.mixcloud.com/anjunadeep/the-anjunadeep-edition-510/',
        category: 'Mixes',
        description: 'Two-hour deep mix recorded at WOMB Tokyo.',
        platform: 'mixcloud',
      },
    ],
    events: [
      {
        name: 'Pacha Ibiza',
        category: 'Residencies',
        description: 'Weekly summer residency on the iconic terrace.',
        event_date: '2026-06-01',
        event_date_end: '2026-09-30',
        link_url: 'https://www.pacha.com',
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
      },
      {
        name: 'Tomorrowland',
        category: 'Festivals',
        description: 'Anjunadeep stage at Tomorrowland, Belgium.',
        event_date: '2026-07-17',
        event_date_end: '2026-07-19',
        image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
      },
      {
        name: 'WOMB Tokyo',
        category: 'Club Shows',
        description: 'Headline show at Tokyo\'s most renowned club.',
        event_date: '2026-04-12',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop', caption: 'Pacha terrace sunset' },
      { image_url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800&h=600&fit=crop', caption: 'Ibiza sunset vibes' },
      { image_url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop', caption: 'Festival crowd energy' },
    ],
    technical: {
      deck_model: 'CDJ-3000',
      deck_quantity: 2,
      mixer_model: 'Xone:96',
      monitor_type: 'Both',
      monitor_quantity: 2,
      additional_notes: 'Prefers Allen & Heath mixer where possible. Requires stereo booth monitors.',
    },
    booking_contact: {
      manager_name: 'Yuki Tanaka',
      email: 'management@sakurasounds.com',
      phone: '+34 612 345 678',
    },
  },

  // 3. DJ VORTEX — Drum & Bass
  {
    email: 'dj.vortex@testepk.com',
    display_name: 'DJ Vortex',
    slug: 'dj-vortex',
    tagline: 'High-energy drum & bass from London',
    short_bio:
      'South London\'s finest DnB selector. Signed to Hospital Records. Known for mixing liquid, neuro, and jump-up into one explosive set.',
    genres: ['Drum & Bass', 'Liquid DnB', 'Neurofunk'],
    template: 'drum-and-bass',
    accent_color: '#FFD700',
    bg_color: '#0D0D0D',
    hero_style: 'fullbleed',
    bio_layout: 'single-column',
    music_layout: 'grid',
    events_layout: 'grid',
    profile_image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1920&h=1080&fit=crop',
    bpm_min: 170,
    bpm_max: 180,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: true, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/djvortex', handle: '@djvortex' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/djvortex', handle: 'djvortex' },
      { platform: 'twitter', url: 'https://twitter.com/djvortex', handle: '@djvortex' },
      { platform: 'youtube', url: 'https://youtube.com/@djvortex', handle: 'DJ Vortex' },
    ],
    mixes: [
      {
        title: 'Vortex Sessions 001 — Hospital Records Mix',
        url: 'https://soundcloud.com/hospitalrecords/hospital-podcast-500',
        category: 'Mixes',
        description: 'Monthly mix series for Hospital Records featuring the latest DnB.',
        platform: 'soundcloud',
      },
      {
        title: 'Turbulence (ft. MC Dynamite)',
        url: 'https://open.spotify.com/track/7oaEjLP2dTJLJsITbAxTOz',
        category: 'Originals',
        description: 'Lead single from the debut album. Released on Hospital Records.',
        platform: 'spotify',
      },
      {
        title: 'Let It Roll 2025 Full Set',
        url: 'https://www.youtube.com/watch?v=KIhm2eN8LFY',
        category: 'Live Sets',
        description: 'Full 90-minute set from the main stage at Let It Roll, Czech Republic.',
        platform: 'youtube',
      },
    ],
    events: [
      {
        name: 'Let It Roll',
        category: 'Festivals',
        description: 'The world\'s biggest drum & bass festival.',
        event_date: '2026-08-06',
        event_date_end: '2026-08-08',
        link_url: 'https://www.letitroll.eu',
        image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=400&fit=crop',
      },
      {
        name: 'Fabric London',
        category: 'Club Shows',
        description: 'Room 1 headline for FABRICLIVE.',
        event_date: '2026-03-21',
        image_url: 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=600&h=400&fit=crop',
      },
      {
        name: 'Hospitality In The Park',
        category: 'Festivals',
        description: 'Hospital Records\' annual London festival.',
        event_date: '2026-09-12',
        image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
      },
      {
        name: 'XOYO London',
        category: 'Club Shows',
        description: '6-week residency with special guests.',
        event_date: '2026-04-03',
        event_date_end: '2026-05-08',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=600&fit=crop', caption: 'Let It Roll main stage' },
      { image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop', caption: 'Festival energy' },
      { image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop', caption: 'On the decks' },
    ],
    technical: {
      deck_model: 'SC6000',
      deck_quantity: 2,
      mixer_model: 'DJM-900NXS2',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 2,
      additional_notes: 'Must have high SPL monitoring. MC requires separate mic channel with effects send.',
    },
    booking_contact: {
      manager_name: 'James Richards',
      email: 'bookings@djvortex.co.uk',
      phone: '+44 7700 900123',
    },
  },

  // 4. AURA — Trance
  {
    email: 'aura.dj@testepk.com',
    display_name: 'AURA',
    slug: 'aura-music',
    tagline: 'Euphoric trance from Amsterdam',
    short_bio:
      'Dutch trance producer with releases on Armada Music and Anjunabeats. Known for uplifting, emotional sets that take you on a journey.',
    genres: ['Trance', 'Uplifting Trance', 'Progressive Trance'],
    template: 'trance',
    accent_color: '#7B2FFF',
    bg_color: '#0A0020',
    hero_style: 'fullbleed',
    bio_layout: 'two-column',
    music_layout: 'featured',
    events_layout: 'marquee',
    profile_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&h=1080&fit=crop',
    bpm_min: 136,
    bpm_max: 145,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: true, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/auramusic', handle: '@auramusic' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/auramusic', handle: 'auramusic' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/example4', handle: 'AURA' },
      { platform: 'tiktok', url: 'https://tiktok.com/@auramusic', handle: '@auramusic' },
    ],
    mixes: [
      {
        title: 'A State of Trance 1150 — Guest Mix',
        url: 'https://soundcloud.com/astateoftrance/asot-1000',
        category: 'Mixes',
        description: 'Guest mix on Armin van Buuren\'s legendary radio show.',
        platform: 'soundcloud',
      },
      {
        title: 'Ethereal (Original Mix)',
        url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        category: 'Originals',
        description: 'Lead single from the Ethereal EP. Released on Anjunabeats.',
        platform: 'spotify',
      },
    ],
    events: [
      {
        name: 'A State of Trance Festival',
        category: 'Festivals',
        description: 'Main stage at the world\'s biggest trance event.',
        event_date: '2026-02-21',
        link_url: 'https://www.astateoftrance.com',
        image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop',
      },
      {
        name: 'Luminosity Beach Festival',
        category: 'Festivals',
        description: 'Beachside trance at Bloemendaal.',
        event_date: '2026-06-25',
        event_date_end: '2026-06-28',
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
      },
      {
        name: 'Transmission Prague',
        category: 'Festivals',
        description: 'The spectacular trance spectacle at O2 Arena.',
        event_date: '2026-10-24',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop', caption: 'ASOT Festival 2025' },
      { image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop', caption: 'Laser show at Transmission' },
      { image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', caption: 'Luminosity Beach sunset' },
    ],
    technical: {
      deck_model: 'CDJ-3000',
      deck_quantity: 4,
      mixer_model: 'DJM-A9',
      monitor_type: 'Both',
      monitor_quantity: 2,
      additional_notes: 'Requires 4 CDJs for live mashup transitions. External effects unit (RMX-1000) preferred.',
    },
    booking_contact: {
      manager_name: 'Sophie van der Berg',
      email: 'bookings@aura-trance.com',
      phone: '+31 20 1234567',
    },
  },

  // 5. CONCRETE — Underground / Minimal
  {
    email: 'concrete.dj@testepk.com',
    display_name: 'Concrete',
    slug: 'concrete',
    tagline: 'Raw minimal grooves from Detroit',
    short_bio:
      'Detroit-born minimal techno purist. Label head of Concrete Records. Playing underground clubs worldwide since 2010.',
    genres: ['Minimal', 'Micro House', 'Dub Techno'],
    template: 'underground',
    accent_color: '#888888',
    bg_color: '#111111',
    hero_style: 'contained',
    bio_layout: 'single-column',
    music_layout: 'compact',
    events_layout: 'timeline',
    profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
    bpm_min: 120,
    bpm_max: 130,
    tier: 'free',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: false, technical: true, contact: true },
    social_links: [
      { platform: 'soundcloud', url: 'https://soundcloud.com/concrete-detroit', handle: 'concrete-detroit' },
      { platform: 'residency', url: 'https://ra.co/dj/concrete', handle: 'RA Profile' },
      { platform: 'website', url: 'https://concrete-records.com', handle: 'concrete-records.com' },
    ],
    mixes: [
      {
        title: 'RA.892 — Resident Advisor Podcast',
        url: 'https://soundcloud.com/resident-advisor/ra500',
        category: 'Mixes',
        description: 'Recorded live at Movement Detroit afterparty.',
        platform: 'soundcloud',
      },
      {
        title: 'Subterranean EP',
        url: 'https://soundcloud.com/concrete-detroit-ep',
        category: 'Originals',
        description: 'Self-released on Concrete Records. Four tracks of deep minimal.',
        platform: 'soundcloud',
      },
    ],
    events: [
      {
        name: 'Movement Detroit',
        category: 'Festivals',
        description: 'Main stage at Detroit\'s electronic music festival.',
        event_date: '2026-05-23',
        event_date_end: '2026-05-25',
        image_url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&h=400&fit=crop',
      },
      {
        name: 'Robert Johnson',
        category: 'Club Shows',
        description: 'Headline at the legendary Offenbach club.',
        event_date: '2026-04-18',
      },
      {
        name: 'Concrete Records Showcase',
        category: 'Label Nights',
        description: 'Annual label showcase at TV Lounge, Detroit.',
        event_date: '2026-03-28',
      },
    ],
    photos: [],
    technical: {
      deck_model: 'Turntables',
      deck_quantity: 2,
      mixer_model: 'Model 1',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 1,
      additional_notes: 'Vinyl-only sets. Please provide Technics 1210 MK7 turntables. No sync needed.',
    },
    booking_contact: {
      manager_name: 'Self-managed',
      email: 'book@concrete-records.com',
      phone: '+1 313 555 0199',
    },
  },

  // 6. ZEPHYR — House / Disco
  {
    email: 'zephyr.dj@testepk.com',
    display_name: 'Zephyr',
    slug: 'zephyr',
    tagline: 'Feel-good house & disco all night long',
    short_bio:
      'NYC-based house and disco DJ bringing the golden era of dance music to modern dancefloors. Founder of Velvet Groove parties.',
    genres: ['House', 'Disco', 'Funky House', 'Nu-Disco'],
    template: 'tropicalia',
    accent_color: '#FF4500',
    bg_color: '#1A0F00',
    hero_style: 'fullbleed',
    bio_layout: 'two-column',
    music_layout: 'grid',
    events_layout: 'carousel',
    profile_image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop',
    bpm_min: 115,
    bpm_max: 128,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: false, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/zephyr.nyc', handle: '@zephyr.nyc' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/zephyr-nyc', handle: 'zephyr-nyc' },
      { platform: 'mixcloud', url: 'https://www.mixcloud.com/zephyr/', handle: 'zephyr' },
      { platform: 'tiktok', url: 'https://tiktok.com/@zephyr.nyc', handle: '@zephyr.nyc' },
    ],
    mixes: [
      {
        title: 'Velvet Groove Vol. 8 — Rooftop Sessions',
        url: 'https://www.mixcloud.com/GlitterboyGoldstein/glitterboy-on-the-floor-009/',
        category: 'Mixes',
        description: 'Sunset rooftop set mixing disco edits with modern house.',
        platform: 'mixcloud',
      },
      {
        title: 'Midnight Fever (Original Mix)',
        url: 'https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb',
        category: 'Originals',
        description: 'Funky house anthem released on Defected Records.',
        platform: 'spotify',
      },
      {
        title: 'Boiler Room NYC Set',
        url: 'https://www.youtube.com/watch?v=ZCS7ppnLqVE',
        category: 'Live Sets',
        description: 'Full Boiler Room set from the Defected x Boiler Room NYC show.',
        platform: 'youtube',
      },
    ],
    events: [
      {
        name: 'Defected Croatia',
        category: 'Festivals',
        description: 'Beach stage set at the Garden Resort, Tisno.',
        event_date: '2026-08-13',
        event_date_end: '2026-08-17',
        link_url: 'https://defectedcroatia.com',
        image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop',
      },
      {
        name: 'Velvet Groove NYC',
        category: 'Residencies',
        description: 'Monthly party at Nowadays, Brooklyn.',
        event_date: '2026-03-07',
        image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop',
      },
      {
        name: 'Glitterbox Ibiza',
        category: 'Festivals',
        description: 'Guest appearance at Hï Ibiza for Glitterbox.',
        event_date: '2026-07-11',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop', caption: 'Velvet Groove party' },
      { image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop', caption: 'Festival crowd' },
      { image_url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop', caption: 'Brooklyn rooftop set' },
      { image_url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop', caption: 'Defected Croatia beach' },
    ],
    technical: {
      deck_model: 'CDJ-3000',
      deck_quantity: 2,
      mixer_model: 'DJM-V10',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 2,
      additional_notes: 'Happy with any professional setup. Prefers 6-channel mixer for layering.',
    },
    booking_contact: {
      manager_name: 'Rachel Kim',
      email: 'rachel@velvetgroove.nyc',
      phone: '+1 212 555 0234',
    },
  },

  // 7. HEXX — Industrial / Dark Techno
  {
    email: 'hexx.dj@testepk.com',
    display_name: 'HEXX',
    slug: 'hexx',
    tagline: 'Industrial rituals for the underground',
    short_bio:
      'Dark industrial techno from the depths of Manchester. Co-founder of Hex Code collective. Sets described as "sonic exorcisms."',
    genres: ['Industrial Techno', 'Dark Techno', 'EBM'],
    template: 'midnight',
    accent_color: '#FF0000',
    bg_color: '#000000',
    hero_style: 'minimal',
    bio_layout: 'single-column',
    music_layout: 'compact',
    events_layout: 'grid',
    profile_image_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&h=1080&fit=crop',
    bpm_min: 140,
    bpm_max: 160,
    tier: 'free',
    published: true,
    onboarding_completed: true,
    section_order: ['music', 'events', 'bio', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: false, technical: true, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/hexx_mcr', handle: '@hexx_mcr' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/hexx-mcr', handle: 'hexx-mcr' },
      { platform: 'website', url: 'https://hexcode-collective.com', handle: 'hexcode-collective.com' },
    ],
    mixes: [
      {
        title: 'Hex Ritual 013 — Warehouse Live Recording',
        url: 'https://soundcloud.com/peaborson/perc-trax-podcast-100',
        category: 'Live Sets',
        description: 'Recorded at 4am during Hex Code warehouse event, Manchester.',
        platform: 'soundcloud',
      },
      {
        title: 'Searing (Original Mix)',
        url: 'https://soundcloud.com/hexx-searing',
        category: 'Originals',
        description: 'Released on Perc Trax. Distorted kicks and screaming synths.',
        platform: 'soundcloud',
      },
    ],
    events: [
      {
        name: 'Hex Code Warehouse',
        category: 'Residencies',
        description: 'Bi-monthly warehouse events in Manchester.',
        event_date: '2026-03-14',
        image_url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=400&fit=crop',
      },
      {
        name: 'Katharsis Berlin',
        category: 'Club Shows',
        description: 'Headline at Griessmuehle successor venue.',
        event_date: '2026-05-02',
      },
      {
        name: 'Nachtdigital',
        category: 'Festivals',
        description: 'Late-night slot at Germany\'s hidden gem festival.',
        event_date: '2026-07-03',
        event_date_end: '2026-07-05',
      },
    ],
    photos: [],
    technical: {
      deck_model: 'CDJ-2000NXS2',
      deck_quantity: 2,
      mixer_model: 'DJM-900NXS2',
      monitor_type: 'In-Ear Monitors',
      monitor_quantity: 1,
      additional_notes: 'Requires a dark booth with minimal lighting. No LED screens facing the DJ. Fog machine essential.',
    },
    booking_contact: {
      manager_name: 'Self-managed',
      email: 'hexx@hexcode-collective.com',
      phone: '+44 7700 900456',
    },
  },

  // 8. SOLARIS — Afro House / Organic
  {
    email: 'solaris.dj@testepk.com',
    display_name: 'Solaris',
    slug: 'solaris-music',
    tagline: 'Afro house rhythms meet organic electronica',
    short_bio:
      'Cape Town-born, Barcelona-based. Blending African rhythms with organic house textures. Releases on Madorasindahouse and MoBlack Records.',
    genres: ['Afro House', 'Organic House', 'Afro Tech'],
    template: 'ember',
    accent_color: '#E8A838',
    bg_color: '#1A1208',
    hero_style: 'fullbleed',
    bio_layout: 'two-column',
    music_layout: 'showcase',
    events_layout: 'marquee',
    profile_image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1920&h=1080&fit=crop',
    bpm_min: 120,
    bpm_max: 128,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: false, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/solarismusic', handle: '@solarismusic' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/solarismusic', handle: 'solarismusic' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/example8', handle: 'Solaris' },
      { platform: 'facebook', url: 'https://facebook.com/solarismusic', handle: 'Solaris Music' },
    ],
    mixes: [
      {
        title: 'Sunrise Ritual — Scorpios Mykonos',
        url: 'https://soundcloud.com/keinemusik/keinemusik-radio-show-rampa-118',
        category: 'Live Sets',
        description: 'Sunrise set recorded at Scorpios beach club, Mykonos.',
        platform: 'soundcloud',
      },
      {
        title: 'Ubuntu (Original Mix)',
        url: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
        category: 'Originals',
        description: 'Featuring live percussion from Cape Town session musicians.',
        platform: 'spotify',
      },
      {
        title: 'Cercle — Solaris at Table Mountain',
        url: 'https://www.youtube.com/watch?v=7CO07dTk3K4',
        category: 'Live Sets',
        description: 'Full Cercle livestream set from Table Mountain, Cape Town.',
        platform: 'youtube',
      },
    ],
    events: [
      {
        name: 'Scorpios Mykonos',
        category: 'Residencies',
        description: 'Summer residency at the iconic Scorpios beach club.',
        event_date: '2026-06-15',
        event_date_end: '2026-09-15',
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
      },
      {
        name: 'DGTL Amsterdam',
        category: 'Festivals',
        description: 'Afro house stage at the sustainable festival.',
        event_date: '2026-04-10',
        event_date_end: '2026-04-11',
        image_url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600&fit=crop',
      },
      {
        name: 'Cape Town Electronic Music Festival',
        category: 'Festivals',
        description: 'Headline appearance at South Africa\'s biggest electronic festival.',
        event_date: '2026-02-07',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600&fit=crop', caption: 'Sunrise set at Scorpios' },
      { image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', caption: 'Mykonos beach session' },
      { image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop', caption: 'DGTL Festival stage' },
    ],
    technical: {
      deck_model: 'CDJ-3000',
      deck_quantity: 2,
      mixer_model: 'Xone:96',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 2,
      additional_notes: 'Prefers Allen & Heath mixer. May bring live percussion — needs additional mic channel.',
    },
    booking_contact: {
      manager_name: 'Thabo Mokoena',
      email: 'management@solarismusic.co',
      phone: '+27 21 555 0789',
    },
  },

  // 9. PIXEL — Y2K / Breaks / Electro
  {
    email: 'pixel.dj@testepk.com',
    display_name: 'PIXEL',
    slug: 'pixel-dj',
    tagline: 'Retro-futuristic breaks & electro',
    short_bio:
      'LA-based breaks and electro selector channeling Y2K energy. Known for wild mashups, samples from the 2000s, and high-energy party sets.',
    genres: ['Breaks', 'Electro', 'Breakbeat', 'Electro House'],
    template: 'y2k',
    accent_color: '#00FFFF',
    bg_color: '#0A001A',
    hero_style: 'contained',
    bio_layout: 'two-column',
    music_layout: 'grid',
    events_layout: 'grid',
    profile_image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1920&h=1080&fit=crop',
    bpm_min: 125,
    bpm_max: 140,
    tier: 'free',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'events', 'photos', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: false, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/pixel.dj', handle: '@pixel.dj' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/pixel-la', handle: 'pixel-la' },
      { platform: 'tiktok', url: 'https://tiktok.com/@pixel.dj', handle: '@pixel.dj' },
      { platform: 'youtube', url: 'https://youtube.com/@pixeldj', handle: 'PIXEL' },
    ],
    mixes: [
      {
        title: 'Y2K Reboot — 2000s Mashup Mix',
        url: 'https://soundcloud.com/a-trak/solid-steel-mix',
        category: 'Mixes',
        description: 'Nostalgic mix blending 2000s hits with modern breaks.',
        platform: 'soundcloud',
      },
      {
        title: 'Digital Playground (Original Mix)',
        url: 'https://open.spotify.com/track/3KkXRkHbMCARz0aVfEt68P',
        category: 'Originals',
        description: 'Electro banger released on Ed Banger Records.',
        platform: 'spotify',
      },
    ],
    events: [
      {
        name: 'Hard Summer',
        category: 'Festivals',
        description: 'Performing on the HARDER stage.',
        event_date: '2026-08-01',
        event_date_end: '2026-08-02',
        image_url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=600&h=400&fit=crop',
      },
      {
        name: 'Sound Nightclub LA',
        category: 'Club Shows',
        description: 'Monthly first-Friday residency.',
        event_date: '2026-04-03',
        image_url: 'https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=600&h=400&fit=crop',
      },
      {
        name: 'Coachella',
        category: 'Festivals',
        description: 'Yuma Tent appearance.',
        event_date: '2026-04-10',
        event_date_end: '2026-04-12',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&h=600&fit=crop', caption: 'Neon nights at Sound' },
      { image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop', caption: 'Festival lights' },
      { image_url: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&h=600&fit=crop', caption: 'Behind the decks' },
    ],
    technical: {
      deck_model: 'XDJ-XZ',
      deck_quantity: 2,
      mixer_model: 'DJM-900NXS2',
      monitor_type: 'Booth Monitors',
      monitor_quantity: 2,
      additional_notes: 'Brings own controller as backup. Needs table space for Ableton Push controller.',
    },
    booking_contact: {
      manager_name: 'Tyler Santos',
      email: 'bookings@pixel-dj.com',
      phone: '+1 323 555 0567',
    },
  },

  // 10. NEBULA — Ambient / Downtempo
  {
    email: 'nebula.dj@testepk.com',
    display_name: 'Nebula',
    slug: 'nebula',
    tagline: 'Ambient explorations & downtempo soundscapes',
    short_bio:
      'Icelandic ambient producer and sound designer. Releases on Erased Tapes and own label Cosmic Drift. Creates immersive, cinematic experiences.',
    genres: ['Ambient', 'Downtempo', 'Electronica', 'Experimental'],
    template: 'arctic',
    accent_color: '#4A9FFF',
    bg_color: '#0A0F1A',
    hero_style: 'fullbleed',
    bio_layout: 'single-column',
    music_layout: 'featured',
    events_layout: 'timeline',
    profile_image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    hero_image_url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1920&h=1080&fit=crop',
    bpm_min: 60,
    bpm_max: 100,
    tier: 'pro',
    published: true,
    onboarding_completed: true,
    section_order: ['bio', 'music', 'photos', 'events', 'technical', 'contact'],
    section_visibility: { bio: true, music: true, events: true, photos: true, technical: true, contact: true },
    social_links: [
      { platform: 'instagram', url: 'https://instagram.com/nebula.ambient', handle: '@nebula.ambient' },
      { platform: 'soundcloud', url: 'https://soundcloud.com/nebula-ambient', handle: 'nebula-ambient' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/example10', handle: 'Nebula' },
      { platform: 'website', url: 'https://nebula-music.is', handle: 'nebula-music.is' },
    ],
    mixes: [
      {
        title: 'Northern Lights — Live at Harpa Concert Hall',
        url: 'https://soundcloud.com/olafurarnalds/particles-dn-demo',
        category: 'Live Sets',
        description: 'Immersive live performance with surround-sound projection.',
        platform: 'soundcloud',
      },
      {
        title: 'Cosmos (Album)',
        url: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
        category: 'Originals',
        description: 'Full-length album released on Erased Tapes Records.',
        platform: 'spotify',
      },
      {
        title: 'Cosmic Drift Radio 022',
        url: 'https://www.mixcloud.com/cosmicradio/cosmic-drift-022/',
        category: 'Mixes',
        description: 'Monthly ambient radio show exploring deep listening and sound art.',
        platform: 'mixcloud',
      },
    ],
    events: [
      {
        name: 'Sónar Festival',
        category: 'Festivals',
        description: 'SónarComplex stage — live audiovisual set.',
        event_date: '2026-06-18',
        event_date_end: '2026-06-20',
        link_url: 'https://sonar.es',
        image_url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&h=400&fit=crop',
      },
      {
        name: 'Iceland Airwaves',
        category: 'Festivals',
        description: 'Headline performance at Reykjavik\'s iconic music festival.',
        event_date: '2026-11-04',
        event_date_end: '2026-11-07',
      },
      {
        name: 'Ambient Church NYC',
        category: 'Club Shows',
        description: 'Immersive sound bath at the historic Angel Orensanz Center.',
        event_date: '2026-05-16',
        image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop',
      },
    ],
    photos: [
      { image_url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&h=600&fit=crop', caption: 'Northern Lights visual set' },
      { image_url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop', caption: 'Studio in Reykjavik' },
      { image_url: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&h=600&fit=crop', caption: 'Live at Sónar' },
      { image_url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600&fit=crop', caption: 'Icelandic landscape inspiration' },
    ],
    technical: {
      deck_model: 'Other',
      deck_quantity: 1,
      mixer_model: 'Other',
      monitor_type: 'In-Ear Monitors',
      monitor_quantity: 1,
      additional_notes:
        'Live Ableton set with hardware synths. Requires: 4x DI boxes, 1x stereo pair outputs, MIDI clock sync, and a table (min 2m wide). No CDJs needed.',
    },
    booking_contact: {
      manager_name: 'Björk Sigurdsson',
      email: 'management@nebula-music.is',
      phone: '+354 555 1234',
    },
  },
]

// ─── Seed logic ──────────────────────────────────────────────────────

async function seedProfile(p: TestProfile) {
  console.log(`\n→ Creating ${p.display_name} (${p.slug})...`)

  // 1. Create auth user (trigger auto-creates profile + technical_rider + booking_contact)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: p.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: p.display_name },
  })

  if (authError) {
    // If user already exists, fetch them instead
    if (authError.message?.includes('already been registered')) {
      console.log(`  User ${p.email} already exists, fetching...`)
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existingUser = listData?.users?.find((u) => u.email === p.email)
      if (!existingUser) {
        console.error(`  Could not find existing user ${p.email}`)
        return null
      }
      return await updateProfileData(existingUser.id, p)
    }
    console.error(`  Auth error: ${authError.message}`)
    return null
  }

  const userId = authData.user!.id
  console.log(`  Auth user created: ${userId}`)

  // Small delay to let the trigger fire
  await new Promise((r) => setTimeout(r, 500))

  return await updateProfileData(userId, p)
}

async function updateProfileData(userId: string, p: TestProfile) {
  // 2. Update profile with full data
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      slug: p.slug,
      display_name: p.display_name,
      tagline: p.tagline,
      short_bio: p.short_bio,
      genres: p.genres,
      template: p.template,
      accent_color: p.accent_color,
      bg_color: p.bg_color,
      hero_style: p.hero_style,
      bio_layout: p.bio_layout,
      music_layout: p.music_layout,
      events_layout: p.events_layout,
      profile_image_url: p.profile_image_url,
      hero_image_url: p.hero_image_url,
      bpm_min: p.bpm_min,
      bpm_max: p.bpm_max,
      tier: p.tier,
      published: p.published,
      onboarding_completed: p.onboarding_completed,
      section_order: p.section_order,
      section_visibility: p.section_visibility,
    })
    .eq('id', userId)

  if (profileError) {
    console.error(`  Profile update error: ${profileError.message}`)
    return null
  }
  console.log('  Profile updated')

  // 3. Social links
  if (p.social_links.length > 0) {
    // Delete existing first
    await supabase.from('social_links').delete().eq('profile_id', userId)
    const { error } = await supabase.from('social_links').insert(
      p.social_links.map((s, i) => ({
        profile_id: userId,
        platform: s.platform,
        url: s.url,
        handle: s.handle,
        sort_order: i,
      })),
    )
    if (error) console.error(`  Social links error: ${error.message}`)
    else console.log(`  ${p.social_links.length} social links added`)
  }

  // 4. Mixes
  if (p.mixes.length > 0) {
    await supabase.from('mixes').delete().eq('profile_id', userId)
    const { error } = await supabase.from('mixes').insert(
      p.mixes.map((m, i) => ({
        profile_id: userId,
        title: m.title,
        url: m.url,
        category: m.category,
        description: m.description,
        platform: m.platform,
        sort_order: i,
      })),
    )
    if (error) console.error(`  Mixes error: ${error.message}`)
    else console.log(`  ${p.mixes.length} mixes added`)
  }

  // 5. Events
  if (p.events.length > 0) {
    await supabase.from('events').delete().eq('profile_id', userId)
    const { error } = await supabase.from('events').insert(
      p.events.map((e, i) => ({
        profile_id: userId,
        name: e.name,
        category: e.category,
        description: e.description,
        event_date: e.event_date,
        event_date_end: e.event_date_end || null,
        link_url: e.link_url || null,
        image_url: e.image_url || null,
        sort_order: i,
      })),
    )
    if (error) console.error(`  Events error: ${error.message}`)
    else console.log(`  ${p.events.length} events added`)
  }

  // 6. Photos
  if (p.photos.length > 0) {
    await supabase.from('photos').delete().eq('profile_id', userId)
    const { error } = await supabase.from('photos').insert(
      p.photos.map((ph, i) => ({
        profile_id: userId,
        image_url: ph.image_url,
        caption: ph.caption,
        sort_order: i,
      })),
    )
    if (error) console.error(`  Photos error: ${error.message}`)
    else console.log(`  ${p.photos.length} photos added`)
  }

  // 7. Technical rider
  const { error: techError } = await supabase
    .from('technical_rider')
    .update({
      deck_model: p.technical.deck_model,
      deck_quantity: p.technical.deck_quantity,
      mixer_model: p.technical.mixer_model,
      monitor_type: p.technical.monitor_type,
      monitor_quantity: p.technical.monitor_quantity,
      additional_notes: p.technical.additional_notes,
    })
    .eq('profile_id', userId)

  if (techError) console.error(`  Technical rider error: ${techError.message}`)
  else console.log('  Technical rider updated')

  // 8. Booking contact
  const { error: contactError } = await supabase
    .from('booking_contact')
    .update({
      manager_name: p.booking_contact.manager_name,
      email: p.booking_contact.email,
      phone: p.booking_contact.phone,
    })
    .eq('profile_id', userId)

  if (contactError) console.error(`  Booking contact error: ${contactError.message}`)
  else console.log('  Booking contact updated')

  return p.slug
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding 10 test DJ profiles ===')
  console.log(`Supabase: ${supabaseUrl}`)
  console.log(`Password for all accounts: ${TEST_PASSWORD}\n`)

  const slugs: string[] = []

  for (const profile of profiles) {
    const slug = await seedProfile(profile)
    if (slug) slugs.push(slug)
  }

  console.log('\n\n=== SEED COMPLETE ===\n')
  console.log('Public EPK URLs:')
  for (const slug of slugs) {
    console.log(`  https://myepk.bio/${slug}`)
  }
  console.log(`\nAll accounts use password: ${TEST_PASSWORD}`)
  console.log('\nTest login emails:')
  for (const p of profiles) {
    console.log(`  ${p.email}`)
  }
}

main().catch(console.error)
