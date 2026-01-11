// Load test environment variables before any tests run
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
