import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import type { DoctorAISourceRecord } from "@/features/doctor/services/clinicalAssistantService";
import { formatDateTime } from "@/utils/format";

interface SourceRecordListProps {
  records: DoctorAISourceRecord[];
  patientId?: string;
}

/** The exact records an AI response was generated from. */
export function SourceRecordList({ records, patientId }: SourceRecordListProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        Source medical records ({records.length})
      </p>
      <ul className="space-y-1">
        {records.map((record) => (
          <li key={record.recordId} className="flex items-start gap-2 text-xs">
            <FileText className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {patientId ? (
              <Link
                to={`/doctor/patients/${patientId}/records/${record.recordId}`}
                className="hover:underline"
              >
                {record.title}
                {record.date ? ` · ${formatDateTime(record.date)}` : ""}
              </Link>
            ) : (
              <span>
                {record.title}
                {record.date ? ` · ${formatDateTime(record.date)}` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
