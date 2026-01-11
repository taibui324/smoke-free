# Quit Smoking Mobile Application

A comprehensive mobile application to help users quit smoking with AI-powered support, craving tracking, progress monitoring, and educational resources.

## Project Structure

This is a monorepo containing:
- `backend/` - Node.js/Express API server with TypeScript
- `mobile/` - React Native mobile app built with Expo

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (via Railway)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend API will run on http://localhost:3000

### 3. Mobile App Setup

```bash
cd mobile
cp .env.example .env
# Edit .env with your API URL
npm start
```

## Development

### Backend Development

```bash
npm run backend          # Start backend dev server
cd backend && npm test   # Run backend tests
cd backend && npm run test:coverage  # Run tests with coverage
```

### Mobile Development

```bash
npm run mobile           # Start Expo dev server
cd mobile && npm test    # Run mobile tests
cd mobile && npm run test:coverage   # Run tests with coverage
```

### Code Quality

```bash
npm run lint            # Lint all workspaces
npm run format          # Format code with Prettier
```

## Testing

All core functionality requires 100% test coverage:
- Unit tests for specific functionality
- Property-based tests for universal correctness properties
- Minimum 100 iterations per property test using fast-check

## Deployment

### Backend (Railway)

1. Create a Railway project
2. Add PostgreSQL database
3. Connect your Git repository
4. Set environment variables
5. Deploy automatically on push

### Mobile (Expo EAS Build + TestFlight)

```bash
cd mobile

# Development build
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios

# Submit to TestFlight
eas submit --platform ios
```

## Technology Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- OpenAI GPT-4
- Winston (logging)

### Mobile
- React Native
- Expo
- TypeScript
- Redux Toolkit
- React Navigation
- Axios

### Testing
- Jest
- fast-check (property-based testing)

### Deployment
- Railway (backend + database)
- Expo EAS Build
- TestFlight (iOS beta testing)

## License

MIT
