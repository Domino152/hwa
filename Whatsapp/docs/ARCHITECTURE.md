# Architecture

## Overview

The College WhatsApp Assistant is a production-ready backend for handling student
interactions via WhatsApp. It uses a layered architecture with dependency injection
to keep the chatbot decoupled from any specific data source. This allows the system
to switch between MongoDB, SAP, Oracle, or any other backend without changing
business logic.

## High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                      │
│   WhatsApp (Baileys)  ·  REST API  ·  React Login Portal            │
└───────────┬──────────────────────────┬───────────────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐  ┌───────────────────────────────────────────┐
│   WhatsApp Module     │  │            Express HTTP Server            │
│   (ChatService,       │  │   Helmet · CORS · Compression · Rate     │
│    InboxService)      │  │   Limiter · Request Logger · Validation  │
└───────────┬───────────┘  └───────────┬───────────────────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       CHATBOT LAYER                                  │
│   ChatbotService → classifyIntent() → generateResponse()            │
│                     (no data access)                                 │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ calls integration.findUserByPhone(), etc.
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                                 │
│              IntegrationService (facade)                             │
│   findUserByPhone()  ·  getStudentProfile()                         │
│   attendance  ·  fees  ·  schedule  ·  results                      │
│   publicInformation  ·  profile                                     │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ delegates to sub-services
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SERVICES                                      │
│  AttendanceIntegrationService  ·  FeeIntegrationService              │
│  ScheduleIntegrationService  ·  ResultIntegrationService            │
│  ProfileService  ·  PublicInformationService                        │
│                                                                     │
│  Contains business logic:                                           │
│  - Compute overallAttendance from raw records                       │
│  - Map domain types to integration-layer types                      │
│  - Profile aggregation across multiple services                     │
│  - Category keyword resolution (PublicInformation)                  │
│                                                                     │
│  ⚠ No MongoDB imports. Only repository interfaces.                 │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ calls repository methods
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      REPOSITORIES                                    │
│                                                                     │
│  Interface           │  MongoDB Impl                                │
│  ────────────────────┼────────────────────────────                  │
│  IAttendanceRepo     │  MongoAttendanceRepo                         │
│  IFeeRepo            │  MongoFeeRepo                                │
│  IScheduleRepo       │  MongoScheduleRepo                           │
│  IResultRepo         │  MongoResultRepo                             │
│  IUserRepo           │  MongoUserRepo                               │
│  IPublicContentRepo  │  MongoPublicContentRepo                      │
│                                                                     │
│  ⚠ Only MongoDB implementations import Mongoose.                  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ queries
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        MONGODB                                       │
│   User · Attendance · Fee · Schedule · Result                       │
│   PublicContent · Conversation · Message · Notification             │
└──────────────────────────────────────────────────────────────────────┘
```

## Application Layers

### 1. Client Layer

The application supports three types of clients:

- **WhatsApp (Baileys)**: Primary interface for students. Messages are received
  via the WhatsApp Web multi-device protocol and processed by the chatbot.
- **REST API**: HTTP endpoints for health checks, WhatsApp status, notifications,
  and auth management.
- **React Login Portal**: Web-based login for linking WhatsApp accounts to
  student/parent profiles.

### 2. WhatsApp Module

**Files**: `src/modules/whatsapp/`

| Component | Responsibility |
|-----------|---------------|
| `ChatService` | Manages the Baileys WebSocket connection, QR code generation, message sending, and session persistence |
| `InboxService` | Processes incoming messages, persists conversations/messages to MongoDB, triggers auto-replies via the chatbot |
| `WhatsAppController` | Express handlers for QR, connection status, send-message, logout |
| `InboxController` | Express handlers for conversation list and message history |

The WhatsApp module is the **only module that directly imports Mongoose models**
for Conversation and Message (outside the repository layer). This is intentional —
the inbox/conversation persistence is tightly coupled to the real-time WhatsApp
protocol and doesn't benefit from the repository abstraction.

### 3. Chatbot Layer

**Files**: `src/chatbot/`

The chatbot is a rule-based intent classification system with no AI/ML dependencies.

```
User message → normalizeText() → classifyIntent() → generateResponse()
```

| Component | Responsibility |
|-----------|---------------|
| `ChatbotService` | Public facade — orchestrates classification → response generation |
| `intentClassifier` | Keyword-based matching against 10 intent definitions |
| `responseGenerator` | Async function that queries the Integration Layer for private intents |
| `intents` | Intent definitions, keyword maps, context types |

**Intent Classification**: Each intent has weighted keywords. The classifier
scores all intents and returns the highest match. Domain intents (attendance,
fees, schedule, results) are prioritized over generic intents (greeting, help).

**Public vs Private Intents**:
- **Public** (no auth required): greeting, help, login, syllabus, unknown, publicInformation
- **Private** (auth required): attendance, fees, schedule, results

The chatbot **never imports MongoDB models**. All data access goes through
the Integration Layer.

### 4. Integration Layer

**Files**: `src/integration/`

The Integration Layer is a **facade** that provides a single, stable API for
the chatbot to access all backend data services.

```
┌─────────────────────────────────────────────────────────┐
│                  IntegrationService                      │
│                                                         │
│  findUserByPhone(phone) → UserData | null               │
│  getStudentProfile(studentId) → StudentProfileResult    │
│                                                         │
│  Sub-services (accessible as properties):               │
│  .attendance  → AttendanceIntegrationService            │
│  .fees        → FeeIntegrationService                   │
│  .schedule    → ScheduleIntegrationService              │
│  .results     → ResultIntegrationService                │
│  .publicInformation → PublicInformationService          │
│  .profile     → ProfileService                         │
└─────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:
- `IntegrationService` is a **class**, not a module — it accepts dependencies
  via constructor injection.
