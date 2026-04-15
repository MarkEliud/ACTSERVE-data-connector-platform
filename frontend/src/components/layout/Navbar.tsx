'use client';

import { useState } from 'react';
import { Navbar as BootstrapNavbar, Nav, NavDropdown, Container, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FaDatabase, FaUser, FaSignOutAlt, FaTachometerAlt, FaPlug, FaFileExport, FaHistory, FaCloudUploadAlt } from 'react-icons/fa';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    setExpanded(false);
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" sticky="top" expanded={expanded}>
      <Container fluid>
        <BootstrapNavbar.Brand as={Link} href="/" className="fw-bold">
          <FaDatabase className="me-2" style={{ color: '#46b754' }} />
          <span style={{ color: '#46b754' }}>ACTSERV</span>
          <span style={{ color: '#f89734' }}> Data Connector</span>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle
          aria-controls="main-navbar"
          onClick={() => setExpanded(!expanded)}
        />
        <BootstrapNavbar.Collapse id="main-navbar">
          {isAuthenticated && (
            <Nav className="me-auto">
              <Nav.Link as={Link} href="/dashboard" onClick={() => setExpanded(false)}>
                <FaTachometerAlt className="me-1" /> Dashboard
              </Nav.Link>
              <Nav.Link as={Link} href="/connections" onClick={() => setExpanded(false)}>
                <FaPlug className="me-1" /> Connections
              </Nav.Link>
              <Nav.Link as={Link} href="/extraction" onClick={() => setExpanded(false)}>
                <FaFileExport className="me-1" /> Extraction
              </Nav.Link>
              <Nav.Link as={Link} href="/extraction/history" onClick={() => setExpanded(false)}>
                <FaHistory className="me-1" /> History
              </Nav.Link>
              <Nav.Link as={Link} href="/storage/files" onClick={() => setExpanded(false)}>
                <FaCloudUploadAlt className="me-1" /> Storage
              </Nav.Link>
            </Nav>
          )}

          {isAuthenticated && user ? (
            <Nav>
              <NavDropdown
                title={
                  <span>
                    <FaUser className="me-1" />
                    {user.username || user.email}
                    {user.is_admin && (
                      <Badge bg="primary" className="ms-2" pill>
                        Admin
                      </Badge>
                    )}
                  </span>
                }
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-2" /> Logout
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <Nav>
              <Nav.Link as={Link} href="/login" onClick={() => setExpanded(false)}>
                Login
              </Nav.Link>
            </Nav>
          )}
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}