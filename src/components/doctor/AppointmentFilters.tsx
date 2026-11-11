import { SearchInput } from "@/components/common/SearchInput";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AppointmentFilterKey = "ALL" | "TODAY" | "UPCOMING" | "COMPLETED" | "CANCELLED";

const FILTERS: Array<{ value: AppointmentFilterKey; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "TODAY", label: "Today" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface AppointmentFiltersProps {
  filter: AppointmentFilterKey;
  onFilterChange: (filter: AppointmentFilterKey) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function AppointmentFilters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        value={filter}
        onValueChange={(value) => onFilterChange(value as AppointmentFilterKey)}
      >
        <TabsList aria-label="Filter appointments" className="flex-wrap">
          {FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search by patient name"
        ariaLabel="Search appointments by patient name"
      />
    </div>
  );
}
