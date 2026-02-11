import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormInput, FormTextarea, FORM_LABEL, FORM_INPUT, FORM_FILE_INPUT } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { uploadFileFromInput } from '~/utils/upload'
import { createCheckoutSession } from '~/server/billing'
import type { ProfileRow } from '~/types/database'

type SocialPreviewFields = Pick<ProfileUpdate, 'og_title' | 'og_description' | 'og_image_url' | 'twitter_card_type'>

export const Route = createFileRoute('/_dashboard/dashboard/social-preview')({
  loader: () => getProfile(),
  component: SocialPreviewEditor,
})

type PreviewTab = 'facebook' | 'twitter' | 'linkedin'

function SocialPreviewEditor() {
  const initial = Route.useLoaderData()

  if (initial?.tier !== 'pro') {
    return <SocialPreviewUpgrade name={initial?.display_name || 'DJ'} initial={initial} />
  }
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<PreviewTab>('facebook')

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<SocialPreviewFields>({
    resolver: zodResolver(
      profileUpdateSchema.pick({ og_title: true, og_description: true, og_image_url: true, twitter_card_type: true })
    ),
    defaultValues: {
      og_title: initial?.og_title || '',
      og_description: initial?.og_description || '',
      og_image_url: initial?.og_image_url || '',
      twitter_card_type: initial?.twitter_card_type || 'summary_large_image',
    },
  })

  const onSave = handleSubmit(save)

  // Watched values for live preview
  const ogTitle = watch('og_title')
  const ogDescription = watch('og_description')
  const ogImageUrl = watch('og_image_url')
  const twitterCardType = watch('twitter_card_type')

  // Fallback chain for effective preview values
  const name = initial?.display_name || 'DJ'
  const tagline = initial?.tagline || ''
  const genres = (initial?.genres as string[] | undefined) || []
  const autoTitle = `${name} | DJ - Official Press Kit`
  const autoDescription = [
    `Official Electronic Press Kit for ${name}.`,
    tagline,
    genres.length ? genres.join(', ') : null,
  ].filter(Boolean).join(' — ')

  const effectiveTitle = ogTitle || autoTitle
  const effectiveDescription = ogDescription || initial?.meta_description || autoDescription
  const effectiveImage = ogImageUrl || initial?.profile_image_url || ''
  const domain = initial?.slug ? `${initial.slug}.djepk.com` : 'djepk.com'

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFileFromInput(file, 'og-images')
    if (result) {
      setValue('og_image_url', result.url, { shouldDirty: true })
    }
    setUploading(false)
  }

  const descriptionLength = (ogDescription || '').length

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'linkedin', label: 'LinkedIn' },
  ]

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Social Preview" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form fields */}
        <div className="space-y-6">
          <FormInput
            label="OG Title"
            registration={register('og_title')}
            error={errors.og_title}
            placeholder={autoTitle}
          />

          <div>
            <FormTextarea
              label="OG Description"
              registration={register('og_description')}
              error={errors.og_description}
              rows={3}
              placeholder={initial?.meta_description || autoDescription}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-text-secondary">Leave blank to auto-generate from your profile</p>
              <p className={`text-xs ${descriptionLength > 300 ? 'text-red-500' : 'text-text-secondary'}`}>
                {descriptionLength}/300
              </p>
            </div>
          </div>

          {/* OG Image upload */}
          <div>
            <label className={FORM_LABEL}>Social Card Image</label>
            <p className="text-xs text-text-secondary mb-3">Recommended size: 1200 x 630 pixels</p>
            {effectiveImage && (
              <div className="mb-3 border border-border overflow-hidden">
                <img
                  src={effectiveImage}
                  alt="Social card preview"
                  className="w-full aspect-[1200/630] object-cover"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className={FORM_FILE_INPUT}
            />
            {uploading && <p className="text-xs text-text-secondary mt-1">Uploading...</p>}
            {ogImageUrl && (
              <button
                type="button"
                onClick={() => setValue('og_image_url', '', { shouldDirty: true })}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Remove image
              </button>
            )}
          </div>

          {/* Twitter card type */}
          <div>
            <label className={FORM_LABEL}>Twitter Card Type</label>
            <select
              {...register('twitter_card_type')}
              className={FORM_INPUT}
            >
              <option value="summary_large_image">Large Image Card</option>
              <option value="summary">Summary Card (small thumbnail)</option>
            </select>
          </div>
        </div>

        {/* Preview panel */}
        <div>
          <label className={FORM_LABEL}>Preview</label>

          {/* Tab switcher */}
          <div className="flex border-b border-border mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'facebook' && (
            <FacebookPreview
              title={effectiveTitle}
              description={effectiveDescription}
              imageUrl={effectiveImage}
              domain={domain}
            />
          )}
          {activeTab === 'twitter' && (
            <TwitterPreview
              title={effectiveTitle}
              description={effectiveDescription}
              imageUrl={effectiveImage}
              domain={domain}
              cardType={twitterCardType || 'summary_large_image'}
            />
          )}
          {activeTab === 'linkedin' && (
            <LinkedInPreview
              title={effectiveTitle}
              imageUrl={effectiveImage}
              domain={domain}
            />
          )}

          <p className="text-xs text-text-secondary mt-4">
            These previews are approximations. Actual appearance may vary by platform.
          </p>
        </div>
      </div>
    </form>
  )
}

