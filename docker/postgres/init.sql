-- docker/postgres/init.sql
-- PostgreSQL initialization script

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS data_connector;
\c data_connector;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    database_type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    options JSONB,
    connection_timeout INTEGER DEFAULT 30,
    max_connections INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create extraction_jobs table
CREATE TABLE IF NOT EXISTS extraction_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    connection_id INTEGER REFERENCES connections(id),
    table_name VARCHAR(255),
    schema_name VARCHAR(255),
    columns JSONB,
    query TEXT,
    filters JSONB,
    batch_size INTEGER DEFAULT 1000,
    status VARCHAR(50) DEFAULT 'pending',
    total_rows BIGINT DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    created_by INTEGER REFERENCES users(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_connections_created_by ON connections(created_by);
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs(status);
CREATE INDEX idx_extraction_jobs_connection ON extraction_jobs(connection_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, is_admin)
VALUES ('admin', 'admin@example.com', crypt('admin123', gen_salt('bf')), TRUE)
ON CONFLICT (email) DO NOTHING;