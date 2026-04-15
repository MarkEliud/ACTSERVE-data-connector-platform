// frontend/src/components/data-grid/GridToolbar.tsx
import { Button, ButtonGroup, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FaSearch, FaFilter, FaDownload, FaUndo, FaSave, FaColumns } from 'react-icons/fa';

interface GridToolbarProps {
  onSearch?: (term: string) => void;
  onExport?: (format: string) => void;
  onSaveAll?: () => void;
  onRevertAll?: () => void;
  onFilter?: () => void;
  onColumnToggle?: () => void;
  modifiedCount?: number;
  invalidCount?: number;
  loading?: boolean;
}

export default function GridToolbar({
  onSearch,
  onExport,
  onSaveAll,
  onRevertAll,
  onFilter,
  onColumnToggle,
  modifiedCount = 0,
  invalidCount = 0,
  loading = false,
}: GridToolbarProps) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div className="d-flex gap-2">
        {onSearch && (
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search..."
              onChange={(e) => onSearch(e.target.value)}
            />
          </InputGroup>
        )}
        
        {onFilter && (
          <Button variant="outline-secondary" onClick={onFilter}>
            <FaFilter className="me-1" /> Filter
          </Button>
        )}
        
        {onColumnToggle && (
          <Button variant="outline-secondary" onClick={onColumnToggle}>
            <FaColumns className="me-1" /> Columns
          </Button>
        )}
      </div>

      <div className="d-flex gap-2">
        {modifiedCount > 0 && (
          <>
            {onSaveAll && (
              <Button variant="primary" onClick={onSaveAll} disabled={loading}>
                <FaSave className="me-1" /> Save All ({modifiedCount})
              </Button>
            )}
            {onRevertAll && (
              <Button variant="outline-warning" onClick={onRevertAll} disabled={loading}>
                <FaUndo className="me-1" /> Revert All
              </Button>
            )}
          </>
        )}
        
        {invalidCount > 0 && (
          <span className="badge bg-danger align-self-center">
            {invalidCount} invalid rows
          </span>
        )}
        
        {onExport && (
          <Dropdown>
            <Dropdown.Toggle variant="outline-success">
              <FaDownload className="me-1" /> Export
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onExport('csv')}>CSV</Dropdown.Item>
              <Dropdown.Item onClick={() => onExport('json')}>JSON</Dropdown.Item>
              <Dropdown.Item onClick={() => onExport('excel')}>Excel</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>
    </div>
  );
}