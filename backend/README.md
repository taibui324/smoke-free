# Quit Smoking App - Backend API

## Overview

Node.js/Express backend API for the Quit Smoking mobile application.

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (for production and property tests)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key for AI chat

## Development

### Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Property-Based Tests

Property-based tests require a real PostgreSQL database connection. To run them:

1. Set up a test database:
```bash
createdb quit_smoking_test
```

2. Set the DATABASE_URL environment variable:
```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/quit_smoking_test
```

3. Remove the `.skip` from property test files:
```typescript
// Change this:
describe.skip('Database Persistence Property Tests', () => {

// To this:
describe('Database Persistence Property Tests', () => {
```

4. Run the tests:
```bash
npm test -- database.property.test.ts
```

### Database Migrations

```bash
# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down

# Seed development data
npm run seed
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database connection
│   │   └── *.test.ts    # Unit tests
│   ├── utils/           # Utility functions
│   │   └── logger.ts    # Winston logger
│   ├── seeds/           # Database seed scripts
│   └── index.ts         # Express app entry point
├── migrations/          # Database migrations
└── package.json
```

## Testing Strategy

This project uses a dual testing approach:

1. **Unit Tests**: Test specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Test universal properties across all inputs using fast-check

Both are required for comprehensive coverage. Unit tests catch concrete bugs, while property tests verify general correctness.

## API Documentation

API documentation will be available at `/api/docs` once implemented.

## Deployment

The backend is designed to be deployed on Railway.app with PostgreSQL.

See `railway.json` for deployment configuration.
