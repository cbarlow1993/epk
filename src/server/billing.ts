import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import Stripe from 'stripe'
import { withAuth } from './utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

export const createCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ profileId: z.string().uuid().optional() }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const targetProfileId = data.profileId || user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, slug, organization_id')
      .eq('id', targetProfileId)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // Verify user has access to this profile
    if (data.profileId && data.profileId !== user.id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single()

      if (!membership || profile.organization_id !== membership.organization_id) {
        return { error: 'Not authorized to manage billing for this profile' }
      }
    }

    let customerId: string | undefined

    // For org profiles, use org's Stripe customer
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', profile.organization_id)
        .single()

      customerId = org?.stripe_customer_id || undefined

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { organization_id: profile.organization_id },
        })
        customerId = customer.id
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', profile.organization_id)
      }
    } else {
      customerId = profile.stripe_customer_id || undefined
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        })
        customerId = customer.id
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE_URL}/dashboard/settings?upgraded=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: { supabase_user_id: user.id, profile_id: targetProfileId },
      subscription_data: {
        metadata: { supabase_user_id: user.id, profile_id: targetProfileId },
      },
    })

    return { url: session.url }
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
