import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { guideSections } from '@/content/guide';

/**
 * The user guide. Content lives in src/content/guide.tsx as page code (no
 * markdown dependency); screenshots in public/guide, regenerated with
 * `pnpm --filter @gastapp/web guide:screenshots`.
 */
export function HelpPage() {
  const { hash } = useLocation();

  // Content renders synchronously, so the anchor exists by the time this runs.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="mx-auto flex max-w-5xl gap-8">
      <nav aria-label="Guide sections" className="sticky top-0 hidden h-fit w-52 shrink-0 lg:block">
        <p className="mb-2 text-xs uppercase tracking-widest text-pulse-faint">In this guide</p>
        <ul className="space-y-1">
          {guideSections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-2 py-1 text-sm text-pulse-dim hover:bg-pulse-glass hover:text-pulse-text"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 space-y-5">
        {guideSections.map((s) => (
          <Card key={s.id} className="p-5 md:p-6">
            <h2 id={s.id} className="mb-3 scroll-mt-6 text-lg font-bold text-pulse-text">{s.title}</h2>
            {s.body}
          </Card>
        ))}
      </div>
    </div>
  );
}