- Sub-services are exposed as `readonly` properties, not methods — this keeps
  the API surface flat and discoverable.
- `findUserByPhone()` is a convenience method on the facade that delegates to
  `IUserRepository` — it's the most common query from the chatbot.

### 5. Service Layer

**Files**: `src/integration/services/`

Each service encapsulates domain-specific business logic:

| Service | Business Logic |
|---------|---------------|
| `AttendanceIntegrationService` | Computes `overallPercentage` from raw attendance records |
| `FeeIntegrationService` | Maps the latest fee record to a `FeeResult` |
| `ScheduleIntegrationService` | Filters schedule by department/year/section |
| `ResultIntegrationService` | Aggregates results and extracts CGPA |
| `ProfileService` | Orchestrates all services to build a complete student profile |
| `PublicInformationService` | Resolves categories from keywords, searches content |

**Critical Rule**: Services depend only on repository interfaces, never on
Mongoose models. This is enforced by the module system — services are in
`src/integration/services/` and have no import path to `src/database/models/`.

### 6. Repository Layer

**Files**: `src/repositories/`

The Repository Pattern abstracts data access behind interfaces. Each interface
defines pure data-access methods that return plain record types (no Mongoose
Document wrappers).

```
┌─────────────────────────────────────────────────────────┐
│                 Repository Interfaces                    │
│                                                         │
│  IAttendanceRepository                                  │
│    findStudentAttendance(studentId) → AttendanceRecord[]│
│                                                         │
│  IFeeRepository                                         │
│    findLatestFeeByStudentId(studentId) → FeeRecord|null │
│                                                         │
│  IScheduleRepository                                    │
│    findScheduleByClass(params) → ScheduleRecord[]       │
│                                                         │
│  IResultRepository                                      │
│    findStudentResults(studentId) → ResultRecord[]       │
│                                                         │
│  IUserRepository                                        │
│    findByPhone(phone) → UserRecord|null                 │
│    findByStudentId(studentId) → UserRecord|null         │
│    findParentByStudentId(studentId) → UserRecord|null   │
│                                                         │
│  IPublicContentRepository                               │
│    findByCategory(cat, active) → PublicContentRecord[]  │
│    searchByTerms(terms, limit) → PublicContentRecord[]  │
│    aggregateCategoryCounts() → CategoryCountRecord[]    │
└─────────────────────────────────────────────────────────┘
```

**Record Types** (`src/repositories/types.ts`): Plain TypeScript interfaces
with no framework dependencies. These are the contract between repositories
and services.

### 7. Database Layer

**Files**: `src/database/models/`, `src/repositories/mongodb/`

Mongoose models define schemas, indexes, and validation. MongoDB repository
implementations convert Mongoose documents to plain record types.

**Models**: User, Attendance, Fee, Schedule, Result, PublicContent,
Conversation, Message, Notification, College

**Connection**: Optimized for production with connection pooling, retry logic,
and exponential backoff.

## Dependency Injection

The application uses **constructor injection** — services receive their
dependencies through constructor parameters rather than importing concrete
implementations.

