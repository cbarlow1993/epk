import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'
import { getProfile } from '~/server/profile'
import { bookingContactUpdateSchema, type BookingContactUpdate } from '~/schemas/booking-contact'
import { FormInput } from '~/components/forms'
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

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<BookingContactUpdate>({
    resolver: zodResolver(bookingContactUpdateSchema),
    defaultValues: {
      manager_name: initialData?.manager_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
    },
  })

  const onSave = handleSubmit(async (data) => {
    await Promise.all([save(data), sectionToggle.save()])
  })

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Booking Contact" saving={saving} saved={saved} error={error} isDirty={isDirty || sectionToggle.isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />

      <div className="space-y-6">
        <FormInput
          label="Manager / Agent Name"
          registration={register('manager_name')}
          error={errors.manager_name}
          placeholder="e.g. Helen"
        />
        <FormInput
          label="Email"
          registration={register('email')}
          error={errors.email}
          type="email"
          placeholder="booking@example.com"
        />
        <FormInput
          label="Phone"
          registration={register('phone')}
          error={errors.phone}
          type="tel"
          placeholder="+44 7xxx xxx xxx"
        />
        <FormInput
          label="Address"
          registration={register('address')}
          error={errors.address}
          placeholder="City, Country"
        />
      </div>
    </form>
  )
}
