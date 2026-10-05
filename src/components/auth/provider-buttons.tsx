import { siGithub, siGoogle } from "simple-icons";

import { socialSignInAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/form/submit-button";
import type { SocialProvider } from "@/lib/auth";

const brands = {
  github: { label: "GitHub", path: siGithub.path },
  google: { label: "Google", path: siGoogle.path },
} satisfies Record<SocialProvider, { label: string; path: string }>;

/** One button per configured provider, then a divider. Renders nothing when none are set up. */
export function ProviderButtons({ providers, next }: { providers: readonly SocialProvider[]; next: string }) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((provider) => (
        <form key={provider} action={socialSignInAction}>
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="next" value={next} />
          <SubmitButton variant="secondary" size="lg" className="w-full">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4.5">
              <path d={brands[provider].path} />
            </svg>
            Continue with {brands[provider].label}
          </SubmitButton>
        </form>
      ))}
      <div className="my-3 flex items-center gap-3 text-footnote text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-rule" />
        or use email
        <span className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}
