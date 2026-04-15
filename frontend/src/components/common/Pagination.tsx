import { Pagination as BootstrapPagination } from 'react-bootstrap';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisible?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <BootstrapPagination className="justify-content-center gap-1">
      <BootstrapPagination.First
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="rounded"
      />
      <BootstrapPagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded"
      />
      
      {getPageNumbers().map(pageNum => (
        <BootstrapPagination.Item
          key={pageNum}
          active={pageNum === currentPage}
          onClick={() => onPageChange(pageNum)}
          className="rounded"
          style={{
            backgroundColor: pageNum === currentPage ? '#46b754' : undefined,
            borderColor: pageNum === currentPage ? '#46b754' : undefined,
          }}
        >
          {pageNum}
        </BootstrapPagination.Item>
      ))}
      
      <BootstrapPagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded"
      />
      <BootstrapPagination.Last
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="rounded"
      />
    </BootstrapPagination>
  );
}