# Architecture

## Overview

The College WhatsApp Assistant uses a layered architecture with dependency injection
to keep the chatbot decoupled from any specific data source. This allows the system
to switch between MongoDB, SAP, Oracle, or any other backend without changing
business logic.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      CHATBOT                            │
│   intentClassifier → responseGenerator → chatbotService │
│                  (no data access)                       │
└────────────────────────┬────────────────────────────────┘
                         │ calls integration.findUserByPhone(), etc.
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 INTEGRATION LAYER                        │
│              IntegrationService (facade)                 │
│   findUserByPhone()  ·  getStudentProfile()             │
└────────────────────────┬────────────────────────────────┘
                         │ delegates to sub-services
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     SERVICES                             │
│  AttendanceService  ·  FeeService  ·  ScheduleService   │
│  ResultService  ·  ProfileService  ·  PublicInfoService │
│                                                         │
│  Contains business logic:                               │
│  - Compute overallAttendance from raw records           │
│  - Map domain types to integration-layer types          │
│  - Profile aggregation across multiple services         │
│  - Category keyword resolution (PublicInformation)      │
│                                                         │
│  ⚠ No MongoDB imports. Only repository interfaces.     │
└────────────────────────┬────────────────────────────────┘
                         │ calls repository methods
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   REPOSITORIES                           │
│                                                         │
│  Interface         │  MongoDB Impl                      │
│  ──────────────────┼────────────────────────────        │
│  IAttendanceRepo   │  MongoAttendanceRepo               │
│  IFeeRepo          │  MongoFeeRepo                      │
│  IScheduleRepo     │  MongoScheduleRepo                 │
│  IResultRepo       │  MongoResultRepo                   │
│  IUserRepo         │  MongoUserRepo                     │
│  IPublicContentRepo│  MongoPublicContentRepo            │
│                                                         │
│  ⚠ Only MongoDB implementations import Mongoose.      │
└────────────────────────┬────────────────────────────────┘
                         │ queries
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      MONGODB                            │
│   Attendance · Fee · Schedule · Result · User ·         │
│   PublicContent · Conversation · Message · Notification │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. User asks "Show my attendance"

```
User WhatsApp message
  → ChatbotService.processMessage("show my attendance")
  → classifyIntent() → Attendance (private intent)
  → integration.findUserByPhone() → UserRepo.findByPhone() → UserRecord
  → generateResponse(Attendance, context)
  → integration.attendance.getByStudentId()
  → AttendanceIntegrationService.getByStudentId()
  → AttendanceRepo.findStudentAttendance()
  → MongoAttendanceRepo → Attendance.find() → Mongoose
  → Map to AttendanceRecord[]
  → Compute overallPercentage
  → Return AttendanceResult
  → Format response text
  → Send via WhatsApp
```

### 2. User asks "Tell me about admissions"

```
User WhatsApp message
  → ChatbotService.processMessage("tell me about admissions")
  → classifyIntent() → PublicInformation (public, no auth needed)
  → generateResponse(PublicInformation, context)
  → integration.publicInformation.resolveCategory() → "admissions"
  → integration.publicInformation.getByCategory("admissions")
  → PublicInformationService.getByCategory()
  → PublicContentRepo.findByCategory("admissions", true)
  → MongoPublicContentRepo → PublicContent.find() → Mongoose
  → Map to PublicContentRecord[]
  → Return PublicInformationResult
  → Format response text
  → Send via WhatsApp
```

## Repository Interfaces

All interfaces live in `src/repositories/`. They define pure data-access methods
with no knowledge of MongoDB, Mongoose, or any specific database library.

