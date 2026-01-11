# Design Document: Quit Smoking Mobile Application

## Overview

This document describes the technical design for a full-stack mobile application that helps users quit smoking through AI-powered coaching, real-time progress tracking, craving management, and evidence-based interventions. The system consists of a React Native mobile frontend, Node.js/Express backend API, PostgreSQL database, and OpenAI-powered conversational AI.

The application follows a client-server architecture with RESTful APIs for data operations and WebSocket connections for real-time features. The design prioritizes user privacy, data security, offline capability, and responsive performance.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                       │
│                    (React Native)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Layer   │  │  State Mgmt  │  │ Local Storage│     │
│  │  (Screens)   │  │   (Redux)    │  │  (AsyncStorage)│    │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS / WebSocket
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│                   (Node.js/Express)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │  API Routes  │  │  WebSocket   │     │
│  │    (JWT)     │  │ Controllers  │  │   Server     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
┌─────────────────────────┐   ┌─────────────────────────┐
│   PostgreSQL Database   │   │   OpenAI API            │
│   (User Data, Stats)    │   │   (AI Coach)            │
└─────────────────────────┘   └─────────────────────────┘
```

### Technology Stack

**Frontend (Mobile):**
- React Native (cross-platform iOS/Android)
- Redux Toolkit (state management)
- React Navigation (routing)
- AsyncStorage (local persistence)
- Socket.io-client (real-time communication)
- Axios (HTTP client)

**Backend:**
- Node.js with Express.js
- PostgreSQL (primary database)
- Redis (session storage, caching)
- Socket.io (WebSocket server)
- JWT (authentication)
- bcrypt (password hashing)

**AI Services:**
- OpenAI GPT-4 API (conversational AI)
- Custom prompt engineering for empathetic coaching

**Infrastructure:**
- Docker (containerization)
- **Deployment Platform:**
  - **Mobile App**: Expo EAS Build (development and production builds)
  - **TestFlight**: iOS beta testing distribution
  - **Backend API**: Railway.app (Node.js/Express hosting)
  - **Database**: Railway PostgreSQL
  - **Static Assets**: Railway static file serving
- Push notification service (FCM/APNS - both free)

## Components and Interfaces

### Frontend Components

#### 1. Authentication Module
- **LoginScreen**: Email/password authentication
- **RegisterScreen**: New user registration with validation
- **OnboardingFlow**: Multi-step wizard for initial setup
  - WelcomeScreen
  - QuitDateSelector
  - MotivationSelector
  - SavingsCalculator

#### 2. Dashboard Module
- **HomeScreen**: Main dashboard with smoke-free timer, stats, and quick actions
- **SmokeFreTimer**: Real-time countdown component (updates every second)
- **StatsGrid**: Displays money saved, cigarettes avoided, life regained, streak
- **ProgressBar**: Visual progress toward next milestone
- **CravingButton**: Prominent emergency access button

#### 3. Craving Management Module
- **CravingTrackerScreen**: Log craving intensity and triggers
- **IntensitySlider**: 1-10 scale with visual feedback
- **TriggerSelector**: Multi-select chips for common triggers
- **ReliefTechniques**: Grid of coping strategies
- **CravingHistoryScreen**: Charts and analytics

#### 4. AI Chat Module
- **ChatScreen**: Conversational interface with AI coach
- **MessageList**: Scrollable chat history
- **MessageInput**: Text input with voice option
- **QuickReplies**: Contextual suggestion chips
- **EmergencyMode**: Crisis support overlay

#### 5. Progress Module
- **ProgressScreen**: Detailed progress visualization
- **HealthTimeline**: Recovery milestones with progress indicators
- **MilestoneGrid**: Achievement badges (locked/unlocked)
- **CravingChart**: 7-day intensity trend graph
- **ShareButton**: Social sharing functionality

#### 6. Resources Module
- **ResourcesScreen**: Educational content library
- **SearchBar**: Content search functionality
- **CategoryFilter**: Filter by type (articles, videos, etc.)
- **ArticleViewer**: Full-screen article reader
- **VideoPlayer**: Embedded video playback
- **BookmarkList**: Saved content

#### 7. Settings Module
- **SettingsScreen**: User preferences and configuration
- **ProfileEditor**: Update personal information
- **NotificationSettings**: Toggle notification types
- **AIToneSelector**: Choose chatbot personality
- **DataManagement**: Export/delete data

### Backend API Endpoints

#### Authentication Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Authenticate user
POST   /api/auth/logout            - Invalidate session
POST   /api/auth/refresh           - Refresh JWT token
POST   /api/auth/reset-password    - Request password reset
PUT    /api/auth/reset-password    - Complete password reset
```

