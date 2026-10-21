import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL } from "@/lib/legal";

import { ContactEmail, LegalPage, type LegalSection } from "../legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The agreement for using mentorOS: who can use it, your work, fair use and the limits.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These terms are an agreement between you and {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;),
        who runs mentorOS. By creating an account or using mentorOS, you agree to them. If you don&apos;t
        agree, please don&apos;t use mentorOS. Our <Link href="/privacy">privacy policy</Link> explains how we
        handle your data.
      </p>
    ),
  },
  {
    id: "who",
    title: "Who can use mentorOS",
    body: (
      <p>
        You must be 16 or older. If you&apos;re under 18, you need a parent or guardian&apos;s permission.
        Keep your account to yourself: give accurate details, keep your password private, and tell us if you
        think someone else has used your account. One account per person.
      </p>
    ),
  },
  {
    id: "what",
    title: "What mentorOS does",
    body: (
      <p>
        mentorOS assesses what you can do, plans a path, gives you missions and grades the work you hand in.
        Assessments, missions, grades, feedback and skill estimates are produced by AI models and our own
        code. They&apos;re there to help you learn. They can be wrong, and they aren&apos;t qualifications,
        professional advice or a promise of any job or result.
      </p>
    ),
  },
  {
    id: "work",
    title: "Your work",
    body: (
      <>
        <p>
          You own what you write and hand in. You give us permission to store it, process it and send it to
          our service providers, including AI providers, to run mentorOS for you, as the privacy policy
          describes. That permission ends when your account is deleted, apart from copies in backups that
          expire on their own schedule.
        </p>
        <p>
          Only submit work you have the right to share. When you link a GitHub repository or gist, make sure
          it&apos;s public and that you&apos;re allowed to share it. Don&apos;t submit passwords, keys or
          other people&apos;s personal data.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <>
        <p>Please don&apos;t:</p>
        <ul>
          <li>break the law, or use mentorOS to harm anyone;</li>
          <li>try to get into accounts or data that aren&apos;t yours;</li>
          <li>attack, overload, scrape or reverse engineer the service, or get around its limits;</li>
          <li>use mentorOS to make malware or anything else designed to cause harm;</li>
          <li>share your account or resell access to it.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: "price",
    title: "Price",
    body: (
      <p>
        mentorOS is free right now. If we introduce paid plans, we&apos;ll tell you before anything changes,
        and we&apos;ll never charge you without your agreement.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Changes and availability",
    body: (
      <p>
        We&apos;re still building mentorOS, so features will change and the service may sometimes be
        unavailable. We may change or stop parts of it. If we shut mentorOS down, we&apos;ll give you notice
        and a way to get a copy of your data.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending things",
    body: (
      <p>
        You can stop using mentorOS at any time, and ask us to delete your account by emailing{" "}
        <ContactEmail />. We may suspend or close your account if you break these terms, and we&apos;ll tell
        you why unless the law prevents it.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        mentorOS is provided as it is. As far as the law allows, we don&apos;t promise that it will always be
        available or free of errors, or that any grade, estimate or piece of advice is accurate or right for
        your purpose.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        As far as the law allows, we aren&apos;t liable for indirect or consequential losses, or for lost
        profits, data or opportunities, arising from your use of mentorOS. Our total liability to you for any
        claim is limited to what you paid us for mentorOS in the 12 months before it arose. Nothing in these
        terms limits liability that the law doesn&apos;t allow us to limit.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        When we change these terms, we&apos;ll update the date at the top, and we&apos;ll email you about
        significant changes before they apply. If you keep using mentorOS after that, you accept the new
        terms.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria, and disputes will be settled
        by the courts of Nigeria. If you live somewhere whose consumer law gives you more protection, nothing
        here takes that away.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        {LEGAL.operator}, <ContactEmail />.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      summary={
        <>
          mentorOS is free while it&apos;s new, and your work stays yours. Grades and estimates come from AI
          and code, so they can be wrong. Don&apos;t misuse it, and either of us can end things at any time.
        </>
      }
      sections={sections}
    />
  );
}
