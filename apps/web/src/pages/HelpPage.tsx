import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { useThemeStore } from '@/stores/theme-store';

/**
 * The user guide. Each section is a markdown file in src/content/guide, read
 * in file-name order. Screenshots live in public/guide as <name>-light.png and
 * <name>-dark.png and are referenced in markdown as /guide/<name>.png; the page
 * shows the variant matching the current theme. Regenerate them with
 * `pnpm --filter @gastapp/web guide:screenshots`.
 */
const files = import.meta.glob<string>('../content/guide/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : '';

const sections = Object.keys(files)
  .sort()
  .map((path) => {
    const markdown = files[path]!;
    const title = /^## (.+)$/m.exec(markdown)?.[1]?.trim() ?? path;
    return { id: slugify(title), title, markdown };
  });

function components(theme: 'dark' | 'light'): Components {
  return {
    h2: ({ children }) => (
      <h2 id={slugify(textOf(children))} className="mb-3 scroll-mt-6 text-lg font-bold text-pulse-text">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 id={slugify(textOf(children))} className="mb-2 mt-6 scroll-mt-6 text-sm font-semibold text-pulse-text">
        {children}
      </h3>
    ),
    p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-pulse-dim">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-pulse-text">{children}</strong>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm text-pulse-dim">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-pulse-dim">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => {
      const external = Boolean(href && /^https?:/.test(href));
      return (
        <a
          href={href}
          className="font-medium text-pulse-v2 hover:underline"
          {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {children}
        </a>
      );
    },
    table: ({ children }) => (
      <div className="mb-4 overflow-x-auto rounded-xl border border-pulse-stroke">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-pulse-glass-hi text-xs text-pulse-faint">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t border-pulse-stroke px-3 py-2 align-top text-pulse-dim">{children}</td>,
    img: ({ src, alt }) => (
      <img
        // "/guide/x.png" → "/guide/x-dark.png" or "/guide/x-light.png".
        src={typeof src === 'string' ? src.replace(/\.png$/, `-${theme}.png`) : undefined}
        alt={alt ?? ''}
        loading="lazy"
        className="my-4 w-full rounded-xl border border-pulse-stroke"
      />
    ),
  };
}

export function HelpPage() {
  const { theme } = useThemeStore();
  const { hash } = useLocation();

  // Content renders synchronously, so the anchor exists by the time this runs.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const md = components(theme);

  return (
    <div className="mx-auto flex max-w-5xl gap-8">
      <nav aria-label="Guide sections" className="sticky top-0 hidden h-fit w-52 shrink-0 lg:block">
        <p className="mb-2 text-xs uppercase tracking-widest text-pulse-faint">In this guide</p>
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-lg px-2 py-1 text-sm text-pulse-dim hover:bg-pulse-glass hover:text-pulse-text">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 space-y-5">
        {sections.map((s) => (
          <Card key={s.id} className="p-5 md:p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
              {s.markdown}
            </ReactMarkdown>
          </Card>
        ))}
      </div>
    </div>
  );
}
