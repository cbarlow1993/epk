import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env var.')
  console.error('')
  console.error('Find it in your Supabase Dashboard:')
  console.error('  Project Settings > Database > Connection string > URI')
  console.error('')
  console.error('Add it to your .env file:')
  console.error('  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { ssl: 'require' })
const schema = readFileSync(resolve(__dirname, '../supabase/schema.sql'), 'utf-8')

async function runMigration() {
  console.log('Running migration...')
  console.log('')

  try {
    await sql.unsafe(schema)
    console.log('Migration completed successfully!')
    console.log('')
    console.log('Tables created:')
    console.log('  - profiles')
    console.log('  - social_links')
    console.log('  - mixes')
    console.log('  - events')
    console.log('  - technical_rider')
    console.log('  - booking_contact')
    console.log('  - files (includes press assets)')
    console.log('  - reserved_slugs')
    console.log('')
    console.log('Also created: RLS policies, triggers, helper functions')
    console.log('')
    console.log('Next: Create an "uploads" bucket in Supabase Dashboard > Storage')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
