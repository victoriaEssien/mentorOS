type PagePlaceholderProps = {
  title: string;
  /** PRD sections this page implements. */
  prd: string;
  /** What this page needs to answer or let the learner do. */
  purpose: string;
  todo?: string[];
};

/** Temporary scaffold shown until a page is built. Delete once the real page exists. */
export function PagePlaceholder({ title, prd, purpose, todo = [] }: PagePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 p-8">
      <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{prd}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{purpose}</p>
      {todo.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {todo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
