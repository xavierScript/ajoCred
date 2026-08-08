import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/StateViews";
import { useToast } from "@/components/ui/Toast";
import { useApass, useGenerateApass, useVerify } from "@/hooks/useBackend";
import { humanizeError } from "@/lib/utils";

export function OnboardPage() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: apass,
    isLoading: apassLoading,
    notFound: apassNotFound,
    error: apassError,
    refetch: refetchApass,
  } = useApass(address);

  const {
    data: verify,
    isLoading: verifyLoading,
    error: verifyError,
  } = useVerify(address);

  const generate = useGenerateApass();

  // If they already have a valid A-Pass and pass the compliance check, send them on.
  useEffect(() => {
    if (apass && verify?.valid) {
      navigate("/dashboard", { replace: true });
    }
  }, [apass, verify, navigate]);

  const handleGenerate = async () => {
    if (!address) return;

    try {
      await generate.mutateAsync(address);
      toast({
        tone: "success",
        title: "A-Pass created",
        description: "Your identity has been verified.",
      });
      // Refetch to pick up the new pass
      await refetchApass();
    } catch (err) {
      toast({ tone: "error", title: "Verification failed", description: humanizeError(err) });
    }
  };

  // Loading initial state
  if (apassLoading || verifyLoading) {
    return (
      <Page>
        <PageHeader
          eyebrow="Onboarding"
          title="Verify your identity"
          description="We'll check your compliance status with an A-Pass from Cleanverse."
        />
        <Card>
          <CardBody className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardBody>
        </Card>
      </Page>
    );
  }

  // Error fetching current status
  if ((apassError && !apassNotFound) || verifyError) {
    return (
      <Page>
        <PageHeader eyebrow="Onboarding" title="Verify your identity" />
        <ErrorState
          message={humanizeError(apassError || verifyError)}
          onRetry={() => {
            refetchApass();
          }}
        />
      </Page>
    );
  }

  // No A-Pass yet — show the generate flow
  if (apassNotFound || !apass) {
    return (
      <Page>
        <PageHeader
          eyebrow="Onboarding"
          title="Verify your identity"
          description="AjoCred uses Cleanverse A-Pass to confirm you're a real, compliant person without exposing your identity on-chain."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">What is an A-Pass?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  An A-Pass is a one-time identity verification from Cleanverse. It proves you meet
                  compliance requirements (KYC/AML) without revealing your personal details to the
                  blockchain or to AjoCred.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>One-time verification; no recurring checks</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>Your identity stays private</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>Valid across all AjoCred interactions</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col justify-center space-y-6">
              <div>
                <h3 className="font-display text-xl font-semibold">Ready to verify?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click below to generate your A-Pass. The process is handled by Cleanverse and
                  takes a few seconds.
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleGenerate}
                loading={generate.isPending}
                disabled={!address}
              >
                Generate A-Pass
              </Button>

              {generate.isError && (
                <div className="flex gap-3 rounded-md border border-destructive/20 bg-destructive/5 p-4">
                  <AlertCircle className="size-5 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-destructive">Verification failed</p>
                    <p className="mt-1 text-sm text-destructive/80">
                      {humanizeError(generate.error)}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Page>
    );
  }

  // Has an A-Pass but the compliance check didn't pass (edge case: pass exists but
  // the validator rejects). Rare, but surface it rather than looping on the redirect.
  const compliant = verify?.valid ?? false;

  return (
    <Page>
      <PageHeader eyebrow="Onboarding" title="A-Pass status" />
      <Card>
        <CardBody className="space-y-6">
          <div className="flex items-start gap-4">
            <div
              className={
                compliant
                  ? "flex size-12 items-center justify-center rounded-full bg-success/10 text-success"
                  : "flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning"
              }
            >
              {compliant ? (
                <CheckCircle2 className="size-6" />
              ) : (
                <AlertCircle className="size-6" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold">
                  {compliant ? "You're verified" : "Verification pending"}
                </h3>
                <Badge tone={compliant ? "success" : "warning"} dot>
                  {compliant ? "Compliant" : "Not compliant"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {compliant
                  ? "Your A-Pass is active and you meet all compliance requirements. You can now borrow from the AjoCred pool."
                  : "Your A-Pass exists but the compliance check did not pass. This may be temporary — try refreshing or contact support if the issue persists."}
              </p>
            </div>
          </div>

          {compliant && (
            <div className="flex gap-3 border-t border-border pt-6">
              <Button asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
