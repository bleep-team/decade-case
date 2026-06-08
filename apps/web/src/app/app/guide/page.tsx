import type { Metadata } from 'next'
import { GuideView } from '@/components/guide/guide-view'

export const metadata: Metadata = {
  title: 'How it works — Decade Exchange',
  description: 'A guided tour of the exchange and how to try each capability.',
}

export default function GuidePage() {
  return <GuideView />
}