```typescript
// src/repositories/attendance.repository.ts
interface IAttendanceRepository {
  findStudentAttendance(studentId: string): Promise<AttendanceRecord[]>;
}

// src/repositories/fee.repository.ts
interface IFeeRepository {
  findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null>;
}

// src/repositories/schedule.repository.ts
interface IScheduleRepository {
  findScheduleByClass(params: {
    department: string; year: number; section: string; dayOfWeek: string;
  }): Promise<ScheduleRecord[]>;
}

// src/repositories/result.repository.ts
interface IResultRepository {
  findStudentResults(studentId: string): Promise<ResultRecord[]>;
}

// src/repositories/user.repository.ts
interface IUserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findByStudentId(studentId: string): Promise<UserRecord | null>;
  findParentByStudentId(studentId: string): Promise<UserRecord | null>;
}

// src/repositories/public-content.repository.ts
interface IPublicContentRepository {
  findByCategory(category: string, isActive: boolean): Promise<PublicContentRecord[]>;
  searchByTerms(terms: string[], limit: number): Promise<PublicContentRecord[]>;
  aggregateCategoryCounts(): Promise<CategoryCountRecord[]>;
}
```

## Dependency Injection

Services receive repositories via constructor parameters (constructor injection):

```typescript
class AttendanceIntegrationService {
  constructor(private readonly repo: IAttendanceRepository) {}
}

class FeeIntegrationService {
  constructor(private readonly repo: IFeeRepository) {}
}

class ScheduleIntegrationService {
  constructor(private readonly repo: IScheduleRepository) {}
}

class ResultIntegrationService {
  constructor(private readonly repo: IResultRepository) {}
}

class PublicInformationService {
  constructor(private readonly repo: IPublicContentRepository) {}
}

class ProfileService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly attendanceService: AttendanceIntegrationService,
    private readonly feesService: FeeIntegrationService,
    private readonly scheduleService: ScheduleIntegrationService,
    private readonly resultsService: ResultIntegrationService,
  ) {}
}
```

## Composition Root

`src/integration/index.ts` is the **composition root** — the only file that
creates concrete implementations and wires dependencies:

```typescript
// Create repositories (the only place MongoDB implementations are referenced)
const attendanceRepo = new MongoAttendanceRepository();
const feeRepo = new MongoFeeRepository();
const scheduleRepo = new MongoScheduleRepository();
const resultRepo = new MongoResultRepository();
const userRepo = new MongoUserRepository();
const publicContentRepo = new MongoPublicContentRepository();

// Inject repositories into services
const attendanceService = new AttendanceIntegrationService(attendanceRepo);
const feeService = new FeeIntegrationService(feeRepo);
// ... etc

// Create integration facade
export const integration = new IntegrationService(
  attendanceService, feeService, scheduleService, resultService,
  publicInformationService, profileService, userRepo,
);
```

## Adding a New ERP Backend

To switch from MongoDB to SAP (or Oracle, Microsoft Dynamics, etc.):

### Step 1: Create ERP repository implementations

```typescript
// src/repositories/sap/attendance.repository.ts
import { IAttendanceRepository } from '../attendance.repository.js';
import type { AttendanceRecord } from '../types.js';

export class SapAttendanceRepository implements IAttendanceRepository {
  async findStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    // Call SAP API, map response to AttendanceRecord[]
    const response = await sapClient.get(`/students/${studentId}/attendance`);
    return response.data.map(mapSapAttendanceToRecord);
  }
}
```

### Step 2: Update the composition root

```typescript
// src/integration/index.ts
// Change:
//   const attendanceRepo = new MongoAttendanceRepository();
// To:
//   const attendanceRepo = new SapAttendanceRepository();
```

**No service, chatbot, or API code changes needed.**

## File Structure

```
src/
├── repositories/                    # Repository layer
│   ├── types.ts                     # Raw record types (Mongoose-agnostic)
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
├── database/models/                 # Mongoose models (only used by mongodb/ repos)
├── modules/                         # Auth, WhatsApp, Notifications
└── shared/                          # Logger, utilities
```

## Key Design Principles

1. **Services never import Mongoose** — they depend only on repository interfaces.
2. **Only MongoDB implementations know about Mongoose** — isolated in `repositories/mongodb/`.
3. **Composition root is the single wiring point** — change one file to swap data sources.
4. **Repository interfaces use plain data types** — no Document wrappers, no `_id`.
5. **Tests mock at the right level** — integration-level tests mock `integration`,
   service-level tests mock repository interfaces.
6. **Backward compatible** — the integration API surface (AttendanceResult, FeeResult, etc.)
   is unchanged. All existing chatbot, auth, and WhatsApp code works without modification.
