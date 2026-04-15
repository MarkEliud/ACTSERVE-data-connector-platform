import { Container } from 'react-bootstrap';
import { FaDatabase } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white py-4 mt-auto">
      <Container className="text-center">
        <div className="mb-2">
          <FaDatabase className="me-2" style={{ color: '#46b754' }} />
          <span style={{ color: '#46b754' }}>ACTSERV</span>
          <span style={{ color: '#f89734' }}> Data Connector</span>
        </div>
        <small>
          &copy; {currentYear} Actuarial Services (E.A) Ltd. All rights reserved.
        </small>
      </Container>
    </footer>
  );
}