/* ---------- Preview Components ---------- */

function ImagePlaceholder() {
  return (
    <div className="w-full aspect-[1.91/1] bg-gray-100 flex items-center justify-center">
      <p className="text-xs text-gray-400 text-center px-4">Upload a 1200 x 630 image<br />for social card previews</p>
    </div>
  )
}

function FacebookPreview({ title, description, imageUrl, domain }: {
  title: string
  description: string
  imageUrl: string
  domain: string
}) {
  return (
    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-sm">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full aspect-[1.91/1] object-cover" />
      ) : (
        <ImagePlaceholder />
      )}
      <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-200">
        <p className="text-[11px] text-gray-500 uppercase truncate">{domain}</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5 line-clamp-2">{title}</p>
        <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-1">{description}</p>
      </div>
    </div>
  )
}

function TwitterPreview({ title, description, imageUrl, domain, cardType }: {
  title: string
  description: string
  imageUrl: string
  domain: string
  cardType: string
}) {
  if (cardType === 'summary') {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex">
        <div className="w-32 h-32 flex-shrink-0 border-r border-gray-200">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-[10px] text-gray-400 text-center px-1">1:1</p>
            </div>
          )}
        </div>
        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
          <p className="text-[11px] text-gray-500 truncate">{domain}</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5 line-clamp-2">{title}</p>
          <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>
    )
  }

  // summary_large_image
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full aspect-[2/1] object-cover" />
      ) : (
        <div className="w-full aspect-[2/1] bg-gray-100 flex items-center justify-center">
          <p className="text-xs text-gray-400 text-center px-4">Upload a 1200 x 630 image</p>
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-gray-500 truncate">{domain}</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5 line-clamp-2">{title}</p>
        <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{description}</p>
      </div>
    </div>
  )
}

function LinkedInPreview({ title, imageUrl, domain }: {
  title: string
  imageUrl: string
  domain: string
}) {
  return (
    <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-sm">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full aspect-[1.91/1] object-cover" />
      ) : (
        <ImagePlaceholder />
      )}
      <div className="px-3 py-2.5 bg-white border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{domain}</p>
      </div>
    </div>
  )
}

/* ---------- Pro Upgrade Prompt ---------- */

function SocialPreviewUpgrade({ name, initial }: { name: string; initial: ProfileRow | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [ogImageUrl, setOgImageUrl] = useState(initial?.og_image_url || '')
  const [savedImageUrl, setSavedImageUrl] = useState(initial?.og_image_url || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await createCheckoutSession()
      if ('url' in result && typeof result.url === 'string') {
        window.location.href = result.url
      } else if ('error' in result && typeof result.error === 'string') {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFileFromInput(file, 'og-images')
    if (result) {
      setOgImageUrl(result.url)
    }
    setUploading(false)
  }

  const handleSaveImage = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const result = await updateProfile({ data: { og_image_url: ogImageUrl } })
      if ('error' in result && typeof result.error === 'string') {
        setSaveError(result.error)
      } else {
        setSaved(true)
        setSavedImageUrl(ogImageUrl)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setSaveError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  const effectiveImage = ogImageUrl || initial?.profile_image_url || ''
  const defaultTitle = `${name} | djepk.com`
  const isDirty = ogImageUrl !== savedImageUrl

  return (
    <form onSubmit={handleSaveImage}>
      <DashboardHeader title="Social Preview" saving={saving} saved={saved} error={saveError} isDirty={isDirty} />

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Image upload — available on free plan */}
          <div>
            <label className={FORM_LABEL}>Social Card Image</label>
            <p className="text-xs text-text-secondary mb-3">Recommended size: 1200 x 630 pixels</p>
            {effectiveImage && (
              <div className="mb-3 border border-border overflow-hidden">
                <img
                  src={effectiveImage}
                  alt="Social card preview"
                  className="w-full aspect-[1200/630] object-cover"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className={FORM_FILE_INPUT}
            />
            {uploading && <p className="text-xs text-text-secondary mt-1">Uploading...</p>}
            {ogImageUrl && (
              <button
                type="button"
                onClick={() => setOgImageUrl('')}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Remove image
              </button>
            )}
          </div>

          {/* Pro upsell for title/description/card type */}
          <div className="border border-border rounded-lg p-5 space-y-3">
            <p className="text-sm font-medium text-text-primary">Upgrade to customise title & description</p>
            <p className="text-sm text-text-secondary">
              Free accounts display <span className="font-medium text-text-primary">"{defaultTitle}"</span> as the social preview title. Upgrade to Pro to set a custom title, description, and Twitter card type.
            </p>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="bg-accent hover:brightness-110 disabled:opacity-30 text-white text-sm font-medium px-6 py-2 transition-colors"
            >
              {loading ? 'Loading...' : 'Upgrade to Pro'}
            </button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className={FORM_LABEL}>Preview</label>
          <FacebookPreview
            title={defaultTitle}
            description={`Official Electronic Press Kit for ${name}.`}
            imageUrl={effectiveImage}
            domain="djepk.com"
          />
          <p className="text-xs text-text-secondary mt-4">
            This preview is an approximation. Actual appearance may vary by platform.
          </p>
        </div>
      </div>
    </form>
  )
}
