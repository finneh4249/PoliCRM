import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage) || 1, safeTotalPages));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (safeTotalPages <= showPages) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < safeTotalPages - 2) pages.push("...");
      pages.push(safeTotalPages);
    }
    return pages;
  };

  return (
    <div className="card px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span className="text-sm text-muted-foreground">entries</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === "number" ? (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                  safeCurrentPage === page
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary border border-border"
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-1.5 text-muted-foreground text-sm">
                {page}
              </span>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
