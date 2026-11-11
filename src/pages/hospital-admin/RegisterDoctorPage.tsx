import { useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";

import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { DoctorForm } from "@/components/hospital/DoctorForm";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { services } from "@/services";

export function RegisterDoctorPage() {
  const { hospitalId = "" } = useAuth();
  const navigate = useNavigate();

  const departments = useServiceQuery(
    () => services.departments.list({ hospitalId }),
    `departments:${hospitalId}`,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register doctor"
        description="Add a doctor to your hospital roster and assign them to a department."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Doctors", to: "/hospital-admin/doctors" },
          { label: "Register" },
        ]}
      />

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : (
        <>
          <div className="border-border/70 bg-muted/40 flex items-start gap-3 rounded-xl border px-4 py-3">
            <MailCheck className="text-muted-foreground mt-0.5 size-4" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Account invitation</p>
              <p className="text-muted-foreground text-sm">
                The doctor is registered immediately and appears on your roster. Their
                MyHealth sign-in is created through the platform invitation flow, so the
                profile shows <span className="font-medium">Invitation pending</span> until
                the doctor accepts it. No password is collected here.
              </p>
            </div>
          </div>

          <Card>
            <CardContent>
              <DoctorForm
                hospitalId={hospitalId}
                departments={departments.data ?? []}
                onSaved={(doctor) => navigate(`/hospital-admin/doctors/${doctor.id}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
