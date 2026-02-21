import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'
import { getProfile } from '~/server/profile'
import { bookingContactUpdateSchema, type BookingContactUpdate } from '~/schemas/booking-contact'
import { FormInput } from '~/components/forms'
import { FORM_LABEL } from '~/components/forms/styles'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: async () => {
    const [contact, profile] = await Promise.all([getBookingContact(), getProfile()])
    return { contact, sectionVisibility: (profile?.section_visibility as Record<string, boolean> | null) ?? null }
  },
  component: BookingContactEditor,
})

function BookingContactEditor() {
  const { contact: initialData, sectionVisibility } = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateBookingContact)
  const sectionToggle = useSectionToggle('contact', sectionVisibility)

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<BookingContactUpdate>({
    resolver: zodResolver(bookingContactUpdateSchema),
    defaultValues: {
      contact_mode: initialData?.contact_mode || 'details',
      manager_name: initialData?.manager_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      booking_email: initialData?.booking_email || '',
    },
  })

  const contactMode = watch('contact_mode')

  const onSave = handleSubmit(async (data) => {
    await Promise.all([save(data), sectionToggle.save()])
  })

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Booking Contact" saving={saving} saved={saved} error={error} isDirty={isDirty || sectionToggle.isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />

      <fieldset className="mb-8">
        <legend className={FORM_LABEL}>Contact Mode</legend>
        <div className="flex gap-6 mt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="details" {...register('contact_mode')} className="accent-accent" />
            <span className="text-sm text-text-primary">Display contact details</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="form" {...register('contact_mode')} className="accent-accent" />
            <span className="text-sm text-text-primary">Show contact form</span>
          </label>
        </div>
      </fieldset>

      {contactMode === 'details' ? (
        <div className="space-y-6">
          <FormInput label="Manager / Agent Name" registration={register('manager_name')} error={errors.manager_name} placeholder="e.g. Helen" />
          <FormInput label="Email" registration={register('email')} error={errors.email} type="email" placeholder="booking@example.com" />
          <FormInput label="Phone" registration={register('phone')} error={errors.phone} type="tel" placeholder="+44 7xxx xxx xxx" />
          <FormInput label="Address" registration={register('address')} error={errors.address} placeholder="City, Country" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormInput label="Booking Email" registration={register('booking_email')} error={errors.booking_email} type="email" placeholder="booking@example.com" />
          <p className="text-xs text-text-secondary -mt-4">
            Form submissions will be sent to this email. Leave blank to use your account email.
          </p>
        </div>
      )}
    </form>
  )
}