#### User Profile Endpoints
```
GET    /api/users/profile          - Get user profile
PUT    /api/users/profile          - Update user profile
DELETE /api/users/account          - Delete user account
GET    /api/users/stats            - Get user statistics
```

#### Quit Plan Endpoints
```
POST   /api/quit-plan              - Create/update quit plan
GET    /api/quit-plan              - Get current quit plan
PUT    /api/quit-plan/quit-date    - Update quit date
```

#### Craving Endpoints
```
POST   /api/cravings               - Log new craving
GET    /api/cravings               - Get craving history
GET    /api/cravings/analytics     - Get craving analytics
GET    /api/cravings/triggers      - Get trigger patterns
```

#### AI Chat Endpoints
```
POST   /api/chat/message           - Send message to AI
GET    /api/chat/history           - Get chat history
DELETE /api/chat/history           - Clear chat history
POST   /api/chat/emergency         - Trigger emergency mode
```

#### Progress Endpoints
```
GET    /api/progress/timer         - Get smoke-free duration
GET    /api/progress/milestones    - Get milestone status
POST   /api/progress/milestone     - Mark milestone achieved
GET    /api/progress/health        - Get health recovery status
```

#### Resources Endpoints
```
GET    /api/resources              - List all resources
GET    /api/resources/:id          - Get specific resource
GET    /api/resources/search       - Search resources
POST   /api/resources/bookmark     - Bookmark resource
GET    /api/resources/bookmarks    - Get bookmarked resources
```

#### Notifications Endpoints
```
POST   /api/notifications/register - Register device for push
PUT    /api/notifications/settings - Update notification preferences
POST   /api/notifications/send     - Send notification (internal)
```

### WebSocket Events

```
// Client -> Server
'chat:message'           - Send chat message
'craving:start'          - Start craving session
'timer:sync'             - Request timer sync

// Server -> Client
'chat:response'          - AI response
'milestone:achieved'     - Milestone notification
'timer:update'           - Timer synchronization
'insight:daily'          - Daily insight push
```

## Data Models

### User Model
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unique, validated
  passwordHash: string;          // bcrypt hashed
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  preferences: UserPreferences;
}

interface UserPreferences {
  notificationsEnabled: boolean;
  dailyCheckInTime?: string;     // HH:MM format
  cravingAlertsEnabled: boolean;
  aiChatbotTone: 'empathetic' | 'motivational' | 'direct';
  language: string;              // ISO 639-1 code
  theme: 'light' | 'dark' | 'auto';
}
```

### QuitPlan Model
```typescript
interface QuitPlan {
  id: string;
  userId: string;                // Foreign key to User
  quitDate: Date;                // User's committed quit date
  cigarettesPerDay: number;      // Pre-quit smoking rate
  costPerPack: number;           // Local currency
  cigarettesPerPack: number;     // Default 20
  motivations: string[];         // Selected motivations
  createdAt: Date;
  updatedAt: Date;
}
```

### Craving Model
```typescript
interface Craving {
  id: string;
  userId: string;
  timestamp: Date;
  intensity: number;             // 1-10 scale
  triggers: string[];            // e.g., ['stress', 'coffee']
  reliefTechniquesUsed: string[];
  duration?: number;             // Seconds until craving passed
  notes?: string;
  resolved: boolean;
}
```

### ChatMessage Model
```typescript
interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    cravingId?: string;          // Link to craving if relevant
    emergencyMode?: boolean;
    sentiment?: string;
  };
}
```

### Milestone Model
```typescript
interface Milestone {
  id: string;
  userId: string;
  type: 'time' | 'health' | 'savings' | 'custom';
  name: string;
  description: string;
  threshold: number;             // e.g., 24 for "24 hours"
  unit: 'hours' | 'days' | 'weeks' | 'months';
  achievedAt?: Date;
  isUnlocked: boolean;
  iconUrl: string;
}
```

### HealthRecoveryStage Model
```typescript
interface HealthRecoveryStage {
  id: string;
  name: string;
  description: string;
  timeFromQuit: number;          // Hours
  category: 'cardiovascular' | 'respiratory' | 'sensory' | 'other';
  order: number;
}

