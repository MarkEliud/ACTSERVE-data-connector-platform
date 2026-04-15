-- MySQL initialization script for data_connector database

CREATE DATABASE IF NOT EXISTS data_connector;
USE data_connector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    database_type VARCHAR(50) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    options JSON,
    connection_timeout INT DEFAULT 30,
    max_connections INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create extraction_jobs table
CREATE TABLE IF NOT EXISTS extraction_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    connection_id INT,
    table_name VARCHAR(255),
    schema_name VARCHAR(255),
    columns JSON,
    query TEXT,
    filters JSON,
    batch_size INT DEFAULT 1000,
    status VARCHAR(50) DEFAULT 'pending',
    total_rows BIGINT DEFAULT 0,
    total_batches INT DEFAULT 0,
    progress_percentage INT DEFAULT 0,
    error_message TEXT,
    created_by INT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES connections(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs(status);
CREATE INDEX idx_connections_name ON connections(name);

-- Insert default admin user (password: admin123 - this is a placeholder, use proper hash in production)
INSERT INTO users (username, email, password_hash, is_admin)
VALUES ('admin', 'admin@example.com', 'pbkdf2_sha256$600000$abc123def456', TRUE)
ON DUPLICATE KEY UPDATE id=id;

-- Create test table for extraction
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INT,
    city VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO customers (name, email, age, city) VALUES
('John Doe', 'john@example.com', 30, 'Nairobi'),
('Jane Smith', 'jane@example.com', 25, 'Mombasa'),
('Bob Johnson', 'bob@example.com', 40, 'Kisumu'),
('Alice Brown', 'alice@example.com', 35, 'Nakuru'),
('Charlie Wilson', 'charlie@example.com', 28, 'Eldoret')
ON DUPLICATE KEY UPDATE name=name;