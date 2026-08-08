import { BadgeCheck, LineChart, Landmark } from "lucide-react";

const STEPS = [
  {
    icon: BadgeCheck,
    title: "Verify with an A-Pass",
    body: "Connect your wallet and confirm a Cleanverse A-Pass. It proves you're a real, compliant person without exposing your identity on-chain.",
  },
  {
    icon: LineChart,
    title: "We read your inflows",
    body: "AjoCred queries six months of verified inbound remittances and computes a borrowing limit from your actual received volume.",
  },
  {
    icon: Landmark,
    title: "Borrow and repay",
    body: "Draw up to your limit from the shared pool whenever you need it, then repay over time. No collateral is ever locked.",
  },
];

export function StepList() {
  return (
    <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-card text-primary">
              <step.icon className="size-5" />
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
