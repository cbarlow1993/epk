export const FLOW_USER = {
  email: 'chrisjbarlow1+test@gmail.com',
  password: 'Test1234!',
  displayName: 'DJ FlowTest',
}

export const PROFILE_DATA = {
  displayName: 'DJ FlowTest',
  tagline: 'Underground house & techno',
  slug: 'dj-flowtest',
  genres: ['House', 'Techno', 'Drum & Bass'] as const,
  bpmMin: '120',
  bpmMax: '140',
}

export const SOCIAL_LINKS = {
  soundcloud: 'https://soundcloud.com/djflowtest',
  instagram: 'https://instagram.com/djflowtest',
  spotify: 'https://open.spotify.com/artist/djflowtest',
}

export const BIO_DATA = {
  layout: 'single-column' as const,
  text: 'FlowTest bio paragraph for E2E testing. This DJ has been rocking dancefloors worldwide.',
}

export const HERO_DATA = {
  style: 'contained' as const,
  tagline: 'Feel the bass drop',
  mediaType: 'image' as const,
}

export const MIXES = [
  { title: 'Summer Vibes 2025', url: 'https://example.com/mixes/summer-vibes', category: 'DJ Sets' },
  { title: 'Warehouse Sessions', url: 'https://example.com/mixes/warehouse', category: 'DJ Sets' },
  { title: 'Original - Midnight', url: 'https://example.com/mixes/midnight', category: 'Originals' },
] as const

export const EVENTS = [
  { name: 'Fabric London', category: 'Residencies', linkUrl: 'https://fabriclondon.com' },
  { name: 'Berghain Guest', category: 'Guest Spots', linkUrl: 'https://berghain.berlin' },
  { name: 'Sonar Festival', category: 'Festivals', linkUrl: 'https://sonar.es' },
] as const

export const PHOTOS = [
  { fixture: 'test-photo-1.jpg', caption: 'Live at Fabric' },
  { fixture: 'test-photo-2.jpg', caption: 'Studio session' },
] as const

export const CONTACT_DATA = {
  managerName: 'Jane Manager',
  email: 'bookings@djflowtest.com',
  phone: '+44 7700 900000',
  address: '123 Music Lane, London, UK',
}

export const THEME_DATA = {
  accentColor: '#ff6600',
  bgColor: '#1a1a2e',
  template: 'Dark',
  animateSections: true,
}

export const TECHNICAL_DATA = {
  deckModel: 'CDJ-3000',
  deckQuantity: '2',
  mixerModel: 'DJM-V10',
  monitorType: 'Booth Monitors',
  monitorQuantity: '2',
  notes: 'Prefer booth monitors at ear level',
}

export const INTEGRATION_DATA = {
  googleAnalytics: { measurementId: 'G-TEST12345' },
}

/** Values changed during flow-15 edit phase */
export const EDITS = {
  displayName: 'DJ FlowTest Updated',
  tagline: 'Deep house & melodic techno',
  heroTagline: 'Drop the beat',
  heroStyle: 'fullbleed' as const,
  bioLayout: 'two-column' as const,
  accentColor: '#00ff88',
  bgColor: '#0d0d1a',
  newMix: { title: 'Winter Mix 2025', url: 'https://example.com/mixes/winter-mix', category: 'DJ Sets' },
  editedMixTitle: 'Summer Vibes 2025 (Remastered)',
  editedEventName: 'Fabric London 2025',
  contactPhone: '+44 7700 900002',
}
