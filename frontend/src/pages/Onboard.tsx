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
        title: "Identity verified",
        description: "Your account is now verified.",
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
          description="We'll confirm your identity verification status."
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

  // No verification yet — show the generate flow
  if (apassNotFound || !apass) {
    return (
      <Page>
        <PageHeader
          eyebrow="Onboarding"
          title="Verify your identity"
          description="AjoCred uses secure identity verification to confirm you're a real, eligible person without exposing your private details."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">How does verification work?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Verification is a one-time check that proves you meet basic security and regulatory
                  requirements without revealing your personal details to others or to AjoCred.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>One-time check; no recurring paperwork</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>Your personal details stay private</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>Unlocks credit access across AjoCred</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col justify-center space-y-6">
              <div>
                <h3 className="font-display text-xl font-semibold">Ready to verify?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click below to verify your account identity. The process takes just a few seconds.
                </p>
              </div>

              <Button
                size="lg"
                onClick={handleGenerate}
                loading={generate.isPending}
                disabled={!address}
              >
                Verify Identity
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

  const compliant = verify?.valid ?? false;

  return (
    <Page>
      <PageHeader eyebrow="Onboarding" title="Verification status" />
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
                  {compliant ? "Verified" : "Pending"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {compliant
                  ? "Your account identity is verified and active. You can now borrow from your cooperative."
                  : "Your verification is pending or requires attention. Try refreshing or contact support if this persists."}
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
