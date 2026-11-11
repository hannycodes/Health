import { useState } from "react";

/** Client-side pagination shared by the platform administration tables. */
export function usePagination<T>(rows: T[], pageSize = 8) {
  const [requestedPage, setRequestedPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    page,
    setPage: setRequestedPage,
    pageSize,
    totalPages,
    total: rows.length,
    pageRows: rows.slice(start, start + pageSize),
  };
}
