import { PipSays } from "@/components/brand/pip";
import { LEGAL } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

/**
 * A legal page: the title and date, Pip's plain-language summary, a table of contents that stays in
 * view on wide screens, and numbered sections with anchors, so any section can be linked to.
 */
export function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-6 pb-20 sm:px-8 lg:pt-10">
      <header className="max-w-3xl lg:ml-[18rem]">
        <h1 className="text-display md:text-5xl">{title}</h1>
        <p className="mt-2 text-footnote text-muted-foreground">Last updated {LEGAL.updated}</p>
        <PipSays size={60} className="mt-7">
          <strong className="font-semibold">The short version:</strong> {summary}
        </PipSays>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="text-footnote lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2.5 font-semibold">On this page</p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="max-w-3xl">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="mt-10 scroll-mt-8 first:mt-0">
              <h2 className="text-title">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-3 text-body [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-1.5 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

/** The contact address as a mailto link, so every mention of it can be clicked. */
export function ContactEmail() {
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}
