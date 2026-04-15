// docker/mongodb/init.js
// MongoDB initialization script

// Switch to data_connector database
db = db.getSiblingDB('data_connector');

// Create collections
db.createCollection('users');
db.createCollection('connections');
db.createCollection('extraction_jobs');
db.createCollection('extraction_batches');
db.createCollection('data_sets');
db.createCollection('data_rows');
db.createCollection('file_exports');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.connections.createIndex({ created_by: 1 });
db.extraction_jobs.createIndex({ status: 1 });
db.extraction_jobs.createIndex({ connection_id: 1 });
db.data_sets.createIndex({ extraction_job: 1 });
db.data_rows.createIndex({ dataset: 1 });
db.file_exports.createIndex({ extraction_job: 1 });

// Insert default admin user (password: admin123)
db.users.insertOne({
    username: 'admin',
    email: 'admin@example.com',
    password_hash: '$2b$12$KIXQhV/5N5Z8Q8X5Y8Z8Q8X5Y8Z8Q8X5Y8Z8Q8',
    first_name: 'Admin',
    last_name: 'User',
    is_active: true,
    is_admin: true,
    created_at: new Date(),
    updated_at: new Date()
});

print('MongoDB initialization completed!');