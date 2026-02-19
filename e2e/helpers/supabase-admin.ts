import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  }
  return createClient(url, key)
}

export async function createTestUser(email: string, password: string, displayName: string) {
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Failed to create test user: ${error.message}`)
  return data.user
}

export async function deleteTestUser(email: string) {
  const admin = getAdminClient()

  // Find user by email
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return // Already cleaned up

  // Delete child rows (cascade from profile handles most, but be explicit)
  const tables = ['social_links', 'mixes', 'events', 'files', 'technical_rider', 'booking_contact']
  for (const table of tables) {
    await admin.from(table).delete().eq('profile_id', user.id)
  }

  // Delete profile
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete auth user (this also cascades profiles due to FK, but we already cleaned up)
  await admin.auth.admin.deleteUser(user.id)
}

export async function confirmTestUserEmail(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found for email confirmation`)
  await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
}

export async function getTestProfileData(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles').select('display_name, tagline, published, genres').eq('id', user.id).single()
  return data
}

export async function resetTestProfile(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)

  await admin.from('profiles').update({
    display_name: 'Test Playwright DJ',
    tagline: '',
    genres: [],
    published: false,
  }).eq('id', user.id)
}

// --- Profile-specific resets ---

export async function resetTestProfileBio(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    bio: null,
    bio_layout: 'two-column',
    profile_image_url: null,
  }).eq('id', user.id)
}

export async function resetTestProfileHero(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    hero_style: 'fullbleed',
    tagline: '',
    hero_image_url: null,
    hero_video_url: null,
  }).eq('id', user.id)
}

export async function getTestProfileHeroData(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('hero_style, tagline, hero_image_url, hero_video_url, bio, bio_layout, profile_image_url')
    .eq('id', user.id).single()
  return data
}

export async function publishTestProfile(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ published: true }).eq('id', user.id)
}

export async function getTestProfileSlug(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles').select('slug').eq('id', user.id).single()
  return data?.slug as string
}

export async function completeOnboarding(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
}

export async function resetOnboardingStatus(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ onboarding_completed: false }).eq('id', user.id)
}

// --- Theme ---

export async function resetTestTheme(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    accent_color: '#6366f1',
    bg_color: '#0f0f23',
    template: null,
    animate_sections: true,
  }).eq('id', user.id)
}

export async function getTestThemeData(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('accent_color, bg_color, template, animate_sections')
    .eq('id', user.id).single()
  return data
}

// --- Mixes ---

export async function deleteTestMixes(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('mixes').delete().eq('profile_id', user.id)
}

export async function getTestMixes(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('mixes')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Events ---

export async function deleteTestEvents(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('events').delete().eq('profile_id', user.id)
}

export async function getTestEvents(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('events')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Photos ---

export async function deleteTestPhotos(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('photos').delete().eq('profile_id', user.id)
}

export async function getTestPhotos(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('photos')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Booking Contact ---

export async function resetTestBookingContact(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('booking_contact').delete().eq('profile_id', user.id)
}

export async function ensureTestBookingContact(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('booking_contact').select('id').eq('profile_id', user.id).maybeSingle()
  if (data) return
  await admin.from('booking_contact').insert({
    profile_id: user.id,
    manager_name: '',
    email: '',
    phone: '',
    address: '',
  })
}

export async function getTestBookingContact(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('booking_contact')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  return data
}

// --- Technical Rider ---

export async function resetTestTechnicalRider(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('technical_rider').delete().eq('profile_id', user.id)
}

export async function getTestTechnicalRider(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('technical_rider')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  return data
}

// --- Files & Folders ---

export async function deleteTestFiles(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('files').delete().eq('profile_id', user.id)
}

export async function deleteTestFolders(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('folders').delete().eq('profile_id', user.id)
}

// --- Integrations ---

export async function resetTestIntegrations(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  // Integrations are stored in the `integrations` table, not on profiles
  await admin.from('integrations').delete().eq('profile_id', user.id)
}

export async function getTestIntegrations(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('integrations')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')
  return (data as Array<{ type: string; enabled: boolean; config: Record<string, string> }>) || []
}

// --- Social Links ---

export async function deleteTestSocialLinks(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('social_links').delete().eq('profile_id', user.id)
}

export async function getTestSocialLinks(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('social_links')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Full profile data (extended) ---

export async function getTestProfileFull(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}

// --- Reset all flow test data ---

export async function resetAllFlowTestData(email: string) {
  await deleteTestMixes(email)
  await deleteTestEvents(email)
  await deleteTestPhotos(email)
  await deleteTestFiles(email)
  await deleteTestFolders(email)
  await deleteTestSocialLinks(email)
  await resetTestBookingContact(email).catch(() => {})
  await resetTestTechnicalRider(email).catch(() => {})
  await resetTestIntegrations(email)

  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return

  await admin.from('profiles').update({
    display_name: 'Test Playwright DJ',
    slug: 'test-playwright-dj',
    tagline: '',
    genres: [],
    published: false,
    bio: null,
    bio_layout: 'two-column',
    hero_style: 'fullbleed',
    hero_image_url: null,
    hero_video_url: null,
    profile_image_url: null,
    accent_color: '#6366f1',
    bg_color: '#0f0f23',
    template: null,
    animate_sections: true,
    onboarding_completed: true,
  }).eq('id', user.id)

  // Ensure a technical rider row exists (updateTechnicalRider does UPDATE, not UPSERT)
  const { data: existingRider } = await admin.from('technical_rider').select('id').eq('profile_id', user.id).maybeSingle()
  if (!existingRider) {
    await admin.from('technical_rider').insert({ profile_id: user.id })
  }
}
