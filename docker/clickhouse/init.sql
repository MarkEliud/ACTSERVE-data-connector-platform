-- docker/clickhouse/init.sql
-- ClickHouse initialization script

CREATE DATABASE IF NOT EXISTS data_connector;

USE data_connector;

-- Create users table (ReplacingMergeTree for updates)
CREATE TABLE IF NOT EXISTS users (
    id UInt32,
    username String,
    email String,
    password_hash String,
    first_name String,
    last_name String,
    is_active UInt8,
    is_admin UInt8,
    created_at DateTime,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id UInt32,
    name String,
    description String,
    database_type String,
    host String,
    port UInt16,
    database_name String,
    username String,
    password_encrypted String,
    options String,
    connection_timeout UInt16,
    max_connections UInt16,
    is_active UInt8,
    created_by UInt32,
    created_at DateTime,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

-- Create extraction_jobs table
CREATE TABLE IF NOT EXISTS extraction_jobs (
    id UInt32,
    name String,
    description String,
    connection_id UInt32,
    table_name String,
    schema_name String,
    columns String,
    query String,
    filters String,
    batch_size UInt32,
    status String,
    total_rows UInt64,
    total_batches UInt32,
    progress_percentage UInt8,
    error_message String,
    created_by UInt32,
    started_at DateTime,
    completed_at DateTime,
    created_at DateTime,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY id;

-- Create materialized view for extraction stats
CREATE MATERIALIZED VIEW IF NOT EXISTS extraction_stats_daily
ENGINE = SummingMergeTree
ORDER BY (date, status)
AS SELECT
    toDate(created_at) as date,
    status,
    count() as job_count,
    sum(total_rows) as total_rows
FROM extraction_jobs
GROUP BY date, status;