import { defineEventHandler, readRawBody, getHeader } from 'h3'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Use admin client with service role key (no cookies needed for webhooks)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!body || !sig) {
    return new Response('Missing body or signature', { status: 400 })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (userId) {
        await supabase.from('profiles').update({ tier: 'pro', stripe_customer_id: session.customer as string }).eq('id', userId)
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const isActive = ['active', 'trialing'].includes(subscription.status)
      await supabase.from('profiles').update({ tier: isActive ? 'pro' : 'free' }).eq('stripe_customer_id', customerId)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      await supabase.from('profiles').update({ tier: 'free' }).eq('stripe_customer_id', customerId)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      // Optionally downgrade or flag account
      await supabase.from('profiles').update({ tier: 'free' }).eq('stripe_customer_id', customerId)
      break
    }
  }

  return new Response('ok', { status: 200 })
})
