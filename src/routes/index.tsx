import { createFileRoute } from '@tanstack/react-router'
import { Nav } from '~/components/Nav'
import { Hero } from '~/components/Hero'
import { Bio } from '~/components/Bio'
import { Highlights } from '~/components/Highlights'
import { Events } from '~/components/Events'
import { TechnicalRider } from '~/components/TechnicalRider'
import { PressAssets } from '~/components/PressAssets'
import { Contact } from '~/components/Contact'
import { Footer } from '~/components/Footer'
import { FadeIn } from '~/components/FadeIn'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <FadeIn>
          <Bio />
        </FadeIn>
        <FadeIn>
          <Highlights />
        </FadeIn>
        <FadeIn>
          <Events />
        </FadeIn>
        <FadeIn>
          <TechnicalRider />
        </FadeIn>
        <FadeIn>
          <PressAssets />
        </FadeIn>
        <FadeIn>
          <Contact />
        </FadeIn>
      </main>
      <Footer />
    </>
  )
}