interface UserHealthProgress {
  id: string;
  userId: string;
  stageId: string;
  startedAt: Date;
  completedAt?: Date;
  progressPercentage: number;
}
```

### Resource Model
```typescript
interface Resource {
  id: string;
  type: 'article' | 'video' | 'exercise' | 'tip';
  title: string;
  description: string;
  content: string;               // Markdown for articles
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;             // Minutes for articles, seconds for videos
  category: string[];
  tags: string[];
  author?: string;
  publishedAt: Date;
  featured: boolean;
}

interface UserBookmark {
  id: string;
  userId: string;
  resourceId: string;
  bookmarkedAt: Date;
}
```

### Statistics Model
```typescript
interface UserStatistics {
  userId: string;
  smokeFreeSeconds: number;      // Calculated from quit date
  moneySaved: number;            // Calculated from quit plan
  cigarettesNotSmoked: number;   // Calculated from quit plan
  lifeRegainedSeconds: number;   // Based on average life lost per cigarette
  currentStreak: number;         // Days
  longestStreak: number;         // Days
  totalCravingsLogged: number;
  cravingsResisted: number;
  lastUpdated: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following areas where properties can be consolidated:

**Consolidation Opportunities:**
1. **Data Persistence Properties (1.5, 2.3, 3.5, 4.5, 11.1)**: All test that data is persisted correctly. Can be consolidated into a general "data persistence" property.
2. **Notification Properties (3.3, 8.2, 9.2)**: All test that notifications are sent when events occur. Can be consolidated.
3. **Calculation Properties (2.4, 10.2, 10.3)**: All test that calculations update correctly when inputs change. Can be consolidated into a "calculation accuracy" property.
4. **Timer Properties (3.2, 16.5)**: Both test timer accuracy and updates. Can be consolidated.
5. **Sync Properties (11.2, 11.3, 11.4)**: All test data synchronization behavior. Can be consolidated into comprehensive sync properties.
6. **Performance Properties (16.1, 16.2, 16.3)**: All test performance metrics. Can be consolidated into performance benchmarks.
7. **Accessibility Properties (17.1, 17.2, 17.3, 17.4, 17.5)**: All test accessibility features. Can be consolidated into comprehensive accessibility properties.

**Properties to Keep Separate:**
- Authentication and security properties (unique security concerns)
- Search and filtering properties (distinct functionality)
- Milestone and achievement properties (complex state transitions)
- AI response properties (unique timing and behavior requirements)

### Correctness Properties

Property 1: **User Registration and Authentication**
*For any* valid email and password combination, registering a new user should create an account, and subsequently logging in with those credentials should authenticate successfully and return a valid JWT token.
**Validates: Requirements 1.2**

Property 2: **Invalid Credential Rejection**
*For any* invalid credential input (malformed email, weak password, non-existent user), the authentication system should reject the attempt and return a descriptive error message without exposing sensitive information.
**Validates: Requirements 1.3**

Property 3: **Session Termination on Logout**
*For any* authenticated user session, logging out should invalidate the JWT token such that subsequent API requests with that token are rejected with 401 Unauthorized.
**Validates: Requirements 1.4**

Property 4: **Profile Update Persistence**
*For any* valid profile data update, the changes should be persisted to the database and retrievable on subsequent profile queries, maintaining data integrity.
**Validates: Requirements 1.5, 2.3, 3.5, 4.5, 11.1**

Property 5: **Password Reset Token Generation**
*For any* valid password reset request, the system should generate a unique, time-limited token and send it to the user's registered email address.
**Validates: Requirements 1.6**

Property 6: **Quit Date Validation**
*For any* date selection during onboarding, the system should accept dates within the next 14 days and reject dates outside this range with a clear validation message.
**Validates: Requirements 2.2**

Property 7: **Savings Calculation Accuracy**
*For any* valid smoking habit inputs (cigarettes per day, cost per pack), the system should calculate potential savings using the formula: `savings = (cigarettesPerDay / cigarettesPerPack) * costPerPack * daysSinceQuit`, and recalculate whenever inputs change.
**Validates: Requirements 2.4, 10.2, 10.3**

Property 8: **Smoke-Free Timer Accuracy**
*For any* user with a quit date, the Smoke_Free_Timer should display the accurate time difference between the current time and the quit date, updating every second without drift, even when the app is backgrounded.
**Validates: Requirements 3.2, 16.5**

Property 9: **Milestone Achievement Notification**
*For any* user reaching a defined milestone threshold (24 hours, 3 days, 1 week, etc.), the system should unlock the achievement, send a push notification, and update the milestone status to "achieved" with a timestamp.
**Validates: Requirements 3.3, 8.1, 8.2, 9.2**

Property 10: **Craving Data Persistence**
*For any* craving log entry with intensity (1-10), triggers, and timestamp, the system should persist all fields to the database and make them retrievable in craving history queries.
**Validates: Requirements 4.5**

Property 11: **Trigger-to-Relief Technique Mapping**
*For any* selected craving trigger, the system should display at least one relevant relief technique from a predefined mapping (e.g., "stress" → breathing exercises, "coffee" → water drinking).
**Validates: Requirements 4.4**

Property 12: **Craving Analytics Computation**
*For any* set of craving log entries, the system should compute accurate trend data including average intensity, most common triggers, and intensity changes over the past 7 days.
**Validates: Requirements 4.6, 12.2**

Property 13: **AI Response Time**
*For any* user message sent to the AI_Coach, the system should return a response within 3 seconds, measured from message submission to response receipt.
**Validates: Requirements 5.2**

Property 14: **AI Progress Query Accuracy**
*For any* user query about progress or statistics, the AI_Coach should retrieve and present the current, accurate values for smoke-free time, money saved, cigarettes not smoked, and streak.
**Validates: Requirements 5.4**

Property 15: **Emergency Mode Resource Display**
*For any* activation of emergency mode (panic button or crisis detection), the system should immediately display crisis resources including hotline numbers and coping strategies.
**Validates: Requirements 5.6, 13.4**

Property 16: **Health Milestone Time Calculation**
*For any* health recovery milestone, the system should accurately calculate the time remaining until the milestone is reached based on the user's quit date and the milestone's time threshold.
**Validates: Requirements 6.3**

Property 17: **Health Progress Percentage Accuracy**
*For any* health recovery stage in progress, the system should calculate the completion percentage as: `(currentTime - stageStartTime) / (stageEndTime - stageStartTime) * 100`, capped at 100%.
**Validates: Requirements 6.4**

Property 18: **Resource Search Relevance**
*For any* search query in the resources section, all returned results should contain the search terms in either the title, description, content, or tags fields.
**Validates: Requirements 7.2**

Property 19: **Bookmark Round-Trip Consistency**
*For any* resource, bookmarking it and then retrieving the user's bookmarks should include that resource with all its original metadata intact.
**Validates: Requirements 7.5**

Property 20: **Achievement Status Display Accuracy**
*For any* user viewing their milestones, the system should correctly display each milestone as either locked (not achieved) or unlocked (achieved) based on whether the achievement threshold has been met.
**Validates: Requirements 8.3**

Property 21: **Shareable Image Generation**
*For any* unlocked achievement, generating a shareable image should produce a valid image file containing the achievement name, user's smoke-free duration, and relevant statistics.
**Validates: Requirements 8.4**

Property 22: **Streak Tracking Accuracy**
*For any* user's quit history, the system should correctly identify the longest continuous smoke-free period as the best streak, where continuity is defined as no logged relapses.
**Validates: Requirements 8.5**

Property 23: **Scheduled Notification Delivery**
*For any* user with daily check-ins enabled at a specific time, the system should send a notification within 1 minute of the scheduled time on each day.
**Validates: Requirements 9.1**

Property 24: **Inactivity Notification Trigger**
*For any* user who has not logged in for 3 consecutive days, the system should send a re-engagement notification on the 4th day.
**Validates: Requirements 9.3**

Property 25: **Notification Preference Enforcement**
*For any* user who disables notifications, the system should not send any non-critical notifications, but should still send critical alerts (e.g., security notifications).
**Validates: Requirements 9.5, 10.4**

Property 26: **Chat History Selective Deletion**
*For any* user clearing their chat history, the system should delete all ChatMessage records for that user while preserving all other user data including statistics, cravings, and milestones.
**Validates: Requirements 10.6**

Property 27: **Data Persistence Latency**
*For any* user action that modifies data (logging craving, sending message, updating profile), the system should persist the change to the backend database within 1 second.
**Validates: Requirements 11.1**

Property 28: **Cross-Device Synchronization**
*For any* user authenticating on a new device, the system should synchronize all user data (profile, statistics, cravings, chat history) within 5 seconds of successful authentication.
**Validates: Requirements 11.2**

Property 29: **Offline Queue and Sync**
*For any* data modification made while offline, the system should queue the operation locally and execute it against the backend when connectivity is restored, maintaining operation order.
**Validates: Requirements 11.3**

Property 30: **Conflict Resolution by Timestamp**
*For any* data conflict during synchronization (same field modified on multiple devices), the system should resolve the conflict by keeping the version with the most recent timestamp.
**Validates: Requirements 11.4**

Property 31: **Account Deletion Data Removal**
*For any* user account deletion request, the system should mark the account for deletion and permanently remove all associated data (profile, cravings, messages, statistics) within 30 days.
**Validates: Requirements 11.5**

Property 32: **Pattern Detection and Notification**
*For any* user with at least 10 craving logs, if the system detects a recurring trigger pattern (same trigger appears in >50% of logs), it should notify the user and suggest preventive strategies.
**Validates: Requirements 12.3**

Property 33: **Progress Trend Detection**
*For any* user's craving data, if the average intensity over the past 7 days is at least 20% lower than the previous 7 days, the system should highlight this as a positive trend.
**Validates: Requirements 12.4**

Property 34: **Increased Craving Detection**
*For any* user's craving data, if the average intensity over the past 3 days is at least 30% higher than their 7-day average, the system should proactively offer additional support resources.
**Validates: Requirements 12.5**

Property 35: **Social Post Creation**
*For any* user sharing their progress (when social features are enabled), the system should create a post in the community feed containing the user's smoke-free duration and selected achievement.
**Validates: Requirements 14.2**

Property 36: **Privacy Control Enforcement**
*For any* user viewing another user's profile (when social features are enabled), the system should only return fields marked as public in the user's privacy settings.
**Validates: Requirements 14.3**

Property 37: **Content Moderation Flagging**
*For any* user report of inappropriate content (when social features are enabled), the system should flag the content for moderation and prevent it from appearing in feeds until reviewed.
**Validates: Requirements 14.4**

Property 38: **User Blocking Enforcement**
*For any* user blocking another user (when social features are enabled), the system should prevent all interactions including viewing profiles, sending messages, and seeing posts.
**Validates: Requirements 14.5**

Property 39: **TLS Encryption Enforcement**
*For any* data transmission between client and server, the system should use TLS 1.3 or higher, rejecting connections using older protocols.
**Validates: Requirements 15.2**

Property 40: **Password Hashing Standards**
*For any* user password stored in the database, the system should hash it using bcrypt with a cost factor of at least 12, never storing plaintext passwords.
**Validates: Requirements 15.3**

Property 41: **Input Validation and Sanitization**
*For any* API request, the system should validate all inputs against expected schemas and sanitize string inputs to prevent SQL injection, XSS, and other injection attacks.
**Validates: Requirements 15.4**

Property 42: **Security Event Logging**
*For any* detected security event (failed login attempts, suspicious activity, breach attempts), the system should log the event with timestamp, IP address, and details, and notify administrators.
**Validates: Requirements 15.6**

Property 43: **Application Startup Performance**
*For any* app launch, the system should display the home screen within 2 seconds of the app icon being tapped, measured on a mid-range device.
**Validates: Requirements 16.1**

Property 44: **Navigation Performance**
*For any* screen transition, the system should complete the navigation animation within 300 milliseconds, maintaining 60 FPS throughout.
**Validates: Requirements 16.2, 16.3**

Property 45: **Image Loading Strategy**
*For any* image in the application, the system should display a placeholder immediately and lazy-load the actual image, prioritizing images in the viewport.
**Validates: Requirements 16.4**

Property 46: **Screen Reader Accessibility**
*For any* interactive UI element, the system should provide an accessible label that describes the element's purpose when accessed via screen readers.
**Validates: Requirements 17.1**

Property 47: **Responsive Text Scaling**
*For any* user-adjusted font size setting (from 0.5x to 2x), the system should scale all text proportionally while maintaining readable layouts without text overflow.
**Validates: Requirements 17.2**

Property 48: **High Contrast Mode Support**
*For any* user enabling high contrast mode, the system should adjust all UI colors to meet WCAG AAA standards with a minimum contrast ratio of 7:1.
**Validates: Requirements 17.3**

Property 49: **Internationalization Support**
*For any* supported language selection, the system should display all UI text, error messages, and content in the selected language using proper translations.
**Validates: Requirements 17.4**

Property 50: **Color Contrast Compliance**
*For any* text element in the application, the system should maintain a contrast ratio of at least 4.5:1 against its background, meeting WCAG AA standards.
**Validates: Requirements 17.5**

## Error Handling

### Client-Side Error Handling

**Network Errors:**
- Detect offline state and display user-friendly message
- Queue operations for retry when connectivity restored
- Implement exponential backoff for failed requests
- Show toast notifications for transient errors

**Validation Errors:**
- Display inline validation messages near form fields
- Prevent form submission until all validations pass
- Provide clear, actionable error messages
- Highlight invalid fields with visual indicators

**Authentication Errors:**
- Handle expired tokens by refreshing automatically
- Redirect to login on 401 Unauthorized
- Clear local storage on authentication failure
- Provide "forgot password" recovery flow

**UI Errors:**
- Implement error boundaries to catch React errors
- Display fallback UI when components crash
- Log errors to monitoring service (e.g., Sentry)
- Provide "retry" or "go back" options

### Server-Side Error Handling

**Request Validation:**
- Validate all inputs using schema validation (e.g., Joi)
- Return 400 Bad Request with detailed error messages
- Sanitize inputs to prevent injection attacks
- Rate limit requests to prevent abuse

**Database Errors:**
- Wrap database operations in try-catch blocks
- Return 500 Internal Server Error for unexpected failures
- Log detailed error information for debugging
- Implement database connection pooling and retry logic

**External Service Errors:**
- Handle OpenAI API failures gracefully
- Implement circuit breaker pattern for external services
- Provide fallback responses when AI is unavailable
- Set timeouts for external API calls

**Authentication Errors:**
- Return 401 for invalid or expired tokens
- Return 403 for insufficient permissions
- Log suspicious authentication attempts
- Implement account lockout after failed attempts

### Error Response Format

All API errors follow a consistent format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address"
      }
    ],
    "timestamp": "2024-01-11T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

