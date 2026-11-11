import { Hammer } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader, type BreadcrumbItem } from "@/components/common/PageHeader";

interface ScaffoldPageProps {
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  owner?: string;
}

/**
 * Placeholder page for routes whose feature owner has not built them yet.
 *
 * It deliberately renders a real header plus an empty state instead of fake
 * functionality, so the route, layout and navigation are verifiable now and
 * the assigned developer only has to replace this component.
 */
export function ScaffoldPage({
  title,
  description,
  breadcrumbs,
  owner,
}: ScaffoldPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <EmptyState
        icon={Hammer}
        title="Starter page — ready for implementation"
        description={
          owner
            ? `${owner} owns this screen. Build the feature here following COMPONENT_GUIDELINES.md.`
            : "The assigned developer builds this screen here."
        }
      />
    </div>
  );
}
