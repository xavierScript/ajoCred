import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/StateViews";

/**
 * Shown on the dashboard and borrow screens when the member hasn't joined a
 * cooperative yet. Everything downstream is scoped to a cooperative, so we
 * point them at the browse page before anything else can load.
 */
export function SelectCoopPrompt({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Page>
      <PageHeader eyebrow="Get started" title={title} />
      <Card>
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="Join a cooperative first"
          description={description}
          action={
            <Button asChild>
              <Link to="/cooperatives">Browse cooperatives</Link>
            </Button>
          }
        />
      </Card>
    </Page>
  );
}
