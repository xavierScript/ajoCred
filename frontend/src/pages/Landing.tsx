import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { ArrowRight, ShieldCheck, HandCoins, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { StepList } from "@/components/landing/StepList";

export function LandingPage() {
  const { isConnected } = useAccount();
  const primaryHref = isConnected ? "/dashboard" : "/onboard";

  return (
    <>
      {/* Hero — asymmetric: message-heavy left, live-preview right. */}
      <section className="container mx-auto grid items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-24">
        <div className="max-w-xl">
          <Badge tone="primary" className="mb-5">
            Collateral-free credit on Base
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Your remittance history is your credit history.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Millions receiving money from family abroad have no formal credit
            score. AjoCred reads your verified inbound remittances and turns that
            track record into a borrowing limit — no collateral, no paperwork.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={primaryHref}>
                {isConnected ? "Go to dashboard" : "Check your limit"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/deposit">Provide liquidity</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Base Sepolia testnet · verified via Cleanverse A-Pass
          </p>
        </div>
        <HeroPreview />
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/40">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              From remittance receipts to a credit line
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your limit is computed from real, verified money flows — not a
              guess, and not a deposit you have to lock up first.
            </p>
          </div>
          <StepList />
        </div>
      </section>

      {/* Two audiences */}
      <section className="container mx-auto grid gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-20">
        <AudienceCard
          icon={<HandCoins className="size-5" />}
          eyebrow="Borrowers"
          title="Borrow against your track record"
          points={[
            "Verify once with an A-Pass — your identity stays private.",
            "We read six months of inbound remittances to set a fair cap.",
            "Draw funds when you need them, repay on your schedule.",
          ]}
          href="/onboard"
          cta="Check your limit"
        />
        <AudienceCard
          icon={<Users className="size-5" />}
          eyebrow="Liquidity providers"
          title="Fund credit that reaches real people"
          points={[
            "Deposit aUSDC into a compliance-gated pool.",
            "Every borrower is A-Pass verified before they can draw.",
            "Withdraw available liquidity at any time.",
          ]}
          href="/deposit"
          cta="Provide liquidity"
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
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  points: string[];
  href: string;
  cta: string;
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
          <Link to={href}>
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
