import { createAPIFileRoute } from '@tanstack/react-start/api'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Use admin client with service role key (no cookies needed for webhooks)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const APIRoute = createAPIFileRoute('/api/stripe-webhook')({
  POST: async ({ request }) => {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (userId) {
          await supabase.from('profiles').update({ tier: 'pro', stripe_customer_id: session.customer as string }).eq('id', userId)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await supabase.from('profiles').update({ tier: 'free' }).eq('stripe_customer_id', customerId)
        break
      }
    }

    return new Response('ok', { status: 200 })
  },
})
