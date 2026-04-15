'use client';

import { useState } from 'react';
import { Navbar, Nav, NavDropdown, Container, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FaDatabase, FaFileExport, FaTable, FaChartLine, FaUser, FaSignOutAlt } from 'react-icons/fa';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    setExpanded(false);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" expanded={expanded}>
      <Container fluid>
        <Navbar.Brand as={Link} href="/" className="fw-bold">
          <FaDatabase className="me-2" />
          Data Connector
        </Navbar.Brand>
        <Navbar.Toggle
          aria-controls="main-navbar"
          onClick={() => setExpanded(!expanded)}
        />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} href="/dashboard" onClick={() => setExpanded(false)}>
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} href="/connections" onClick={() => setExpanded(false)}>
              Connections
            </Nav.Link>
            <Nav.Link as={Link} href="/extraction" onClick={() => setExpanded(false)}>
              Extraction
            </Nav.Link>
            <Nav.Link as={Link} href="/extraction/history" onClick={() => setExpanded(false)}>
              History
            </Nav.Link>
            <Nav.Link as={Link} href="/storage/files" onClick={() => setExpanded(false)}>
              Storage
            </Nav.Link>
          </Nav>

          {isAuthenticated && user ? (
            <Nav>
              <NavDropdown
                title={
                  <span>
                    <FaUser className="me-1" />
                    {user.username || user.email}
                    {user.is_admin && (
                      <Badge bg="info" className="ms-2" pill>
                        Admin
                      </Badge>
                    )}
                  </span>
                }
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item as={Link} href="/profile" onClick={() => setExpanded(false)}>
                  <FaUser className="me-2" /> Profile
                </NavDropdown.Item>
                <NavDropdown.Divider />
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
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}