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
  const tables = ['social_links', 'mixes', 'events', 'press_assets', 'technical_rider', 'booking_contact']
  for (const table of tables) {
    await admin.from(table).delete().eq('profile_id', user.id)
  }

  // Delete profile
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete auth user (this also cascades profiles due to FK, but we already cleaned up)
  await admin.auth.admin.deleteUser(user.id)
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