### How It Works

```
1. Repository interfaces define the contract
2. MongoDB implementations fulfill the contract
3. Services accept interfaces via constructor
4. Composition root wires everything together
```

### Composition Root

`src/integration/index.ts` is the **single wiring point** — the only file
that creates concrete implementations and connects dependencies:

```typescript
// 1. Create concrete repositories (only place MongoDB is referenced)
const attendanceRepo = new MongoAttendanceRepository();
const feeRepo = new MongoFeeRepository();
const scheduleRepo = new MongoScheduleRepository();
const resultRepo = new MongoResultRepository();
const userRepo = new MongoUserRepository();
const publicContentRepo = new MongoPublicContentRepository();

// 2. Inject repositories into services
const attendanceService = new AttendanceIntegrationService(attendanceRepo);
const feeService = new FeeIntegrationService(feeRepo);
const scheduleService = new ScheduleIntegrationService(scheduleRepo);
const resultService = new ResultIntegrationService(resultRepo);
const publicInformationService = new PublicInformationService(publicContentRepo);
const profileService = new ProfileService(
  userRepo, attendanceService, feeService, scheduleService, resultService
);

// 3. Create integration facade
export const integration = new IntegrationService(
  attendanceService, feeService, scheduleService, resultService,
  publicInformationService, profileService, userRepo,
);
```

### Why Constructor Injection?

- **Testability**: Tests can inject mock repositories without modifying production code
- **Explicit dependencies**: Constructor parameters make dependencies visible
- **Flexibility**: Changing implementations requires only modifying the composition root
- **No global state**: Dependencies are passed in, not imported from module scope

## Request Lifecycle

### WhatsApp Message Flow

```
1. WhatsApp message arrives via Baileys WebSocket
   │
2. ChatService receives WAMessage
   │
3. InboxService.handleIncomingMessage(msg)
   ├── Filter: personal messages only (no groups, newsletters, fromMe)
   ├── Extract: phone, jid, content, type, timestamp
   ├── Upsert Conversation (create or update lastMessage)
   ├── Save Message to MongoDB
   ├── Emit Socket.IO event (for real-time dashboard)
   │
4. InboxService.sendAutoReply()
   ├── ChatbotService.processMessage(text, { phone })
   │   ├── classifyIntent(text) → IntentName
   │   ├── integration.findUserByPhone(phone) → UserData | null
   │   ├── Build ChatbotContext (isAuthenticated, user info)
   │   └── generateResponse(intent, context) → string
   │       ├── Public intents: return static text
   │       └── Private intents:
   │           ├── integration.attendance.getByStudentId()
   │           ├── integration.fees.getByStudentId()
   │           ├── integration.schedule.getByStudent()
   │           └── integration.results.getByStudentId()
   │
5. ChatService.sendMessage(jid, replyText, requestId)
   │
6. Update Conversation with outgoing message
```

### HTTP Request Flow

```
1. HTTP request arrives at Express
   │
2. Global Middleware Pipeline:
   ├── Helmet (security headers)
   ├── CORS (origin validation)
   ├── Compression (gzip)
   ├── JSON parser (10mb limit)
   ├── Rate limiter (100 req/15min)
   └── Request logger (UUID tracing)
   │
3. Route matching
   │
4. Route-specific middleware:
   ├── validate(schema, 'body') — Zod validation
   └── authenticate — JWT verification (auth routes)
   │
5. Controller handler
   │
6. Service / Repository calls
   │
7. Response via sendSuccess() / sendError()
   │
8. Error handler middleware (if error thrown)
   ├── AppError → structured JSON response
   ├── DatabaseError → 500 with error logging
   └── Generic Error → 500 "Internal server error"
```

## Repository Pattern

### What Is the Repository Pattern?

The Repository Pattern separates data access logic from business logic by
introducing an interface layer between them.

```
Before (tightly coupled):
  Service → Mongoose Model → MongoDB

After (decoupled via repository):
  Service → IAttendanceRepository → MongoAttendanceRepository → Mongoose → MongoDB
```

### Why Use It?

1. **Swap data sources**: Change from MongoDB to SAP by implementing new repositories
2. **Test in isolation**: Mock repositories in unit tests without a real database
3. **Single responsibility**: Business logic stays clean, data access is encapsulated
4. **Type safety**: Record types are plain interfaces, not Mongoose Documents

### Repository Interfaces vs Implementations

