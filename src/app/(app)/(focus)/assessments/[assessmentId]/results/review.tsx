import { Check, ChevronRight, CircleHelp, Minus, X } from "lucide-react";

import { CodeBlock, RichText } from "@/components/system/rich-text";
import { confidenceCaption, SkillRow } from "@/components/system/skill-row";
import { Badge } from "@/components/ui/badge";
import { itemTypeLabel } from "@/lib/assessment-labels";
import { cn } from "@/lib/utils";
import type { ItemGrade } from "@/server/learning/grading";
import type { AssessmentReview } from "@/server/queries/assessments";

type Answer = AssessmentReview["answers"][number];
type MeasuredSkill = AssessmentReview["skills"][number];

type Outcome = "right" | "partly" | "missed" | "unknown" | "blank";

/** How an answer reads to the learner. Quality, not difficulty: a right answer is right. */
function outcomeOf(grade: ItemGrade): Outcome {
  if (grade.answer === "unknown") return "unknown";
  if (grade.answer === "blank") return "blank";
  if (grade.verdict === "strong" || grade.verdict === "pass") return "right";
  return grade.verdict === "partial" ? "partly" : "missed";
}

const OUTCOME_BADGE = {
  right: { label: "Right", variant: "pass", icon: Check },
  partly: { label: "Partly right", variant: "partial", icon: Minus },
  missed: { label: "Missed", variant: "fail", icon: X },
  unknown: { label: "Didn’t know", variant: "neutral", icon: CircleHelp },
  blank: { label: "No answer", variant: "neutral", icon: Minus },
} as const;

/**
 * Every answer as one cell, in the order asked. Questions get harder left to right, so the shape
 * of the strip says where the learner's ceiling is before any number does.
 */
export function AnswerStrip({ answers }: { answers: Answer[] }) {
  const outcomes = answers.map((answer) => outcomeOf(answer.grade));
  const right = outcomes.filter((o) => o === "right").length;
  const partly = outcomes.filter((o) => o === "partly").length;
  const missed = outcomes.length - right - partly;

  return (
    <div className="rounded-lg border border-rule bg-window p-4 shadow-window">
      <div
        role="img"
        aria-label={`${right} right, ${partly} partly right, ${missed} missed or not answered`}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${answers.length}, minmax(0, 1fr))` }}
      >
        {outcomes.map((outcome, index) => (
          <span key={index} className={cn("h-7 rounded-xs", cellClass(outcome))} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-caption text-muted-foreground">
        <span>Easier</span>
        <span>Harder</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-rule pt-3 text-footnote">
        <LegendItem outcome="right" text={`${right} right`} />
        <LegendItem outcome="partly" text={`${partly} partly right`} />
        <LegendItem outcome="missed" text={`${missed} missed or not answered`} />
      </ul>
    </div>
  );
}

function cellClass(outcome: Outcome) {
  if (outcome === "right") return "bg-foreground";
  if (outcome === "partly") return "border border-foreground bg-hatch text-foreground";
  return "border border-rule-strong";
}

function LegendItem({ outcome, text }: { outcome: Outcome; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn("size-3 rounded-[2px]", cellClass(outcome))} />
      {text}
    </li>
  );
}

/** The skills this assessment measured, strongest first, each meter filling in turn. */
export function SkillList({ skills }: { skills: MeasuredSkill[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {skills.map((skill, index) => (
        <li key={skill.id}>
          <SkillRow
            name={skill.name}
            estimate={skill}
            href={`/profile/skills/${skill.slug}`}
            caption={confidenceCaption(skill, { one: "answer", many: "answers" })}
            animate
            delay={160 + index * 70}
          />
        </li>
      ))}
    </ul>
  );
}

/** Specific misunderstandings the grader named. These are what the path should fix first. */
export function Misconceptions({ answers }: { answers: Answer[] }) {
  const noted = answers.filter((answer) => answer.grade.misconception);
  if (noted.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2.5">
      {noted.map((answer) => (
        <li key={answer.itemId} className="rounded-lg border border-rule bg-window p-4">
          <p className="text-callout">{answer.grade.misconception}</p>
          <a
            href={`#answer-${answer.number}`}
            className="mt-1.5 inline-block text-footnote text-muted-foreground underline decoration-rule-strong underline-offset-4 hover:text-foreground"
          >
            From question {answer.number}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Each question with the learner's answer, the grade, and what a strong answer covers. */
export function AnswerList({ answers }: { answers: Answer[] }) {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {answers.map((answer) => {
        const outcome = outcomeOf(answer.grade);
        const badge = OUTCOME_BADGE[outcome];
        return (
          <li key={answer.itemId} id={`answer-${answer.number}`} className="scroll-mt-16">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 py-3.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <span className="w-5 shrink-0 pt-px font-mono text-footnote text-muted-foreground tabular-nums">
                  {answer.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-footnote text-muted-foreground">{itemTypeLabel(answer.type)}</span>
                    <Badge variant={badge.variant}>
                      <badge.icon aria-hidden />
                      {badge.label}
                    </Badge>
                  </span>
                  <span className="mt-1 line-clamp-2 text-callout group-open:line-clamp-none">
                    <RichText text={answer.prompt.question} />
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="mt-0.5 size-4.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="flex flex-col gap-4 pb-5 pl-8">
                {answer.prompt.code ? <CodeBlock code={answer.prompt.code} /> : null}
                <AnswerReview answer={answer} outcome={outcome} />
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function AnswerReview({ answer, outcome }: { answer: Answer; outcome: Outcome }) {
  const { prompt, response, correctOption } = answer;

  if (prompt.options && correctOption !== null) {
    const chosen = response?.kind === "choice" ? response.option : null;
    return (
      <div className="flex flex-col gap-2">
        {prompt.options.map((option, index) => {
          const isKey = index === correctOption;
          const isChosen = index === chosen;
          if (!isKey && !isChosen) return null;
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3.5 py-3",
                isKey ? "border-pass/40 bg-pass/10" : "border-fail/40 bg-fail/10",
              )}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-rule-strong bg-window font-mono text-caption font-semibold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1 text-callout">
                <RichText text={option} />
                <span className="mt-0.5 block text-footnote text-muted-foreground">
                  {isChosen ? "Your answer" : "Right answer"}
                </span>
              </span>
              {isKey ? (
                <Check className="mt-0.5 size-5 shrink-0 text-pass" aria-label="Right" />
              ) : (
                <X className="mt-0.5 size-5 shrink-0 text-fail" aria-label="Wrong" />
              )}
            </div>
          );
        })}
        {chosen === null ? (
          <p className="text-footnote text-muted-foreground">
            {outcome === "unknown" ? "You said you didn’t know." : "You didn’t answer this one."}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ReviewBlock title="Your answer">
        {response?.kind === "text" && response.text.trim() ? (
          <p className="text-callout whitespace-pre-line text-muted-foreground">{response.text.trim()}</p>
        ) : (
          <p className="text-callout text-muted-foreground">
            {outcome === "unknown" ? "You said you didn’t know." : "You didn’t answer this one."}
          </p>
        )}
      </ReviewBlock>
      {answer.grade.feedback ? (
        <ReviewBlock title="Feedback">
          <p className="text-callout">{answer.grade.feedback}</p>
        </ReviewBlock>
      ) : null}
      <ReviewBlock title="A strong answer covers">
        <p className="text-callout">
          <RichText text={answer.expected} />
        </p>
      </ReviewBlock>
    </>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-footnote font-semibold">{title}</h3>
      {children}
    </section>
  );
}
