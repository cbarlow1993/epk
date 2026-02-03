import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'
import { bookingContactUpdateSchema, type BookingContactUpdate } from '~/schemas/booking-contact'
import { FormInput } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: () => getBookingContact(),
  component: BookingContactEditor,
})

function BookingContactEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateBookingContact)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<BookingContactUpdate>({
    resolver: zodResolver(bookingContactUpdateSchema),
    defaultValues: {
      manager_name: (initialData as Record<string, string> | null)?.manager_name || '',
      email: (initialData as Record<string, string> | null)?.email || '',
      phone: (initialData as Record<string, string> | null)?.phone || '',
      address: (initialData as Record<string, string> | null)?.address || '',
    },
  })

  const onSave = handleSubmit(save)

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Booking Contact" saving={saving} saved={saved} error={error} isDirty={isDirty} />

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
