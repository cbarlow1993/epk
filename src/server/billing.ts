import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import Stripe from 'stripe'
import { withAuth } from './utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

export const createCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({}).parse(data ?? {}))
  .handler(async () => {
    const { supabase, user } = await withAuth()

    console.log('[billing] BASE_URL:', JSON.stringify(BASE_URL))

    if (!process.env.STRIPE_SECRET_KEY) return { error: 'Stripe is not configured' }
    if (!process.env.STRIPE_PRO_PRICE_ID) return { error: 'Stripe price is not configured' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    let customerId: string | undefined = profile.stripe_customer_id || undefined

    try {
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        })
        customerId = customer.id
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
        success_url: `${BASE_URL}/dashboard/settings?upgraded=true`,
        cancel_url: `${BASE_URL}/dashboard/settings`,
        metadata: { supabase_user_id: user.id, profile_id: user.id },
        subscription_data: {
          metadata: { supabase_user_id: user.id, profile_id: user.id },
        },
      })

      return { url: session.url }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown billing error'
      console.error('[billing] Checkout error:', message)
      return { error: 'Unable to start checkout. Please try again later.' }
    }
  })

export const createPortalSession = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  if (!profile?.stripe_customer_id) return { error: 'No billing account' }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard/settings`,
  })

  return { url: session.url }
})

export const getOrgBillingOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) return { error: 'Not authorized' }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, slug, tier')
    .eq('organization_id', membership.organization_id)
    .order('display_name')

  const proCount = profiles?.filter((p: { tier: string }) => p.tier === 'pro').length || 0
  const freeCount = profiles?.filter((p: { tier: string }) => p.tier === 'free').length || 0

  return {
    profiles: profiles || [],
    proCount,
    freeCount,
    monthlyTotal: proCount * 9,
  }
})
