'use client'

import { useEffect, useState } from 'react'
import { cn } from '@decade/ui/lib/utils'

export interface GuideNavEntry {
  id: string
  title: string
}

/**
 * Sticky table-of-contents rail for the How-it-works page. Highlights the
 * section currently in view via an IntersectionObserver scroll-spy, and the
 * anchors jump to each section. Hidden below `lg` (the app is desktop-only).
 */
export function GuideNav({ sections }: { sections: GuideNavEntry[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (inView) setActive(inView.target.id)
      },
      // Trip the active section when its top reaches the upper third of the view.
      { rootMargin: '-15% 0px -70% 0px' },
    )
    for (const { id } of sections) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="On this page" className="sticky top-2 hidden h-fit lg:block">
      <p className="mb-3 pl-3 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {sections.map((section, i) => {
          const isActive = active === section.id
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  '-ml-px flex items-center gap-2.5 rounded-sm border-l-2 py-1.5 pl-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  isActive
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs',
                    isActive ? 'text-brand' : 'text-muted-foreground',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {section.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
