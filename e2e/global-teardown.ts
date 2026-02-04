import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { deleteTestUser } from './helpers/supabase-admin'
import { TEST_USER, TEST_SIGNUP_USER } from './helpers/test-data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default async function globalTeardown() {
  await deleteTestUser(TEST_USER.email)
  // Also clean up signup test user in case test failed before its afterAll
  await deleteTestUser(TEST_SIGNUP_USER.email)
}