## Testing Strategy

### Dual Testing Approach

This application requires both **unit tests** and **property-based tests** to ensure comprehensive correctness:

**Unit Tests** verify:
- Specific examples and edge cases
- Integration between components
- Error conditions and boundary values
- UI component rendering

**Property-Based Tests** verify:
- Universal properties across all inputs
- Correctness properties defined in this document
- Data integrity and consistency
- Performance characteristics

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property-based tests verify general correctness across the entire input space.

### Property-Based Testing Configuration

**Framework Selection:**
- **Frontend (JavaScript/TypeScript)**: Use `fast-check` library
- **Backend (Node.js)**: Use `fast-check` library
- **Minimum iterations**: 100 runs per property test (due to randomization)

**Test Tagging:**
Each property-based test must include a comment referencing the design property:
```javascript
// Feature: quit-smoking-app, Property 1: User Registration and Authentication
test('user registration and authentication round-trip', () => {
  fc.assert(
    fc.property(
      fc.emailAddress(),
      fc.string({ minLength: 8 }),
      async (email, password) => {
        // Test implementation
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testing Layers

**1. Unit Tests (Frontend)**
- Component rendering tests (React Testing Library)
- Redux reducer and action tests
- Utility function tests
- Navigation flow tests
- Minimum 80% code coverage

**2. Unit Tests (Backend)**
- API endpoint tests (Supertest)
- Database model tests
- Authentication middleware tests
- Utility function tests
- Minimum 85% code coverage

**3. Property-Based Tests**
- Implement all 50 correctness properties
- Test data persistence round-trips
- Test calculation accuracy across input ranges
- Test security properties (encryption, hashing)
- Test performance properties (timing, latency)

**4. Integration Tests**
- End-to-end user flows (Detox for React Native)
- API integration tests
- Database integration tests
- External service integration tests (mocked)

**5. Performance Tests**
- Load testing (Artillery or k6)
- Stress testing for concurrent users
- Memory leak detection
- Battery usage profiling (mobile)

**6. Security Tests**
- Penetration testing
- SQL injection prevention
- XSS prevention
- Authentication bypass attempts
- Rate limiting verification

### Test Data Generation

For property-based tests, use smart generators that constrain to valid input spaces:

**User Data Generators:**
```typescript
const validEmail = fc.emailAddress();
const validPassword = fc.string({ minLength: 8, maxLength: 128 });
const quitDate = fc.date({ min: new Date(), max: addDays(new Date(), 14) });
const cravingIntensity = fc.integer({ min: 1, max: 10 });
const cigarettesPerDay = fc.integer({ min: 1, max: 100 });
const costPerPack = fc.float({ min: 1, max: 50, noNaN: true });
```

**Edge Case Generators:**
```typescript
const edgeCaseEmails = fc.oneof(
  fc.constant(''),
  fc.constant('invalid'),
  fc.constant('test@'),
  fc.constant('@example.com')
);
```

### Continuous Integration

**CI Pipeline:**
1. Lint code (ESLint, Prettier)
2. Run unit tests
3. Run property-based tests (100 iterations each)
4. Run integration tests
5. Generate coverage reports
6. Build application
7. Run security scans
8. Deploy to staging (on main branch)

**Test Execution Time:**
- Unit tests: < 2 minutes
- Property tests: < 10 minutes (parallelized)
- Integration tests: < 5 minutes
- Total CI time: < 20 minutes

### Test Environment

**Frontend Testing:**
- Jest test runner
- React Testing Library
- fast-check for property tests
- Detox for E2E tests
- Mock AsyncStorage and native modules

**Backend Testing:**
- Jest test runner
- Supertest for API tests
- fast-check for property tests
- In-memory PostgreSQL for database tests
- Mock OpenAI API responses

**Test Database:**
- Use Docker container with PostgreSQL
- Reset database between test suites
- Seed with test data fixtures
- Use transactions for test isolation
