import { useState } from 'react'
import { useAITokens } from '../AITokenProvider'
import { SocialIcon } from '~/components/SocialIcon'
import { submitContactForm } from '~/server/booking-contact'
import type { SocialLinkRow } from '~/types/database'

interface AIContactProps {
  profileId: string
  bookingContact: {
    contact_mode?: string
    manager_name: string | null
    email: string | null
    phone: string | null
  } | null
  socialLinks: SocialLinkRow[]
}

export function AIContact({ profileId, bookingContact, socialLinks }: AIContactProps) {
  const tokens = useAITokens()
  const contact = tokens.sections.contact

  if (!bookingContact) return null

  return (
    <section
      id="contact"
      className="px-4"
      style={{
        paddingBlock: contact.padding || 'var(--ai-section-padding)',
        background: contact.background || 'transparent',
        color: contact.textColor || 'var(--ai-color-text)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
        <h2
          className="mb-8"
          style={{
            fontFamily: 'var(--ai-font-h2)',
            fontSize: 'var(--ai-size-h2)',
            fontWeight: 'var(--ai-weight-h2)',
            color: 'var(--ai-color-heading)',
          }}
        >
          Contact
        </h2>
        {contact.variant === 'form' && (
          <ContactForm profileId={profileId} bookingContact={bookingContact} socialLinks={socialLinks} />
        )}
        {contact.variant === 'minimal' && (
          <ContactMinimal bookingContact={bookingContact} socialLinks={socialLinks} />
        )}
        {contact.variant === 'card' && (
          <ContactCard bookingContact={bookingContact} socialLinks={socialLinks} />
        )}
        {contact.variant === 'split' && (
          <ContactSplit profileId={profileId} bookingContact={bookingContact} socialLinks={socialLinks} />
        )}
      </div>
    </section>
  )
}

function SocialLinksRow({ links }: { links: SocialLinkRow[] }) {
  const tokens = useAITokens()
  if (!tokens.sections.contact.showSocialLinks || links.length === 0) return null
  return (
    <div className="flex items-center gap-3 mt-4">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.platform}
          aria-label={`${link.platform} profile`}
          className="w-9 h-9 rounded-full border flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ borderColor: 'var(--ai-color-border)', color: 'var(--ai-color-textMuted)' }}
        >
          <SocialIcon platform={link.platform} />
        </a>
      ))}
    </div>
  )
}

function ContactFormFields({ profileId }: { profileId: string }) {
  const tokens = useAITokens()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const buttonRadius =
    tokens.decorative.buttonStyle === 'pill' ? '9999px' :
    tokens.decorative.buttonStyle === 'rounded' ? 'var(--ai-radius-md)' :
    '0'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const form = e.currentTarget
    const formData = new FormData(form)

    const result = await submitContactForm({
      data: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || '',
        message: formData.get('message') as string,
        profile_id: profileId,
        _honey: formData.get('_honey') as string,
      },
    })

    if ('error' in result && result.error) {
      setStatus('error')
      setErrorMsg(result.error)
    } else {
      setStatus('sent')
      form.reset()
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center py-8">
        <p
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--ai-color-heading)' }}
        >
          Message sent!
        </p>
        <p style={{ color: 'var(--ai-color-textMuted)' }}>
          Thank you for your inquiry. We'll be in touch soon.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm underline"
          style={{ color: 'var(--ai-color-accent)' }}
        >
          Send another message
        </button>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    borderWidth: '1px',
    borderColor: 'var(--ai-color-border)',
    borderRadius: 'var(--ai-radius-sm)',
    color: 'inherit',
    fontFamily: 'var(--ai-font-body)',
    fontSize: 'var(--ai-size-body)',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="absolute opacity-0 h-0 w-0 pointer-events-none" aria-hidden="true" />
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ai-color-textMuted)' }}>
          Name *
        </label>
        <input type="text" name="name" required maxLength={200} placeholder="Your name" className="w-full px-4 py-3 text-sm placeholder:opacity-50 focus:outline-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ai-color-textMuted)' }}>
          Email *
        </label>
        <input type="email" name="email" required placeholder="your@email.com" className="w-full px-4 py-3 text-sm placeholder:opacity-50 focus:outline-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ai-color-textMuted)' }}>
          Phone
        </label>
        <input type="tel" name="phone" maxLength={50} placeholder="+44 7xxx xxx xxx" className="w-full px-4 py-3 text-sm placeholder:opacity-50 focus:outline-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ai-color-textMuted)' }}>
          Message *
        </label>
        <textarea name="message" required maxLength={2000} rows={5} placeholder="Tell us about your event..." className="w-full px-4 py-3 text-sm placeholder:opacity-50 focus:outline-none resize-none leading-relaxed" style={inputStyle} />
      </div>

      {status === 'error' && <p className="text-sm" style={{ color: 'var(--ai-color-error)' }}>{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--ai-color-accent)', borderRadius: buttonRadius }}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}

function ContactForm({ profileId, bookingContact, socialLinks }: AIContactProps) {
  if (bookingContact?.contact_mode === 'form') {
    return (
      <div className="max-w-xl">
        <ContactFormFields profileId={profileId} />
        <SocialLinksRow links={socialLinks} />
      </div>
    )
  }

  return <ContactMinimal bookingContact={bookingContact} socialLinks={socialLinks} />
}

function ContactMinimal({ bookingContact, socialLinks }: Omit<AIContactProps, 'profileId'>) {
  if (!bookingContact) return null
  return (
    <div className="space-y-2" style={{ color: 'var(--ai-color-textMuted)' }}>
      {bookingContact.manager_name && <p><strong>Management:</strong> {bookingContact.manager_name}</p>}
      {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
      {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
      <SocialLinksRow links={socialLinks} />
    </div>
  )
}

function ContactCard({ bookingContact, socialLinks }: Omit<AIContactProps, 'profileId'>) {
  const tokens = useAITokens()
  if (!bookingContact) return null

  return (
    <div
      className="max-w-md border p-6"
      style={{
        borderColor: 'var(--ai-color-border)',
        borderRadius: 'var(--ai-radius-md)',
        backgroundColor: 'var(--ai-color-surface)',
        boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
      }}
    >
      {bookingContact.manager_name && (
        <p
          className="font-semibold text-lg mb-3"
          style={{ color: 'var(--ai-color-heading)' }}
        >
          {bookingContact.manager_name}
        </p>
      )}
      <div className="space-y-1" style={{ color: 'var(--ai-color-textMuted)' }}>
        {bookingContact.email && <p className="text-sm">{bookingContact.email}</p>}
        {bookingContact.phone && <p className="text-sm">{bookingContact.phone}</p>}
      </div>
      <SocialLinksRow links={socialLinks} />
    </div>
  )
}

function ContactSplit({ profileId, bookingContact, socialLinks }: AIContactProps) {
  if (!bookingContact) return null

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3
          className="font-semibold text-lg mb-4"
          style={{
            fontFamily: 'var(--ai-font-h3)',
            color: 'var(--ai-color-heading)',
          }}
        >
          Get in Touch
        </h3>
        <div className="space-y-2" style={{ color: 'var(--ai-color-textMuted)' }}>
          {bookingContact.manager_name && <p><strong>Management:</strong> {bookingContact.manager_name}</p>}
          {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
          {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
        </div>
        <SocialLinksRow links={socialLinks} />
      </div>
      {bookingContact.contact_mode === 'form' && (
        <ContactFormFields profileId={profileId} />
      )}
    </div>
  )
}
