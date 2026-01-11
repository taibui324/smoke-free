# Quick Setup Guide

## Task 1: Project Setup - COMPLETED ✅

The monorepo structure has been initialized with all necessary configurations.

## Next Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install mobile dependencies
cd ../mobile && npm install
```

### 2. Set Up Railway (Backend Hosting)

1. Go to [Railway.app](https://railway.app) and create an account
2. Create a new project
3. Add a PostgreSQL database service
4. Copy the `DATABASE_URL` from Railway
5. Create `backend/.env` from `backend/.env.example`
6. Paste your `DATABASE_URL` and configure other variables

### 3. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

**Mobile (`mobile/.env`):**
```bash
cp mobile/.env.example mobile/.env
# Edit mobile/.env with your API URL
```

### 4. Initialize Git Hooks

```bash
npm run prepare
```

### 5. Test the Setup

**Backend:**
```bash
cd backend
npm run dev
# Visit http://localhost:3000/health
```

**Mobile:**
```bash
cd mobile
npm start
# Press 'i' for iOS simulator or 'a' for Android
```

## What Was Created

### Monorepo Structure
```
quit-smoking-app/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── utils/       # Logger utility
│   │   └── index.ts     # Express server
│   ├── migrations/      # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── railway.json     # Railway deployment config
├── mobile/              # React Native/Expo app
│   ├── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json         # Expo configuration
│   ├── eas.json         # EAS Build configuration
│   ├── jest.config.js
│   └── babel.config.js
├── package.json         # Root workspace config
├── .eslintrc.json       # ESLint configuration
├── .prettierrc.json     # Prettier configuration
├── .gitignore
└── .husky/              # Git hooks
    └── pre-commit       # Runs lint-staged
```

### Key Features Configured

✅ **TypeScript** - Strict mode enabled for both projects
✅ **ESLint + Prettier** - Code quality and formatting
✅ **Git Hooks** - Pre-commit linting with Husky
✅ **Jest** - Testing framework with 100% coverage requirement
✅ **Railway** - Backend deployment configuration
✅ **EAS Build** - Mobile app build configuration
✅ **Database** - PostgreSQL connection pool setup
✅ **Logging** - Winston logger for backend
✅ **Environment Variables** - Example files for both projects

## Ready for Task 2

You can now proceed to **Task 2: Backend Core Setup** which includes:
- Initialize Express.js server with TypeScript
- Set up PostgreSQL database connection
- Write unit tests for database connection
- Write property tests for database persistence

Run the following to start Task 2:
```bash
cd backend
npm run dev
```

## Useful Commands

```bash
# Development
npm run backend          # Start backend dev server
npm run mobile           # Start Expo dev server

# Testing
npm test                 # Run all tests
cd backend && npm test   # Backend tests only
cd mobile && npm test    # Mobile tests only

# Code Quality
npm run lint             # Lint all code
npm run format           # Format all code

# Database
cd backend && npm run migrate:up    # Run migrations
cd backend && npm run migrate:down  # Rollback migrations
```

## Need Help?

- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- Railway Docs: https://docs.railway.app
- Expo Docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
