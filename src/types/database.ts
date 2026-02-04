import type { MIX_CATEGORIES } from '~/schemas/mix'
import type { SOCIAL_PLATFORMS } from '~/schemas/social-link'
import type { ASSET_TYPES } from '~/schemas/press-asset'

/** Row types representing what Supabase returns from select('*') queries */

export interface ProfileRow {
  id: string
  display_name: string | null
  tagline: string | null
  slug: string | null
  genres: string[] | null
  profile_image_url: string | null
  hero_image_url: string | null
  published: boolean
  accent_color: string | null
  bg_color: string | null
  font_family: string | null
  bio_left: string | null
  bio_right: string | null
  tier: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  custom_domain: string | null
  custom_css: string | null
  bpm_min: number | null
  bpm_max: number | null
  created_at: string
}

export interface MixRow {
  id: string
  profile_id: string
  title: string
  url: string
  category: (typeof MIX_CATEGORIES)[number]
  thumbnail_url: string | null
  sort_order: number
  created_at: string
  platform: string | null
  embed_html: string | null
}

export interface EventRow {
  id: string
  profile_id: string
  name: string
  image_url: string | null
  link_url: string | null
  sort_order: number
  created_at: string
}

export interface SocialLinkRow {
  id: string
  profile_id: string
  platform: (typeof SOCIAL_PLATFORMS)[number]
  url: string
  handle: string
  sort_order: number
  created_at: string
}

export interface PressAssetRow {
  id: string
  profile_id: string
  title: string
  file_url: string
  type: (typeof ASSET_TYPES)[number]
  sort_order: number
  created_at: string
}

export interface BookingContactRow {
  id: string
  profile_id: string
  manager_name: string | null
  email: string | null
  phone: string | null
  address: string | null
}

export interface TechnicalRiderRow {
  id: string
  profile_id: string
  preferred_setup: string | null
  alternative_setup: string | null
}

export interface BookingRequestRow {
  id: string
  profile_id: string
  name: string
  email: string
  event_name: string | null
  event_date: string | null
  venue_location: string | null
  budget_range: string | null
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
}

export interface FolderRow {
  id: string
  profile_id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface FileRow {
  id: string
  profile_id: string
  folder_id: string | null
  name: string
  file_url: string
  file_type: string
  file_size: number
  mime_type: string | null
  created_at: string
  tags?: string[]
}

export interface PublicProfileData {
  profile: Omit<ProfileRow, 'id' | 'stripe_customer_id' | 'stripe_subscription_id' | 'custom_css'>
  socialLinks: SocialLinkRow[]
  mixes: MixRow[]
  events: EventRow[]
  technicalRider: TechnicalRiderRow | null
  bookingContact: BookingContactRow | null
  pressAssets: PressAssetRow[]
}
