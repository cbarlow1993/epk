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

type SeoFields = Pick<ProfileUpdate, 'meta_description' | 'og_image_url'>
type ProSocialFields = Pick<ProfileUpdate, 'og_title' | 'og_description' | 'twitter_card_type'>

export const Route = createFileRoute('/_dashboard/dashboard/social-preview')({
  loader: () => getProfile(),
  component: SeoSharingEditor,
})

type PreviewTab = 'facebook' | 'twitter' | 'linkedin'

function SeoSharingEditor() {
  const initial = Route.useLoaderData()
  const isPro = initial?.tier === 'pro'

  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<PreviewTab>('facebook')
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  // SEO fields — available to all users
  const seoForm = useForm<SeoFields>({
    resolver: zodResolver(
      profileUpdateSchema.pick({ meta_description: true, og_image_url: true })
    ),
    defaultValues: {
      meta_description: initial?.meta_description || '',
      og_image_url: initial?.og_image_url || '',
    },
  })

  // Pro social fields — only used by pro users
  const proForm = useForm<ProSocialFields>({
    resolver: zodResolver(
      profileUpdateSchema.pick({ og_title: true, og_description: true, twitter_card_type: true })
    ),
    defaultValues: {
      og_title: initial?.og_title || '',
      og_description: initial?.og_description || '',
      twitter_card_type: initial?.twitter_card_type || 'summary_large_image',
    },
  })

  const isDirty = seoForm.formState.isDirty || (isPro && proForm.formState.isDirty)

  const onSave = async () => {
    const seoValid = await seoForm.trigger()
    const proValid = isPro ? await proForm.trigger() : true
    if (!seoValid || !proValid) return

    const data = {
      ...seoForm.getValues(),
      ...(isPro ? proForm.getValues() : {}),
    }
    const success = await save(data)
    if (success) {
      seoForm.reset(seoForm.getValues())
      if (isPro) proForm.reset(proForm.getValues())
    }
  }

  const handleUpgrade = async () => {
    setUpgradeLoading(true)
    setUpgradeError('')
    try {
      const result = await createCheckoutSession()
      if ('url' in result && typeof result.url === 'string') {
        window.location.href = result.url
      } else if ('error' in result && typeof result.error === 'string') {
        setUpgradeError(result.error)
        setUpgradeLoading(false)
      }
    } catch {
      setUpgradeError('Something went wrong')
      setUpgradeLoading(false)
    }
  }

  // Watched values for live preview
  const ogTitle = isPro ? proForm.watch('og_title') : ''
  const ogDescription = isPro ? proForm.watch('og_description') : ''
  const ogImageUrl = seoForm.watch('og_image_url')
  const twitterCardType = isPro ? proForm.watch('twitter_card_type') : 'summary_large_image'
  const metaDescription = seoForm.watch('meta_description')

  // Fallback chain for effective preview values
  const name = initial?.display_name || 'DJ'
  const tagline = initial?.tagline || ''
  const genres = (initial?.genres as string[] | undefined) || []
  const autoTitle = isPro ? `${name} | DJ - Official Press Kit` : `${name} | myepk.bio`
  const autoDescription = [
    `Official Electronic Press Kit for ${name}.`,
    tagline,
    genres.length ? genres.join(', ') : null,
  ].filter(Boolean).join(' — ')

  const effectiveTitle = ogTitle || autoTitle
  const effectiveDescription = ogDescription || metaDescription || autoDescription
  const effectiveImage = ogImageUrl || initial?.profile_image_url || ''
  const domain = initial?.slug ? `myepk.bio/${initial.slug}` : 'myepk.bio'

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadFileFromInput(file, 'og-images')
    if (result) {
      seoForm.setValue('og_image_url', result.url, { shouldDirty: true })
    }
    setUploading(false)
  }

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'linkedin', label: 'LinkedIn' },
  ]

  return (
    <div>
      <DashboardHeader title="SEO & Sharing" saving={saving} saved={saved} error={error} isDirty={isDirty} onSave={onSave} />

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* SEO section — available to all */}
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Search Engine (SEO)</h2>

            <div>
              <FormTextarea
                label="Meta Description"
                registration={seoForm.register('meta_description')}
                error={seoForm.formState.errors.meta_description}
                rows={3}
                placeholder="Custom description for search engine results..."
              />
              <p className="text-xs text-text-secondary mt-1">
                Shown in Google search results. {(metaDescription || '').length}/300
              </p>
            </div>
          </div>

          {/* Social sharing section */}
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Social Sharing</h2>

            {/* Social card image — available to all */}
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
                  onClick={() => seoForm.setValue('og_image_url', '', { shouldDirty: true })}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  Remove image
                </button>
              )}
            </div>

            {isPro ? (
              <>
                <FormInput
                  label="OG Title"
                  registration={proForm.register('og_title')}
                  error={proForm.formState.errors.og_title}
                  placeholder={autoTitle}
                />

                <div>
                  <FormTextarea
                    label="OG Description"
                    registration={proForm.register('og_description')}
                    error={proForm.formState.errors.og_description}
                    rows={3}
                    placeholder={metaDescription || autoDescription}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-text-secondary">Leave blank to use meta description or auto-generate</p>
                    <p className={`text-xs ${(ogDescription || '').length > 300 ? 'text-red-500' : 'text-text-secondary'}`}>
                      {(ogDescription || '').length}/300
                    </p>
                  </div>
                </div>

                <div>
                  <label className={FORM_LABEL}>Twitter Card Type</label>
                  <select
                    {...proForm.register('twitter_card_type')}
                    className={FORM_INPUT}
                  >
                    <option value="summary_large_image">Large Image Card</option>
                    <option value="summary">Summary Card (small thumbnail)</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="border border-border rounded-lg p-5 space-y-3">
                <p className="text-sm font-medium text-text-primary">Upgrade to customise title & description</p>
                <p className="text-sm text-text-secondary">
                  Free accounts display <span className="font-medium text-text-primary">"{autoTitle}"</span> as the social preview title. Upgrade to Pro to set a custom title, description, and Twitter card type.
                </p>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  className="bg-accent hover:brightness-110 disabled:opacity-30 text-white text-sm font-medium px-6 py-2 transition-colors"
                >
                  {upgradeLoading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
                {upgradeError && <p className="text-xs text-red-500 mt-2">{upgradeError}</p>}
              </div>
            )}
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
    </div>
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

