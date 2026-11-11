import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/format";

import {
  fullName,
  reportOpportunity,
  reviewProfessional,
  setProfessionalAccountStatus,
  useWorkforce,
} from "./store";
import { PROFESSIONAL_CATEGORY_LABELS } from "./types";

export function AdminWorkforcePage() {
  const { state } = useWorkforce();
  const [tab, setTab] = useState<"professionals" | "employers" | "listings">("professionals");

  const pending = state.professionals.filter((person) => person.verificationStatus === "PENDING");
  const activeListings = state.opportunities.filter((item) => item.status === "PUBLISHED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce marketplace"
        description="Review professional accounts, hospital participation and live opportunities across MyHealth Workforce."
        actions={
          <div className="border-input flex rounded-md border p-0.5">
            {(
              [
                ["professionals", "Professionals"],
                ["employers", "Employers"],
                ["listings", "Listings"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={tab === value ? "default" : "ghost"}
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Professionals" value={state.professionals.length} icon={UsersRound} hint={`${pending.length} awaiting verification`} />
        <StatCard label="Employers" value={state.employers.length} icon={Building2} tone="sky" hint="Verified hospital accounts" />
        <StatCard label="Active opportunities" value={activeListings.length} icon={BriefcaseBusiness} tone="violet" />
        <StatCard label="Applications" value={state.applications.length} icon={ClipboardList} tone="amber" />
      </div>

      {tab === "professionals" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional accounts and credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professional</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.professionals.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{fullName(person)}</p>
                      <p className="text-muted-foreground text-xs">{person.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {PROFESSIONAL_CATEGORY_LABELS[person.category]}
                    </TableCell>
                    <TableCell className="text-sm">{person.yearsExperience} years</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(person.createdAt.slice(0, 10))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            person.verificationStatus === "VERIFIED"
                              ? "secondary"
                              : person.verificationStatus === "REJECTED"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {person.verificationStatus.toLowerCase()}
                        </Badge>
                        {person.status === "SUSPENDED" && (
                          <Badge variant="outline">suspended</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {person.verificationStatus !== "VERIFIED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              reviewProfessional(person.id, "VERIFIED");
                              toast.success("Credentials verified.");
                            }}
                          >
                            <BadgeCheck className="size-4" />
                            Verify
                          </Button>
                        )}
                        {person.verificationStatus === "PENDING" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              reviewProfessional(person.id, "REJECTED");
                              toast.success("Credential review updated.");
                            }}
                          >
                            Needs attention
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={person.status === "SUSPENDED" ? "ghost" : "destructive"}
                          onClick={() => {
                            setProfessionalAccountStatus(
                              person.id,
                              person.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                            );
                            toast.success(
                              person.status === "SUSPENDED"
                                ? "Account restored."
                                : "Account suspended.",
                            );
                          }}
                        >
                          {person.status === "SUSPENDED" ? "Restore" : "Suspend"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "employers" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employer activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Opportunities</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Filled positions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.employers.map((employer) => {
                  const listings = state.opportunities.filter(
                    (item) => item.employerId === employer.id,
                  );
                  const listingIds = new Set(listings.map((item) => item.id));
                  const applications = state.applications.filter((item) =>
                    listingIds.has(item.opportunityId),
                  );
                  return (
                    <TableRow key={employer.id}>
                      <TableCell className="text-sm font-medium">{employer.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {employer.city}
                      </TableCell>
                      <TableCell className="text-sm">{listings.length}</TableCell>
                      <TableCell className="text-sm">{applications.length}</TableCell>
                      <TableCell className="text-sm">
                        {listings.reduce((total, item) => total + item.filled, 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employer.verified ? "secondary" : "outline"}>
                          {employer.verified ? "verified" : "review"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "listings" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marketplace listings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.opportunities.map((opportunity) => {
                  const employer = state.employers.find((item) => item.id === opportunity.employerId);
                  return (
                    <TableRow key={opportunity.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{opportunity.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {opportunity.location} · {opportunity.vacancies} positions
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{employer?.name}</TableCell>
                      <TableCell className="text-sm">
                        {opportunity.employmentType.replace(/_/g, " ").toLowerCase()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(opportunity.postedAt.slice(0, 10))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={opportunity.status === "PUBLISHED" ? "secondary" : "outline"}>
                          {opportunity.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={opportunity.status === "CLOSED"}
                          onClick={() => {
                            reportOpportunity(opportunity.id);
                            toast.success("Listing removed from the marketplace.");
                          }}
                        >
                          <SlidersHorizontal className="size-4" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