| Layer | Lives In | Knows About |
|-------|----------|-------------|
| Interface | `src/repositories/*.repository.ts` | Nothing — pure TypeScript |
| MongoDB Impl | `src/repositories/mongodb/*.repository.ts` | Mongoose, MongoDB |
| Service | `src/integration/services/*.service.ts` | Only the interface |

### Record Types

All repository methods return plain record types, not Mongoose Documents:

```typescript
// ❌ Bad — exposes Mongoose internals
async findStudentAttendance(studentId: string): Promise<IAttendance[]> {
  return Attendance.find({ studentId });  // Returns Documents with _id, __v, etc.
}

// ✅ Good — returns plain data
async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  const docs = await Attendance.find({ studentId });
  return docs.map(d => ({
    studentId: d.studentId,
    subject: d.subject,
    totalClasses: d.totalClasses,
    attendedClasses: d.attendedClasses,
    percentage: d.percentage,
    semester: d.semester,
    academicYear: d.academicYear,
  }));
}
```

## IntegrationService

`IntegrationService` is a **facade** that provides a unified API for the
chatbot to access all backend data services.

### Design Pattern: Facade

```
Without facade:
  chatbot → attendanceService.getByStudentId()
  chatbot → feesService.getByStudentId()
  chatbot → scheduleService.getByStudent()
  chatbot → resultsService.getByStudentId()
  chatbot → userRepo.findByPhone()

With facade:
  chatbot → integration.attendance.getByStudentId()
  chatbot → integration.fees.getByStudentId()
  chatbot → integration.findUserByPhone()
```

### Why a Facade?

1. **Flat API surface**: The chatbot imports one object, not six services
2. **Stable contract**: Internal reorganization doesn't affect the chatbot
3. **Convenience methods**: `findUserByPhone()` combines repo lookup + type mapping
4. **Testability**: Tests mock one object instead of multiple services

### Key Methods

| Method | Delegates To | Returns |
|--------|-------------|---------|
| `findUserByPhone(phone)` | `IUserRepository.findByPhone()` | `UserData \| null` |
| `getStudentProfile(studentId)` | `ProfileService.getStudentProfile()` | `StudentProfileResult` |
| `integration.attendance` | `AttendanceIntegrationService` | (sub-service) |
| `integration.fees` | `FeeIntegrationService` | (sub-service) |
| `integration.schedule` | `ScheduleIntegrationService` | (sub-service) |
| `integration.results` | `ResultIntegrationService` | (sub-service) |
| `integration.publicInformation` | `PublicInformationService` | (sub-service) |

## Adding a New ERP Backend

To switch from MongoDB to SAP (or Oracle, Microsoft Dynamics, etc.):

### Step 1: Create ERP repository implementations

```typescript
// src/repositories/sap/attendance.repository.ts
import { IAttendanceRepository } from '../attendance.repository.js';
import type { AttendanceRecord } from '../types.js';

export class SapAttendanceRepository implements IAttendanceRepository {
  async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const response = await sapClient.get(`/students/${studentId}/attendance`);
    return response.data.map(mapSapAttendanceToRecord);
  }
}
```

### Step 2: Implement all 6 repository interfaces

```typescript
// src/repositories/sap/
//   attendance.repository.ts  → SapAttendanceRepository
//   fee.repository.ts         → SapFeeRepository
//   schedule.repository.ts    → SapScheduleRepository
//   result.repository.ts      → SapResultRepository
//   user.repository.ts        → SapUserRepository
//   public-content.repository.ts → SapPublicContentRepository
```

### Step 3: Update the composition root

```typescript
// src/integration/index.ts
// Change:
//   const attendanceRepo = new MongoAttendanceRepository();
// To:
//   const attendanceRepo = new SapAttendanceRepository();
```

**No service, chatbot, or API code changes needed.**

### What Must Stay the Same

- Record types (`AttendanceRecord`, `FeeRecord`, etc.) — the contract
- Interface method signatures — the API
- `IntegrationService` facade — unchanged

### What Can Change

- Internal implementation of each repository
- Database technology (MongoDB → SAP HANA, Oracle, PostgreSQL, etc.)
- Connection configuration
- Query optimization strategies

## Testing Strategy

### Test Pyramid

```
         ╱╲
        ╱  ╲        Integration Tests
       ╱ 30 ╲       (API endpoints, middleware, MongoDB)
      ╱──────╲
     ╱        ╲     Unit Tests
    ╱  259     ╲    (chatbot, services, utilities)
   ╱────────────╲
```

