import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL } from "@/lib/legal";

import { ContactEmail, LegalPage, type LegalSection } from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What mentorOS collects, why, who processes it, and how to get it deleted.",
};

/**
 * Keep this true to what the code does. Adding a provider (analytics, error monitoring), a cookie or
 * a new kind of data means updating the matching section and LEGAL.updated.
 */
const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who runs mentorOS",
    body: (
      <p>
        mentorOS is run by {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide how your personal
        data is used, which makes us responsible for it. Questions, requests and complaints go to{" "}
        <ContactEmail />.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Account details.</strong> Your name and email address, and your password, which is stored
          only as a one-way hash. If you sign in with Google or GitHub, we receive your name, email address
          and profile picture from them.
        </li>
        <li>
          <strong>What you tell us when you start.</strong> Your goals, your experience and the technologies
          you know, how much time you have each week, and how you like to learn and be spoken to.
        </li>
        <li>
          <strong>Your work.</strong> Your answers to assessments and checks, the work you hand in for
          missions (including links to public GitHub repositories or gists, and the files we read from them),
          and your conversations with the mentor.
        </li>
        <li>
          <strong>What we work out from your work.</strong> Grades, feedback, skill estimates and the evidence
          behind them, your learning path and your missions.
        </li>
        <li>
          <strong>Email settings.</strong> Which optional emails you get, and when we last sent them.
        </li>
        <li>
          <strong>Technical information.</strong> Your time zone, kept in a cookie so dates show in your local
          time. Your IP address, which our hosting provider logs briefly and which we use, in a scrambled
          form, to limit repeated sign-in attempts.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <>
        <ul>
          <li>
            To run mentorOS: assess what you can do, plan your path, write missions, grade your work, keep
            your skill estimates, and let the mentor answer you.
          </li>
          <li>To send account emails, such as confirming your address or resetting your password.</li>
          <li>
            To send the weekly progress email and reminders, if you leave them on. You can turn them off in
            Settings or from the link in any of those emails.
          </li>
          <li>
            To keep the service and your account secure, for example by limiting repeated sign-in attempts.
          </li>
          <li>To find and fix problems.</li>
        </ul>
        <p>
          We rely on these grounds: providing the service you signed up for, our legitimate interest in
          keeping it secure and working, and your consent for the optional emails, which you can withdraw at
          any time.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI and your work",
    body: (
      <>
        <p>
          Your answers, hand-ins and mentor conversations, with the context needed to understand them (such as
          your skill estimates and path), are sent to OpenAI to grade your work, write missions and
          assessments, plan your path, and reply as your mentor. OpenAI processes this on our behalf, and its
          terms for this kind of use say it doesn&apos;t train its models on this data. The results are stored
          in mentorOS as part of your record.
        </p>
        <p>
          AI feedback can be wrong. Your record keeps the evidence behind every grade so it can be checked.
          Please don&apos;t put passwords, keys or other people&apos;s personal data in your answers or
          hand-ins.
        </p>
      </>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We don&apos;t sell your personal data, and we don&apos;t use it for advertising. We share it only
          with the services that run mentorOS for us, and only what each one needs:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong>, which hosts the app and its logs.
          </li>
          <li>
            <strong>Neon</strong>, which hosts the database.
          </li>
          <li>
            <strong>OpenAI</strong>, which provides the AI models (see section 4).
          </li>
          <li>
            <strong>Resend</strong>, which sends our emails.
          </li>
          <li>
            <strong>Google</strong> or <strong>GitHub</strong>, only if you choose to sign in with them.
          </li>
          <li>
            <strong>GitHub</strong>, when it serves the public files you link in a hand-in.
          </li>
        </ul>
        <p>
          We may also disclose data if the law requires it, or to protect the safety of our users or the
          service.
        </p>
      </>
    ),
  },
  {
    id: "where",
    title: "Where it's stored",
    body: (
      <p>
        Our providers run data centres in several countries, including the United States, so your data may be
        stored or processed outside the country you live in. We rely on our providers&apos; contractual
        safeguards for these transfers.
      </p>
    ),
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: (
      <p>
        We keep your account and learning record for as long as your account exists, because the record is
        what the mentor teaches from. When you ask us to delete your account, we delete your data within 30
        days, apart from anything the law requires us to keep. Copies in our providers&apos; backups and logs
        expire on their own schedules after that.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>You can ask us to:</p>
        <ul>
          <li>give you a copy of your data;</li>
          <li>correct anything that&apos;s wrong;</li>
          <li>delete your account and data;</li>
          <li>stop or limit how we use your data, or object to it;</li>
          <li>send your data to you in a format you can take elsewhere.</li>
        </ul>
        <p>
          You can change your name, email choices and learning settings yourself in Settings. For anything
          else, email <ContactEmail /> and we&apos;ll answer within 30 days. If you&apos;re unhappy with our
          answer, you can complain to the Nigeria Data Protection Commission, or to the data protection
          authority where you live.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        mentorOS uses only the cookies it needs to work: one that keeps you signed in, and one that remembers
        your time zone. We don&apos;t use advertising or tracking cookies.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Connections to mentorOS are encrypted, passwords are stored only as hashes, and access to the database
        is restricted. No system is perfectly secure. If a breach affects your data, we&apos;ll tell you and
        the relevant authorities as the law requires.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        mentorOS is for people aged 16 and over. If you&apos;re under 18, use it only with a parent or
        guardian&apos;s permission. If you think a child under 16 has given us data, email us and we&apos;ll
        delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        When we change this policy, we&apos;ll update the date at the top. For significant changes, we&apos;ll
        email you before they take effect. The <Link href="/terms">terms of service</Link> cover the rest of
        how mentorOS works.
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

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      summary={
        <>
          your work is used to teach you, and for nothing else. No ads, no selling your data, no tracking you
          around the web. Ask, and it&apos;s all deleted.
        </>
      }
      sections={sections}
    />
  );
}
