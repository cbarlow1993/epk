import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
)

async function testLogin() {
  const email = 'nova.pulse@testepk.com'
  const password = 'TestPass123!'

  console.log(`Attempting login: ${email} / ${password}`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login FAILED:', error.message)
    console.error('Status:', error.status)

    // Check user exists via admin
    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: users } = await admin.auth.admin.listUsers()
    const user = users?.users?.find((u) => u.email === email)
    if (user) {
      console.log('\nUser EXISTS in auth:')
      console.log('  id:', user.id)
      console.log('  email:', user.email)
      console.log('  email_confirmed_at:', user.email_confirmed_at)
      console.log('  created_at:', user.created_at)
      console.log('  identities:', JSON.stringify(user.identities?.map(i => i.provider)))
    } else {
      console.log('\nUser NOT FOUND in auth')
    }
  } else {
    console.log('Login SUCCESS')
    console.log('  user id:', data.user?.id)
    console.log('  email:', data.user?.email)
  }
}

testLogin()
