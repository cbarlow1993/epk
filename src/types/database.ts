import type { MIX_CATEGORIES } from '~/schemas/mix'
import type { SOCIAL_PLATFORMS } from '~/schemas/social-link'

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
  short_bio: string | null
  bio: Record<string, unknown> | null
  tier: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  custom_domain: string | null
  custom_css: string | null
  bpm_min: number | null
  bpm_max: number | null
  favicon_url: string | null
  hide_platform_branding: boolean
  meta_description: string | null
  template: string
  section_order: string[] | null
  section_visibility: Record<string, boolean> | null
  hero_style: 'fullbleed' | 'contained' | 'minimal' | null
  bio_layout: 'two-column' | 'single-column' | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  twitter_card_type: 'summary' | 'summary_large_image' | null
  organization_id: string | null
  managed_by: string | null
  created_at: string
}

export interface DomainOrderRow {
  id: string
  profile_id: string
  domain: string
  status: 'pending_payment' | 'purchasing' | 'active' | 'renewal_failed' | 'failed' | 'cancelled'
  vercel_purchase_price: number
  vercel_renewal_price: number
  service_fee: number
  years: number
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
  vercel_order_id: string | null
  contact_info: Record<string, string> | null
  purchased_at: string | null
  expires_at: string | null
  last_renewed_at: string | null
  created_at: string
  updated_at: string
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
  preferred_setup: Record<string, unknown> | null
  alternative_setup: Record<string, unknown> | null
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
  is_press_asset: boolean
  press_title: string | null
  press_type: 'photo' | 'video' | 'logo' | null
  sort_order: number
  source: string
  created_at: string
  tags?: string[]
}

export type OrgRole = 'owner' | 'admin' | 'manager' | 'artist'

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website_url: string | null
  billing_email: string | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMemberRow {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  assigned_profiles: string[]
  created_at: string
}

export interface OrganizationInviteRow {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface PublicProfileData {
  profile: Omit<ProfileRow, 'id' | 'stripe_customer_id' | 'stripe_subscription_id' | 'custom_css'>
  socialLinks: SocialLinkRow[]
  mixes: MixRow[]
  events: EventRow[]
  technicalRider: TechnicalRiderRow | null
  bookingContact: BookingContactRow | null
  pressAssets: FileRow[]
}

export interface IntegrationRow {
  id: string
  profile_id: string
  type: string
  enabled: boolean
  config: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}
