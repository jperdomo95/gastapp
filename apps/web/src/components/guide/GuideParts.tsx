import type { ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme-store';

/** Building blocks for the user guide (src/content/guide.tsx), styled like the app. */

export const H3 = ({ id, children }: { id?: string; children: ReactNode }) => (
  <h3 id={id} className="mb-2 mt-6 scroll-mt-6 text-sm font-semibold text-pulse-text">{children}</h3>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p className="mb-3 text-sm leading-relaxed text-pulse-dim">{children}</p>
);

export const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-pulse-text">{children}</strong>
);

/** A link to another section of the guide. */
export const Ref = ({ to, children }: { to: string; children: ReactNode }) => (
  <a href={`#${to}`} className="font-medium text-pulse-v2 hover:underline">{children}</a>
);

export const Ul = ({ children }: { children: ReactNode }) => (
  <ul className="mb-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-pulse-dim">{children}</ul>
);

export const Ol = ({ children }: { children: ReactNode }) => (
  <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-pulse-dim">{children}</ol>
);

export function Table({ head, rows }: { head: [string, string]; rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-pulse-stroke">
      <table className="w-full text-left text-sm">
        <thead className="bg-pulse-glass-hi text-xs text-pulse-faint">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i}>
              <td className="w-1/3 border-t border-pulse-stroke px-3 py-2 align-top font-medium text-pulse-text">{a}</td>
              <td className="border-t border-pulse-stroke px-3 py-2 align-top text-pulse-dim">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A screenshot from public/guide, in the variant matching the current theme:
 * <name>-light.png or <name>-dark.png. Regenerate them all with
 * `pnpm --filter @gastapp/web guide:screenshots`.
 */
export function Shot({ name, alt }: { name: string; alt: string }) {
  const { theme } = useThemeStore();
  return (
    <img
      src={`/guide/${name}-${theme}.png`}
      alt={alt}
      loading="lazy"
      className="my-4 w-full rounded-xl border border-pulse-stroke"
    />
  );
}
