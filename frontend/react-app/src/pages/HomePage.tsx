import type { FC } from 'react'
import { HomeNav } from '../components/home/HomeNav'
import { HeroSection } from '../components/home/HeroSection'
import { FeatureStrip } from '../components/home/FeatureStrip'
import { LivePreviewPanel } from '../components/home/LivePreviewPanel'
import { HomeFooter } from '../components/home/HomeFooter'

const HomePage: FC = () => (
  <div className="min-h-screen">
    <HomeNav />
    <HeroSection />
    <FeatureStrip />
    <LivePreviewPanel />
    <HomeFooter />
  </div>
)

export default HomePage
