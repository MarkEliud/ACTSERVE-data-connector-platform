'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { FaDatabase, FaFileExport, FaTable, FaCloudUploadAlt } from 'react-icons/fa';

export default function HomePage() {
const { isAuthenticated, isLoading: loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const features = [
    {
      icon: <FaDatabase size={40} className="text-primary mb-3" />,
      title: 'Database Connections',
      description: 'Connect to PostgreSQL, MySQL, MongoDB, and ClickHouse databases with secure credential management.',
    },
    {
      icon: <FaFileExport size={40} className="text-primary mb-3" />,
      title: 'Batch Extraction',
      description: 'Extract large datasets with configurable batch sizes and real-time progress tracking.',
    },
    {
      icon: <FaTable size={40} className="text-primary mb-3" />,
      title: 'Editable Data Grid',
      description: 'Review, edit, and validate extracted data with an intuitive spreadsheet-like interface.',
    },
    {
      icon: <FaCloudUploadAlt size={40} className="text-primary mb-3" />,
      title: 'Dual Storage',
      description: 'Store processed data in database and export to JSON/CSV files with complete metadata.',
    },
  ];

  return (
    <Container className="py-5">
      {/* Hero Section */}
      <Row className="text-center mb-5">
        <Col lg={8} className="mx-auto">
          <h1 className="display-4 fw-bold mb-4">
            Data Connector Platform
          </h1>
          <p className="lead text-muted mb-4">
            Extract, transform, and manage data from multiple database sources with ease.
            Built for actuaries and data professionals who need reliable data management.
          </p>
          {!isAuthenticated && (
            <div>
              <Link href="/login" passHref>
                <Button variant="primary" size="lg" className="me-3">
                  Get Started
                </Button>
              </Link>
              <Link href="/login" passHref>
                <Button variant="outline-secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </Col>
      </Row>

      {/* Features Section */}
      <Row className="mb-5">
        <Col className="text-center mb-4">
          <h2>Key Features</h2>
          <p className="text-muted">Everything you need for professional data management</p>
        </Col>
      </Row>
      <Row className="g-4 mb-5">
        {features.map((feature, index) => (
          <Col md={6} lg={3} key={index}>
            <Card className="h-100 text-center shadow-sm">
              <Card.Body className="d-flex flex-column align-items-center">
                {feature.icon}
                <Card.Title>{feature.title}</Card.Title>
                <Card.Text className="text-muted small">
                  {feature.description}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Supported Databases Section */}
      <Row className="mt-5 pt-4">
        <Col className="text-center mb-4">
          <h3>Supported Databases</h3>
        </Col>
      </Row>
      <Row className="text-center g-4">
        <Col md={3} sm={6}>
          <div className="p-3 bg-light rounded">
            <strong>PostgreSQL</strong>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="p-3 bg-light rounded">
            <strong>MySQL</strong>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="p-3 bg-light rounded">
            <strong>MongoDB</strong>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="p-3 bg-light rounded">
            <strong>ClickHouse</strong>
          </div>
        </Col>
      </Row>
    </Container>
  );
}