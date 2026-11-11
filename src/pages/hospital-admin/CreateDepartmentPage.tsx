import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { DepartmentForm } from "@/components/hospital/DepartmentForm";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function CreateDepartmentPage() {
  const { hospitalId = "" } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create department"
        description="Add a clinical department to your hospital. It becomes available for doctor assignment immediately."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Departments", to: "/hospital-admin/departments" },
          { label: "Create" },
        ]}
      />

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : (
        <Card>
          <CardContent>
            <DepartmentForm
              hospitalId={hospitalId}
              submitLabel="Create department"
              onSaved={(department) =>
                navigate(`/hospital-admin/departments/${department.id}`)
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
