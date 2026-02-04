// server/routes/api/stripe-webhook.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Admin client — bypasses RLS (this is a Nitro route, no user cookies)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!body || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      console.log(`[stripe-webhook] Processing ${stripeEvent.type}`)
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id
      if (!subscriptionId) break

      const { error } = await supabase
        .from('profiles')
        .update({
          tier: 'pro',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)

      if (error) {
        throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
      }

      break
    }

    case 'customer.subscription.updated': {
      console.log(`[stripe-webhook] Processing ${stripeEvent.type}`)
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      const status = subscription.status
      const tier = (status === 'active' || status === 'trialing') ? 'pro' : 'free'

      const { error } = await supabase
        .from('profiles')
        .update({ tier, stripe_subscription_id: subscription.id })
        .eq('stripe_customer_id', customerId)

      if (error) {
        throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
      }

      break
    }

    case 'customer.subscription.deleted': {
      console.log(`[stripe-webhook] Processing ${stripeEvent.type}`)
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      // Downgrade to free, clear custom domain
      const { error } = await supabase
        .from('profiles')
        .update({
          tier: 'free',
          stripe_subscription_id: null,
          custom_domain: null,
        })
        .eq('stripe_customer_id', customerId)

      if (error) {
        throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
      }

      break
    }

    case 'invoice.payment_failed': {
      // Log for now — could send warning email later
      const invoice = stripeEvent.data.object as Stripe.Invoice
      console.warn(`Payment failed for customer ${invoice.customer}`)
      break
    }
  }

  return { received: true }
})