### Mock Strategy

| Test Level | What's Mocked | What's Real |
|-----------|---------------|-------------|
| Unit (chatbot) | `integration` layer | Nothing — pure logic |
| Unit (services) | Repository interfaces | Nothing — pure logic |
| Integration (API) | WhatsApp (ChatService) | MongoDB, Express, middleware |
| Integration (MongoDB) | Nothing | In-memory MongoDB (MongoMemoryServer) |

### Why Mock at the Right Level?

- **Chatbot tests mock `integration`**: Tests verify classification and response
  formatting without any data access.
- **Service tests mock repositories**: Tests verify business logic (e.g., computing
  overall attendance percentage) without a real database.
- **API tests mock WhatsApp**: Tests verify HTTP routing, validation, and auth
  without a real WhatsApp connection.
- **Repository tests use real MongoDB**: Tests verify queries, indexes, and
  data mapping work correctly.

## Error Handling

### Error Class Hierarchy

```
AppError (base, 500)
├── NotFoundError (404)
├── ValidationError (400) + details
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── ConflictError (409)
├── ServiceUnavailableError (503)
└── DatabaseError (500) + details, isOperational=false
```

### Error Handler Middleware

```typescript
if (err instanceof DatabaseError) {
  // Log at ERROR level with full context
  // Return 500 with DATABASE_ERROR code
} else if (err instanceof AppError) {
  // Log at WARN level (operational errors are expected)
  // Return structured JSON with error.code
} else {
  // Log at ERROR level (unexpected errors)
  // Return generic 500 "Internal server error"
}
```

### Error Codes

| Code | HTTP Status | When |
|------|-------------|------|
| `VALIDATION_ERROR` | 400 | Zod schema validation fails |
| `UNAUTHORIZED` | 401 | Missing/invalid JWT, wrong credentials |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., phone already linked) |
| `DATABASE_ERROR` | 500 | MongoDB connection/query failure |
| `INTERNAL_ERROR` | 500 | Unhandled/unexpected errors |
| `SERVICE_UNAVAILABLE` | 503 | WhatsApp not connected |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

## File Structure

