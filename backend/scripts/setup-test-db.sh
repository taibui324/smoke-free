#!/bin/bash

# Setup test database for Jest tests

echo "Setting up test database..."

# Database name
DB_NAME="quit_smoking_test"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Database $DB_NAME already exists. Dropping and recreating..."
    dropdb $DB_NAME
fi

# Create database
echo "Creating database $DB_NAME..."
createdb $DB_NAME

echo "Test database created successfully!"
echo "Running migrations..."

# Run migrations on test database
DATABASE_URL="postgresql://$(whoami)@localhost:5432/$DB_NAME" npm run migrate up

echo "Test database setup complete!"
