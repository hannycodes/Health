import { Wallet } from "lucide-react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_METHOD_LABELS } from "@/constants";
import { canSettleAtHospital, type PaymentRow } from "@/pages/hospital-admin/selectors";
import { formatCurrency } from "@/utils/format";

interface PaymentTableProps {
  rows: PaymentRow[];
  onSettle?: (row: PaymentRow) => void | Promise<void>;
}

export function PaymentTable({ rows, onSettle }: PaymentTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payment records found"
        description="Payments appear here as patients book and pay for appointments."
      />
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Appointment</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              {onSettle && <TableHead className="pr-5 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.payment.id}>
                <TableCell className="pl-5">
                  <p className="text-sm font-medium">{row.payment.appointmentId}</p>
                  <p className="text-muted-foreground text-xs">{row.dateLabel}</p>
                </TableCell>
                <TableCell className="text-sm">{row.patientName}</TableCell>
                <TableCell className="text-sm">{row.doctorName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{PAYMENT_METHOD_LABELS[row.payment.method]}</Badge>
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {formatCurrency(row.payment.amount, row.payment.currency)}
                </TableCell>
                <TableCell>
                  <StatusBadge kind="payment" value={row.payment.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {row.payment.transactionRef ?? "—"}
                </TableCell>
                {onSettle && (
                  <TableCell className="pr-5 text-right">
                    {canSettleAtHospital(row.payment) ? (
                      <ConfirmDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            Record cash payment
                          </Button>
                        }
                        title="Record payment at the hospital?"
                        description={`Confirm that ${row.patientName} paid ${formatCurrency(
                          row.payment.amount,
                          row.payment.currency,
                        )} at the hospital counter for appointment ${
                          row.payment.appointmentId
                        }. This only settles pay-at-hospital records; online payments are verified by the payment provider.`}
                        confirmLabel="Record payment"
                        onConfirm={() => onSettle(row)}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
