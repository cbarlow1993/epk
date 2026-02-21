import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from './utils'
import { domainSearchSchema, domainPurchaseSchema, domainRegex } from '~/schemas/domain-order'
import Stripe from 'stripe'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

const VERCEL_API = 'https://api.vercel.com'
const SERVICE_FEE = 5

function vercelHeaders() {
  return { Authorization: `Bearer ${VERCEL_TOKEN}` }
}

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
}

const SEARCH_TLDS = ['.com', '.io', '.dj', '.music', '.live', '.events']

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

export const addCustomDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253).regex(domainRegex, 'Invalid domain format') }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required for custom domains' }

    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: data.domain }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.error?.message || 'Failed to add domain' }
    }

    const responseData = await res.json()
    await supabase.from('profiles').update({ custom_domain: data.domain }).eq('id', user.id)
    return {
      success: true,
      domain: data.domain,
      verified: responseData.verified || false,
      verification: responseData.verification || [],
    }
  })

export const removeCustomDomain = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: profile } = await supabase.from('profiles').select('custom_domain').eq('id', user.id).single()
  if (!profile?.custom_domain) return { error: 'No custom domain configured' }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${profile.custom_domain}${teamParam}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  if (!res.ok) {
    return { error: 'Failed to remove domain from hosting provider' }
  }

  await supabase.from('profiles').update({ custom_domain: null }).eq('id', user.id)
  return { success: true }
})

export const checkDomainStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253) }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_domain')
      .eq('id', user.id)
      .single()

    if (profile?.custom_domain !== data.domain) return { configured: false, verified: false, verification: [] }

    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''

    // Trigger Vercel to re-check domain verification
    await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}/verify${teamParam}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    // Fetch current domain status
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    if (!res.ok) return { configured: false, verified: false, verification: [] }

    const domainData = await res.json()
    return {
      configured: true,
      verified: domainData.verified || false,
      verification: domainData.verification || [],
    }
  })

export const searchDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => domainSearchSchema.parse(data))
  .handler(async ({ data }) => {
    await withAuth()

    const candidates = data.domain.includes('.')
      ? [data.domain]
      : SEARCH_TLDS.map((tld) => `${data.domain}${tld}`)

    const results = await Promise.allSettled(
      candidates.map(async (domain) => {
        const [availRes, priceRes] = await Promise.all([
          fetch(`${VERCEL_API}/v1/registrar/domains/${domain}/availability${teamQuery()}`, {
            headers: vercelHeaders(),
          }),
          fetch(`${VERCEL_API}/v1/registrar/domains/${domain}/price${teamQuery()}`, {
            headers: vercelHeaders(),
          }),
        ])

        if (!availRes.ok || !priceRes.ok) return null

        const avail = await availRes.json()
        const price = await priceRes.json()

        return {
          domain,
          available: avail.available as boolean,
          purchasePrice: Number(price.purchasePrice),
          renewalPrice: Number(price.renewalPrice),
          years: Number(price.years),
        }
      })
    )

    return {
      results: results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((r): r is NonNullable<typeof r> => r !== null),
    }
  })

export const createDomainCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => domainPurchaseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required' }

    const priceRes = await fetch(
      `${VERCEL_API}/v1/registrar/domains/${data.domain}/price${teamQuery()}`,
      { headers: vercelHeaders() }
    )
    if (!priceRes.ok) return { error: 'Could not fetch domain pricing' }
    const price = await priceRes.json()

    const vercelPurchasePrice = Number(price.purchasePrice)
    const vercelRenewalPrice = Number(price.renewalPrice)
    const years = Number(price.years)

    const { data: order, error: orderErr } = await supabase
      .from('domain_orders')
      .insert({
        profile_id: user.id,
        domain: data.domain,
        status: 'pending_payment',
        vercel_purchase_price: vercelPurchasePrice,
        vercel_renewal_price: vercelRenewalPrice,
        service_fee: SERVICE_FEE,
        years,
        contact_info: data.contactInfo,
      })
      .select('id')
      .single()

    if (orderErr || !order) return { error: 'Failed to create order' }

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Stripe subscription mode requires all line items to be recurring.
    // Year 1 charges the registration price; the webhook updates the subscription
    // to the renewal price after the first invoice.
    const firstYearTotal = Math.round((vercelPurchasePrice + SERVICE_FEE) * 100)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Domain: ${data.domain}` },
            unit_amount: firstYearTotal,
            recurring: { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          domain_order_id: order.id,
          type: 'domain_renewal',
          domain: data.domain,
        },
      },
      success_url: `${BASE_URL}/dashboard/settings?domain_purchased=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: {
        domain_order_id: order.id,
        type: 'domain_purchase',
      },
    })

    await supabase
      .from('domain_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id)

    return { url: session.url }
  })

export const getDomainOrder = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: order } = await supabase
    .from('domain_orders')
    .select('*')
    .eq('profile_id', user.id)
    .in('status', ['pending_payment', 'purchasing', 'active', 'renewal_failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { order: order || null }
})

export const cancelDomainOrder = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: order } = await supabase
    .from('domain_orders')
    .select('*')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!order) return { error: 'No active domain order found' }

  if (order.stripe_subscription_id) {
    await stripe.subscriptions.cancel(order.stripe_subscription_id)
  }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  const delRes = await fetch(
    `${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains/${order.domain}${teamParam}`,
    { method: 'DELETE', headers: vercelHeaders() }
  )

  if (!delRes.ok) {
    console.error('[cancelDomainOrder] Vercel domain removal failed:', await delRes.text())
  }

  await supabase
    .from('domain_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  await supabase
    .from('profiles')
    .update({ custom_domain: null })
    .eq('id', user.id)

  return { success: true }
})
