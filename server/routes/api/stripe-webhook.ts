// server/routes/api/stripe-webhook.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { defineHandler, readRawBody, getRequestHeader, createError, setResponseStatus, setResponseHeader } from 'h3'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Admin client — bypasses RLS (this is a Nitro route, no user cookies)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default defineHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = getRequestHeader(event, 'stripe-signature')

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

      // --- Domain purchase flow ---
      if (session.metadata?.type === 'domain_purchase') {
        const orderId = session.metadata.domain_order_id
        if (!orderId) break

        const { data: order, error: fetchErr } = await supabase
          .from('domain_orders')
          .update({ status: 'purchasing', stripe_checkout_session_id: session.id })
          .eq('id', orderId)
          .eq('status', 'pending_payment')
          .select('*')
          .single()

        if (fetchErr || !order) {
          console.error('[stripe-webhook] Domain order not found:', orderId)
          break
        }

        const domainSubId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id

        try {
          const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''
          const buyRes = await fetch(
            `https://api.vercel.com/v1/registrar/domains/${order.domain}/buy${teamParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                expectedPrice: order.vercel_purchase_price,
                years: order.years,
                autoRenew: false,
                contactInformation: order.contact_info,
              }),
            }
          )

          if (!buyRes.ok) {
            const err = await buyRes.json()
            console.error('[stripe-webhook] Vercel buy failed:', err)

            // In subscription mode, payment_intent is null — refund via the subscription's latest invoice
            if (domainSubId) {
              try {
                const sub = await stripe.subscriptions.retrieve(domainSubId, {
                  expand: ['latest_invoice'],
                })
                const latestInvoice = sub.latest_invoice as Stripe.Invoice
                if (latestInvoice?.payment_intent) {
                  const pi = typeof latestInvoice.payment_intent === 'string'
                    ? latestInvoice.payment_intent
                    : latestInvoice.payment_intent.id
                  await stripe.refunds.create({ payment_intent: pi })
                }
              } catch (refundErr) {
                console.error('[stripe-webhook] Refund failed:', refundErr)
              }
              await stripe.subscriptions.cancel(domainSubId)
            }

            await supabase
              .from('domain_orders')
              .update({ status: 'failed', updated_at: new Date().toISOString() })
              .eq('id', orderId)
            break
          }

          const buyData = await buyRes.json()

          const projectParam = process.env.VERCEL_TEAM_ID
            ? `?teamId=${process.env.VERCEL_TEAM_ID}`
            : ''
          const assignRes = await fetch(
            `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${projectParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: order.domain }),
            }
          )

          if (!assignRes.ok) {
            console.error('[stripe-webhook] Vercel domain assignment failed:', await assignRes.text())
          }

          const { error: updateErr } = await supabase
            .from('domain_orders')
            .update({
              status: 'active',
              vercel_order_id: buyData.orderId || null,
              stripe_subscription_id: domainSubId || null,
              purchased_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + order.years * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)

          if (updateErr) {
            console.error('[stripe-webhook] Failed to update domain order to active:', updateErr.message)
          }

          const { error: profileErr } = await supabase
            .from('profiles')
            .update({ custom_domain: order.domain })
            .eq('id', order.profile_id)

          if (profileErr) {
            console.error('[stripe-webhook] Failed to set custom_domain on profile:', profileErr.message)
          }

          console.log(`[stripe-webhook] Domain ${order.domain} purchased and configured`)
        } catch (err) {
          console.error('[stripe-webhook] Domain purchase error:', err)
          await supabase
            .from('domain_orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', orderId)
        }

        break
      }

      // --- Existing Pro subscription upgrade flow ---
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

      // Skip domain renewal subscriptions — they don't affect Pro tier
      if (subscription.metadata?.type === 'domain_renewal') break

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

      // Skip domain renewal subscriptions — handled by cancelDomainOrder
      if (subscription.metadata?.type === 'domain_renewal') break

      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      // Fetch current profile to snapshot premium data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!profile) {
        console.error('[stripe-webhook] No profile found for customer:', customerId)
        break
      }

      // Snapshot premium fields + integrations
      const { data: integrations } = await supabase
        .from('integrations')
        .select('type, enabled, config, sort_order')
        .eq('profile_id', profile.id)

      const snapshot = {
        snapshotted_at: new Date().toISOString(),
        profile_fields: {
          favicon_url: profile.favicon_url,
          hide_platform_branding: profile.hide_platform_branding,
          meta_description: profile.meta_description,
          og_title: profile.og_title,
          og_description: profile.og_description,
          og_image_url: profile.og_image_url,
          twitter_card_type: profile.twitter_card_type,
          theme_display_font: profile.theme_display_font,
          theme_display_size: profile.theme_display_size,
          theme_display_weight: profile.theme_display_weight,
          theme_heading_font: profile.theme_heading_font,
          theme_heading_size: profile.theme_heading_size,
          theme_heading_weight: profile.theme_heading_weight,
          theme_subheading_font: profile.theme_subheading_font,
          theme_subheading_size: profile.theme_subheading_size,
          theme_subheading_weight: profile.theme_subheading_weight,
          theme_body_font: profile.theme_body_font,
          theme_body_size: profile.theme_body_size,
          theme_body_weight: profile.theme_body_weight,
          theme_text_color: profile.theme_text_color,
          theme_heading_color: profile.theme_heading_color,
          theme_link_color: profile.theme_link_color,
          theme_card_bg: profile.theme_card_bg,
          theme_border_color: profile.theme_border_color,
          theme_section_padding: profile.theme_section_padding,
          theme_content_width: profile.theme_content_width,
          theme_card_radius: profile.theme_card_radius,
          theme_element_gap: profile.theme_element_gap,
          theme_button_style: profile.theme_button_style,
          theme_link_style: profile.theme_link_style,
          theme_card_border: profile.theme_card_border,
          theme_shadow: profile.theme_shadow,
          theme_divider_style: profile.theme_divider_style,
          theme_custom_fonts: profile.theme_custom_fonts,
          hero_style: profile.hero_style,
          bio_layout: profile.bio_layout,
        },
        integrations: integrations || [],
      }

      // Save snapshot + reset all premium fields to defaults
      const { error } = await supabase
        .from('profiles')
        .update({
          tier: 'free',
          stripe_subscription_id: null,
          custom_domain: null,
          premium_snapshot: snapshot,
          // Reset branding
          favicon_url: null,
          hide_platform_branding: false,
          meta_description: null,
          // Reset OG/social
          og_title: null,
          og_description: null,
          og_image_url: null,
          twitter_card_type: null,
          // Reset theme — Typography
          theme_display_font: null,
          theme_display_size: null,
          theme_display_weight: null,
          theme_heading_font: null,
          theme_heading_size: null,
          theme_heading_weight: null,
          theme_subheading_font: null,
          theme_subheading_size: null,
          theme_subheading_weight: null,
          theme_body_font: null,
          theme_body_size: null,
          theme_body_weight: null,
          // Reset theme — Colors
          theme_text_color: null,
          theme_heading_color: null,
          theme_link_color: null,
          theme_card_bg: null,
          theme_border_color: null,
          // Reset theme — Spacing & Layout
          theme_section_padding: null,
          theme_content_width: null,
          theme_card_radius: null,
          theme_element_gap: null,
          // Reset theme — Buttons & Links
          theme_button_style: null,
          theme_link_style: null,
          // Reset theme — Effects
          theme_card_border: null,
          theme_shadow: null,
          theme_divider_style: null,
          // Reset theme — Custom Fonts
          theme_custom_fonts: null,
          // Reset layout
          hero_style: null,
          bio_layout: null,
        })
        .eq('id', profile.id)

      if (error) {
        throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
      }

      // Disable all integrations (data preserved, just disabled)
      const { error: intError } = await supabase
        .from('integrations')
        .update({ enabled: false })
        .eq('profile_id', profile.id)

      if (intError) {
        console.error('[stripe-webhook] Failed to disable integrations:', intError.message)
      }

      console.log(`[stripe-webhook] Premium features reset for customer: ${customerId}`)
      break
    }

    case 'invoice.paid': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      const invoiceSubId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as Stripe.Subscription | null)?.id

      if (!invoiceSubId) break

      const { data: order } = await supabase
        .from('domain_orders')
        .select('*')
        .eq('stripe_subscription_id', invoiceSubId)
        .eq('status', 'active')
        .single()

      if (!order) break

      if (invoice.billing_reason === 'subscription_create') break

      console.log(`[stripe-webhook] Renewing domain ${order.domain}`)

      try {
        const teamParam = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''
        const renewRes = await fetch(
          `https://api.vercel.com/v1/registrar/domains/${order.domain}/renew${teamParam}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              years: order.years,
              expectedPrice: order.vercel_renewal_price,
            }),
          }
        )

        if (!renewRes.ok) {
          const err = await renewRes.json()
          console.error('[stripe-webhook] Vercel renew failed:', err)

          if (err.code === 'expected_price_mismatch') {
            const priceRes = await fetch(
              `https://api.vercel.com/v1/registrar/domains/${order.domain}/price?${process.env.VERCEL_TEAM_ID ? `teamId=${process.env.VERCEL_TEAM_ID}` : ''}`,
              { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
            )
            if (priceRes.ok) {
              const newPrice = await priceRes.json()
              await supabase
                .from('domain_orders')
                .update({
                  vercel_renewal_price: Number(newPrice.renewalPrice),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id)
            }
          }

          await supabase
            .from('domain_orders')
            .update({ status: 'renewal_failed', updated_at: new Date().toISOString() })
            .eq('id', order.id)
          break
        }

        const renewData = await renewRes.json()
        await supabase
          .from('domain_orders')
          .update({
            last_renewed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + order.years * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
            vercel_order_id: renewData.orderId || order.vercel_order_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        console.log(`[stripe-webhook] Domain ${order.domain} renewed`)
      } catch (err) {
        console.error('[stripe-webhook] Domain renewal error:', err)
        await supabase
          .from('domain_orders')
          .update({ status: 'renewal_failed', updated_at: new Date().toISOString() })
          .eq('id', order.id)
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
