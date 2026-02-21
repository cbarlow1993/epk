import { useState } from 'react'
import { useAITokens } from '../AITokenProvider'
import { BlockRenderer } from '~/components/BlockRenderer'

interface AIBioProps {
  profile: {
    display_name: string | null
    short_bio: string | null
    bio: Record<string, unknown> | null
    profile_image_url: string | null
  }
}

export function AIBio({ profile }: AIBioProps) {
  const tokens = useAITokens()
  const bio = tokens.sections.bio

  if (!profile.bio && !profile.short_bio) return null

  switch (bio.variant) {
    case 'centered':
      return <BioCentered profile={profile} />
    case 'split-image':
      return <BioSplitImage profile={profile} />
    case 'full-width':
      return <BioFullWidth profile={profile} />
    case 'sidebar':
      return <BioSidebar profile={profile} />
    default:
      return <BioCentered profile={profile} />
  }
}

function SectionWrapper({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
}) {
  const tokens = useAITokens()
  const bio = tokens.sections.bio

  return (
    <section
      id={id || 'bio'}
      className="px-4"
      style={{
        paddingBlock: bio.padding || 'var(--ai-section-padding)',
        background: bio.background || 'transparent',
        color: bio.textColor || 'var(--ai-color-text)',
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
          Bio
        </h2>
        {children}
      </div>
    </section>
  )
}

function BioContent({ profile }: AIBioProps) {
  const tokens = useAITokens()
  const bioTokens = tokens.sections.bio
  const [expanded, setExpanded] = useState(false)

  const bioData = profile.bio as import('@editorjs/editorjs').OutputData | null
  const isLong = bioData?.blocks && bioData.blocks.length > (bioTokens.maxLines ?? 6) / 2

  return (
    <div style={{ fontFamily: 'var(--ai-font-body)', fontSize: 'var(--ai-size-body)' }}>
      {profile.short_bio && (
        <p
          className="text-lg leading-relaxed mb-6"
          style={{ color: 'var(--ai-color-textMuted)' }}
        >
          {profile.short_bio}
        </p>
      )}
      {bioData && (
        <>
          <div
            className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
            style={{ maxHeight: !isLong || expanded ? '9999px' : '16rem' }}
          >
            <BlockRenderer data={bioData} className="prose prose-sm max-w-none" />
          </div>
          {bioTokens.showReadMore !== false && isLong && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-4 text-sm font-semibold uppercase tracking-wider hover:underline"
              style={{ color: 'var(--ai-color-accent)' }}
            >
              Read more
            </button>
          )}
          {bioTokens.showReadMore !== false && isLong && expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-4 text-sm font-semibold uppercase tracking-wider hover:underline"
              style={{ color: 'var(--ai-color-accent)' }}
            >
              Read less
            </button>
          )}
        </>
      )}
    </div>
  )
}

function BioCentered({ profile }: AIBioProps) {
  return (
    <SectionWrapper>
      <div className="max-w-3xl mx-auto text-center">
        <BioContent profile={profile} />
      </div>
    </SectionWrapper>
  )
}

function BioSplitImage({ profile }: AIBioProps) {
  return (
    <SectionWrapper>
      <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
        {profile.profile_image_url && (
          <img
            src={profile.profile_image_url}
            alt={profile.display_name || 'Artist'}
            className="w-full aspect-square object-cover"
            style={{ borderRadius: 'var(--ai-radius-md)' }}
          />
        )}
        <BioContent profile={profile} />
      </div>
    </SectionWrapper>
  )
}

function BioFullWidth({ profile }: AIBioProps) {
  return (
    <SectionWrapper>
      <BioContent profile={profile} />
    </SectionWrapper>
  )
}

function BioSidebar({ profile }: AIBioProps) {
  return (
    <SectionWrapper>
      <div className="grid md:grid-cols-[1fr_250px] gap-8">
        <BioContent profile={profile} />
        <aside className="space-y-4">
          {profile.profile_image_url && (
            <img
              src={profile.profile_image_url}
              alt={profile.display_name || 'Artist'}
              className="w-full aspect-square object-cover"
              style={{ borderRadius: 'var(--ai-radius-md)' }}
            />
          )}
        </aside>
      </div>
    </SectionWrapper>
  )
}
