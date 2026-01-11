# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for a quit smoking mobile application with AI-powered support. The project consists of:
- **Backend**: Node.js/Express API with TypeScript and PostgreSQL
- **Mobile**: React Native app built with Expo (currently minimal setup)

## Development Commands

### Backend Development

```bash
# Development server with hot reload
npm run backend
# Or: cd backend && npm run dev

# Build TypeScript
cd backend && npm run build

# Run tests
cd backend && npm test

# Run tests with coverage (requires 100% coverage)
cd backend && npm run test:coverage

# Linting
cd backend && npm run lint

# Database migrations
cd backend && npm run migrate:up
cd backend && npm run migrate:down

# Seed database with dev data
cd backend && npm run seed
```

### Mobile Development

```bash
# Start Expo dev server
npm run mobile
# Or: cd mobile && npm start

# iOS simulator
cd mobile && npm run ios

# Android emulator
cd mobile && npm run android

# Run tests
cd mobile && npm test

# Run tests with coverage
cd mobile && npm run test:coverage

# Linting
cd mobile && npm run lint
```

### Root Commands

```bash
# Install all dependencies (workspaces)
npm install

# Lint all workspaces
npm run lint

# Format all code with Prettier
npm run format

# Run all tests
npm test

# Setup Git hooks (Husky)
npm run prepare
```

## Architecture Overview

### Backend Architecture

**Entry Point**: `backend/src/index.ts` - Express server with middleware stack including helmet, CORS, compression, and request logging.

**Database Layer**:
- Connection pooling via `backend/src/config/database.ts`
- PostgreSQL with connection pool management (max 20 connections)
- Query logging and error handling built-in
- `getClient()` for transactions with 5-second checkout timeout monitoring
- Uses `node-pg-migrate` for migrations

**Database Schema**:
- `users` table: UUID primary keys, email (unique), password hash, profile info, timestamps
- `user_preferences` table: Foreign key to users (CASCADE delete), notification settings, AI chatbot preferences, theme/language

**API Structure**:
- Routes organized under `/api` prefix
- Route modules in `backend/src/routes/` (currently auth routes)
- Controllers in `backend/src/controllers/`
- Services in `backend/src/services/` (business logic layer)
- Validators using Zod in `backend/src/validators/`

**Authentication Flow**:
- JWT-based authentication (access + refresh tokens)
- Access token default: 7 days, Refresh token: 30 days
- Password hashing with bcrypt (cost factor: 12)
- Registration creates user + default preferences in a transaction
- Login updates `last_login_at` timestamp
- Auth service (`backend/src/services/auth.service.ts`) handles all auth logic

**Logging**:
- Winston logger in `backend/src/utils/logger.ts`
- Request logging middleware captures method, path, IP, user agent
- Query execution times logged at debug level
- Error logging with stack traces

**Error Handling**:
- Global error handler returns structured JSON responses
- 404 handler for unknown routes
- Error details hidden in production
- All errors include timestamp and error code

### Mobile Architecture

Currently minimal setup with basic App.tsx entry point. Uses:
- Expo Router for navigation (configured but not yet implemented)
- Redux Toolkit for state management (configured but not yet implemented)
- React Navigation (stack navigator)
- Axios for API calls
- Expo Secure Store for sensitive data
- Expo Notifications
- i18next for internationalization

### Testing Requirements

**Critical**: All tests require 100% code coverage (branches, functions, lines, statements) enforced by Jest configuration.

**Testing Strategy**:
- Unit tests for specific functionality (`.test.ts` files)
- Property-based tests using fast-check (`.property.test.ts` files)
- Property tests must run minimum 100 iterations
- Example: `backend/src/config/database.test.ts` and `database.property.test.ts`

### Code Quality

**Linting**: ESLint with TypeScript plugin
- Unused vars allowed with `_` prefix (e.g., `_req`, `_res`)
- `any` type triggers warning
- Prettier integration enforces formatting

**Formatting**: Prettier with:
- Single quotes
- Semicolons
- 100 character line width
- 2-space indentation

**Git Hooks**: Husky pre-commit hook runs lint-staged to automatically lint and format staged files before commit.

## Environment Setup

**Backend requires** (`.env` in `backend/` directory):
- `DATABASE_URL`: PostgreSQL connection string (get from Railway)
- `JWT_SECRET`: Secret for JWT signing
- `OPENAI_API_KEY`: For AI chatbot features
- `PORT`: Default 3000
- `CORS_ORIGIN`: Default `*`

**Mobile requires** (`.env` in `mobile/` directory):
- `API_BASE_URL`: Backend API URL (e.g., `http://localhost:3000/api`)

Copy from `.env.example` files in each directory.

## Deployment

**Backend**: Railway with PostgreSQL
- Automatic deploys on git push (when connected)
- `backend/railway.json` configures build/start commands
- SSL enabled in production

**Mobile**: Expo EAS Build + TestFlight
```bash
cd mobile
eas build --profile development --platform ios
eas build --profile production --platform ios
eas submit --platform ios
```

## Important Patterns

1. **Database transactions**: Use `pool.connect()` and client with `BEGIN`/`COMMIT`/`ROLLBACK` for multi-query operations (see `AuthService.registerUser`)

2. **Error handling**: Services throw errors, controllers catch and return appropriate HTTP responses

3. **Password fields**: Never return `password_hash` in API responses - explicitly select fields in queries

4. **Timestamps**: Use PostgreSQL `current_timestamp` for `created_at`/`updated_at` fields

5. **Type safety**: Interface definitions for all data models (see `User`, `AuthTokens`, `RegisterUserData` in auth.service.ts)

6. **Logging context**: Always pass relevant context objects to logger calls (userId, email, etc.)

7. **Health checks**: `/health` endpoint returns JSON with status and timestamp

8. **API versioning**: All routes under `/api` prefix for future versioning flexibility
