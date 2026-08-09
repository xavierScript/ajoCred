import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { ArrowRight, ShieldCheck, HandCoins, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { StepList } from "@/components/landing/StepList";
import { useVerify } from "@/hooks/useBackend";

export function LandingPage() {
  const { address, isConnected } = useAccount();
  const verify = useVerify(address);

  const isUnverified = isConnected && !verify.isLoading && verify.data && !verify.data.valid;
  const primaryHref = !isConnected || isUnverified ? "/onboard" : "/dashboard";
  const primaryLabel = !isConnected
    ? "Check your limit"
    : isUnverified
    ? "Verify your identity"
    : "Go to dashboard";

  const adminUrl = import.meta.env.VITE_ADMIN_URL || "#";

  return (
    <>
      {/* Hero — asymmetric: message-heavy left, live-preview right. */}
      <section className="container mx-auto grid items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-24">
        <div className="max-w-xl">
          <Badge tone="primary" className="mb-5">
            Collateral-free credit
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Your money history is your credit score.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Millions receiving money from family abroad have no formal credit
            score. AjoCred reads your verified money receipts and turns that
            track record into a borrowing limit — no collateral, no paperwork.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={primaryHref}>
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={adminUrl} target={adminUrl !== "#" ? "_blank" : undefined} rel="noreferrer">
                I represent a cooperative
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Verified identity · Zero paperwork · Instant access
          </p>
        </div>
        <HeroPreview />
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/40">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              From receipts to a credit line
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your limit is computed from real, verified money flows — not a
              guess, and not funds you have to lock up first.
            </p>
          </div>
          <StepList />
        </div>
      </section>

      {/* Two audiences */}
      <section className="container mx-auto grid gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-20">
        <AudienceCard
          icon={<HandCoins className="size-5" />}
          eyebrow="Remittance Recipients"
          title="Borrow against your track record"
          points={[
            "Verify your identity once — fast, private, and simple.",
            "We check your history of receiving money to set a fair limit.",
            "Choose a cooperative, borrow when needed, and repay on time.",
          ]}
          href={primaryHref}
          cta={primaryLabel}
          isExternal={false}
        />
        <AudienceCard
          icon={<Building2 className="size-5" />}
          eyebrow="Cooperative Admins"
          title="Launch credit for your members"
          points={[
            "Fund a credit pool for your verified community members.",
            "Set custom borrowing caps and risk tier thresholds.",
            "Earn returns as members draw and repay their loans.",
          ]}
          href={adminUrl}
          cta="Cooperative Portal"
          isExternal={true}
        />
      </section>
    </>
  );
}

function AudienceCard({
  icon,
  eyebrow,
  title,
  points,
  href,
  cta,
  isExternal,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  points: string[];
  href: string;
  cta: string;
  isExternal: boolean;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <ul className="mt-4 flex-1 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button asChild variant="outline">
          {isExternal ? (
            <a href={href} target={href !== "#" ? "_blank" : undefined} rel="noreferrer">
              {cta}
              <ExternalLink className="size-4" />
            </a>
          ) : (
            <Link to={href}>
              {cta}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}