```
src/
├── config/                          # Configuration
│   ├── env.schema.ts                # Zod env validation
│   ├── constants.ts                 # App-wide constants
│   └── index.ts                     # Config singleton
├── database/                        # Database layer
│   ├── index.ts                     # Connection management (connectDB, disconnectDB)
│   ├── models/                      # Mongoose schemas/models
│   │   ├── User.ts
│   │   ├── Attendance.ts
│   │   ├── Fee.ts
│   │   ├── Schedule.ts
│   │   ├── Result.ts
│   │   ├── PublicContent.ts
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   ├── Notification.ts
│   │   └── College.ts
│   └── seeders/                     # Database seed scripts
├── repositories/                    # Repository layer
│   ├── types.ts                     # Record types (Mongoose-agnostic)
│   ├── index.ts                     # Barrel exports
│   ├── attendance.repository.ts     # IAttendanceRepository interface
│   ├── fee.repository.ts            # IFeeRepository interface
│   ├── schedule.repository.ts       # IScheduleRepository interface
│   ├── result.repository.ts         # IResultRepository interface
│   ├── user.repository.ts           # IUserRepository interface
│   ├── public-content.repository.ts # IPublicContentRepository interface
│   └── mongodb/                     # MongoDB implementations
│       ├── index.ts
│       ├── attendance.repository.ts
│       ├── fee.repository.ts
│       ├── schedule.repository.ts
│       ├── result.repository.ts
│       ├── user.repository.ts
│       └── public-content.repository.ts
├── integration/                     # Integration layer
│   ├── index.ts                     # Composition root + singleton export
│   ├── integration.service.ts       # IntegrationService facade
│   ├── types.ts                     # Integration-layer types
│   └── services/                    # Domain services
│       ├── attendance.service.ts
│       ├── fee.service.ts
│       ├── schedule.service.ts
│       ├── result.service.ts
│       ├── profile.service.ts
│       └── public-information.service.ts
├── chatbot/                         # Chatbot (no data access)
│   ├── chatbot.service.ts           # Public facade
│   ├── intentClassifier.ts          # Keyword-based classification
│   ├── responseGenerator.ts         # Async response generation
│   ├── intents.ts                   # Intent definitions
│   ├── helpers.ts                   # Text normalization
│   └── index.ts                     # Singleton export
├── modules/                         # Feature modules
│   ├── auth/                        # Authentication
│   │   ├── auth.service.ts          # Login, link-whatsapp, etc.
│   │   ├── auth.controller.ts       # Express handlers
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── auth.routes.ts           # Route definitions
│   │   ├── auth.schemas.ts          # Zod validation
│   │   ├── auth.types.ts            # Request/response types
│   │   ├── password.service.ts      # bcrypt hash/compare
│   │   └── token.service.ts         # JWT sign/verify
│   ├── whatsapp/                    # WhatsApp integration
│   │   ├── chat.service.ts          # Baileys connection management
│   │   ├── inbox.service.ts         # Message processing
│   │   ├── whatsapp.controller.ts   # QR, status, send, logout
│   │   ├── inbox.controller.ts      # Conversations, messages
│   │   ├── whatsapp.routes.ts       # Route definitions
│   │   ├── schemas.ts              # Send-message validation
│   │   ├── inbox.schemas.ts         # Query validation
│   │   ├── whatsapp.events.ts       # Socket.IO events
│   │   ├── whatsapp.types.ts        # Type definitions
│   │   └── utils/                   # Phone normalization, message utils
│   ├── notifications/               # Notification system
│   │   ├── notification.service.ts  # CRUD + business logic
│   │   ├── notification-queue.ts    # In-memory queue with retry
│   │   ├── notification.controller.ts
│   │   ├── notifications.routes.ts
│   │   ├── notification.schemas.ts
│   │   └── notification.constants.ts
│   └── health/                      # Health checks
│       ├── health.controller.ts     # /health, /ready, /live
│       └── health.routes.ts
├── middleware/                       # Express middleware
│   ├── error-handler.ts             # Global error handler
│   ├── async-handler.ts             # Async route wrapper
│   ├── validate.ts                  # Zod schema validation
│   ├── rate-limiter.ts              # Rate limiting
│   ├── request-logger.ts            # UUID-based request tracing
│   ├── not-found.ts                 # 404 handler
│   └── index.ts                     # Barrel exports
├── shared/                          # Shared utilities
│   ├── utils/
│   │   ├── errors.ts                # Error class hierarchy
│   │   ├── response.ts              # sendSuccess / sendError
│   │   ├── logger.ts                # Pino logger
│   │   └── uuid.ts                  # UUID generation
│   └── types/
│       ├── api-response.ts          # IApiResponse type
│       ├── whatsapp.ts              # WhatsApp shared types
│       └── express.d.ts             # Express type augmentation
├── sockets/                         # Socket.IO setup
│   └── index.ts
├── app.ts                           # Express app factory
├── server.ts                        # HTTP server + Socket.IO
├── index.ts                         # Bootstrap + graceful shutdown
└── seed*.ts                         # Database seed scripts
```

## Key Design Principles

1. **Services never import Mongoose** — they depend only on repository interfaces.
2. **Only MongoDB implementations know about Mongoose** — isolated in `repositories/mongodb/`.
3. **Composition root is the single wiring point** — change one file to swap data sources.
4. **Repository interfaces use plain data types** — no Document wrappers, no `_id`.
5. **Tests mock at the right level** — integration tests mock `integration`,
   service tests mock repository interfaces.
6. **Backward compatible** — the integration API surface (AttendanceResult, FeeResult, etc.)
   is unchanged. All existing chatbot, auth, and WhatsApp code works without modification.
7. **Fail fast in production** — env validation rejects weak secrets, missing required vars.
8. **Observable** — structured logging with request IDs, health checks, memory stats.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `3000` | HTTP server port |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `CORS_ORIGINS` | Prod | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15min) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `WA_SESSION_DIR` | No | `./auth_info` | WhatsApp session storage |
| `JWT_SECRET` | Yes | — | Min 32 chars, must not contain weak patterns in prod |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiry |
| `PUBLIC_APP_URL` | Prod | `http://localhost:5173` | Public URL for login links (HTTPS, no localhost in prod) |
| `LOGIN_PORTAL_URL` | Prod | `http://localhost:5173/hwa` | Public login portal base URL (HTTPS, no localhost in prod) |
| `BCRYPT_ROUNDS` | No | `10` | Password hashing cost (4-20) |

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run production build |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check without emitting |
| `npm run seed:users` | Seed demo user accounts |
| `npm run seed:academic` | Seed academic data |
| `npm run seed:public-content` | Seed public content |
