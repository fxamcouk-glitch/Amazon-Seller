import { CHANNELS } from "@/lib/types";
import { formatPounds } from "@/lib/stats";

type Day = { date: string; byChannel: Record<string, number> };

// Stacked daily revenue bars. Each bar has a text alternative; the table below the
// chart on the overview page carries the same numbers by channel.
export function RevenueChart({ days }: { days: Day[] }) {
  const totals = days.map((d) => Object.values(d.byChannel).reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-4 text-sm">
        {CHANNELS.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm" style={{ background: `var(--color-${c.id})` }} />
            {c.label}
          </span>
        ))}
      </figcaption>
      <ul className="flex h-40 items-end gap-1" aria-label="Daily revenue by channel">
        {days.map((d, i) => (
          <li
            key={d.date}
            className="flex h-full min-w-0 flex-1 flex-col-reverse"
            aria-label={`${d.date}: ${formatPounds(totals[i])}`}
            title={`${d.date}: ${formatPounds(totals[i])}`}
          >
            {CHANNELS.map((c) => (
              <span
                key={c.id}
                style={{
                  height: `${((d.byChannel[c.id] ?? 0) / max) * 100}%`,
                  background: `var(--color-${c.id})`,
                }}
              />
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-1 flex justify-between text-xs text-muted">
        <span>{days[0]?.date}</span>
        <span>{days.at(-1)?.date}</span>
      </p>
    </figure>
  );
}
