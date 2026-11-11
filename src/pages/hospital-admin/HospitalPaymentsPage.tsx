import { useState } from "react";
import { CircleDollarSign, Clock, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PaymentTable } from "@/components/hospital/PaymentTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useServiceQuery } from "@/hooks/useServiceQuery";
import { getApiErrorMessage } from "@/lib/http";
import { services } from "@/services";
import type { PaymentStatus } from "@/types";
import { formatCurrency } from "@/utils/format";
import {
  buildPaymentRows,
  paymentSummary,
  type PaymentRow,
} from "./selectors";

type PaymentFilter = PaymentStatus | "ALL" | "PAY_AT_HOSPITAL";

export function HospitalPaymentsPage() {
  const { hospitalId = "" } = useAuth();
  const [filter, setFilter] = useState<PaymentFilter>("ALL");

  const payments = useServiceQuery(
    () => services.payments.listByHospital(hospitalId),
    `payments:${hospitalId}`,
  );
  const appointments = useServiceQuery(
    () => services.appointments.listDetailed({ hospitalId }),
    `appointments:${hospitalId}`,
  );

  const paymentRows = payments.data ?? [];
  const summary = paymentSummary(paymentRows);
  const rows = buildPaymentRows(paymentRows, appointments.data ?? []).filter((row) => {
    if (filter === "ALL") return true;
    if (filter === "PAY_AT_HOSPITAL") {
      return row.payment.method === "PAY_AT_HOSPITAL" && row.payment.status === "UNPAID_AT_HOSPITAL";
    }
    return row.payment.status === filter;
  });

  async function settle(row: PaymentRow) {
    try {
      await services.payments.markPaidAtHospital(row.payment.appointmentId);
      toast.success("Payment recorded as settled at the hospital.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment overview"
        description="Payment activity for appointments at your hospital. Online transactions are verified by the payment provider."
        breadcrumbs={[
          { label: "Hospital admin", to: "/hospital-admin" },
          { label: "Payments" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total paid"
          value={formatCurrency(summary.paidAmount)}
          icon={CircleDollarSign}
          hint={`${summary.paidCount} payments`}
        />
        <StatCard
          label="Pending"
          value={formatCurrency(summary.pendingAmount)}
          icon={Clock}
          tone="amber"
          hint={`${summary.pendingCount} awaiting confirmation`}
        />
        <StatCard
          label="Failed"
          value={formatCurrency(summary.failedAmount)}
          icon={TriangleAlert}
          tone="violet"
          hint={`${summary.failedCount} failed payments`}
        />
        <StatCard
          label="Pay at hospital"
          value={formatCurrency(summary.atHospitalAmount)}
          icon={Wallet}
          tone="sky"
          hint={`${summary.atHospitalCount} collected at the counter`}
        />
      </div>

      <Select
        value={filter}
        onValueChange={(value) => setFilter(value as PaymentFilter)}
      >
        <SelectTrigger className="lg:w-56" aria-label="Filter payments">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All payments</SelectItem>
          <SelectItem value="PAID">Paid</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
          <SelectItem value="PAY_AT_HOSPITAL">Pay at hospital</SelectItem>
        </SelectContent>
      </Select>

      {!hospitalId ? (
        <ErrorState
          title="No hospital assigned"
          message="Your administrator account is not linked to a hospital yet."
        />
      ) : payments.isLoading ? (
        <ListSkeleton rows={3} />
      ) : payments.error ? (
        <ErrorState message={payments.error} onRetry={payments.refetch} />
      ) : (
        <>
          <PaymentTable rows={rows} onSettle={settle} />
          <p className="text-muted-foreground text-xs">
            Recording a cash payment is only possible for pay-at-hospital records that are
            still unpaid. Online payments cannot be altered from the hospital portal —
            appointment status and payment status are tracked independently.
          </p>
        </>
      )}
    </div>
  );
}
