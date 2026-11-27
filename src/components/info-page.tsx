// Shared frame for text pages (policies, guides). `draft` shows a notice that the wording still
// needs checking by the owner, which is required for legal pages until they have been reviewed.
export function InfoPage({ title, intro, draft, children }: { title: string; intro?: string; draft?: boolean; children: React.ReactNode }) {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
      {draft && (
        <p role="note" className="mt-4 rounded-md border border-line bg-warn-bg px-4 py-3 text-sm text-warn">
          Draft: this page has not been checked yet. Text in [square brackets] still needs filling in.
        </p>
      )}
      <div className="mt-6 grid gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:grid [&_ul]:gap-1">
        {children}
      </div>
    </article>
  );
}
