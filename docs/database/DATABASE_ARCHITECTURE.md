# Database Architecture — HITS College WhatsApp Assistant

## Overview

This document describes the MongoDB database architecture for the HITS College WhatsApp Assistant system. The database uses **18 collections** with a clean academic hierarchy, embedded subdocuments for high-churn data, and comprehensive indexing for production performance.

## Design Principles

1. **Academic Hierarchy First** — Data flows from College → Department → Program → Batch → Section → Student
2. **Embed When Possible** — High-churn, tightly-coupled data (messages, submissions, installments) stored as subdocuments
3. **Reference When Necessary** — Cross-domain data (student → fee records) uses string `studentId` for flexibility
4. **Index Every Query Path** — Compound indexes on all common query patterns
5. **Timestamp Everything** — `createdAt` and `updatedAt` on all collections

## Collection Inventory

| # | Collection | Purpose | Document Count (est.) |
|---|-----------|---------|----------------------|
| 1 | College | Institution configuration | 1 |
| 2 | Department | Academic departments | 5-20 |
| 3 | Program | Degree programs | 10-50 |
| 4 | Batch | Student admission batches | 5-20 |
| 5 | Section | Student sections per batch | 10-100 |
| 6 | Student | Student profiles | 1,000-10,000 |
| 7 | User | Authentication accounts | 1,000-10,000 |
| 8 | DailyAttendance | Daily attendance records | 100,000-1,000,000 |
| 9 | Schedule | Timetable + holidays | 1,000-10,000 |
| 10 | Subject | Course subjects | 50-500 |
| 11 | Result | Component-wise exam results | 50,000-500,000 |
| 12 | Assignment | Assignments + submissions | 1,000-10,000 |
| 13 | FeeStructure | Fee templates | 10-100 |
| 14 | FeePayment | Payments, installments, fines, scholarships | 10,000-100,000 |
| 15 | Announcement | College announcements | 100-1,000 |
| 16 | KnowledgeBase | AI knowledge for Gemini | 100-1,000 |
| 17 | Conversation | WhatsApp conversations + messages | 1,000-10,000 |
| 18 | Notification | Delivery tracking | 10,000-100,000 |

## Academic Hierarchy

```
┌─────────────┐
│   College   │  (1 document - HITS)
└──────┬──────┘
       │ has many
┌──────▼──────┐
│ Department  │  (CSE, ECE, IT, Mech, etc.)
└──────┬──────┘
       │ has many
┌──────▼──────┐
│   Program   │  (B.Tech CSE, M.Tech AI, etc.)
└──────┬──────┘
       │ has many
┌──────▼──────┐
│    Batch    │  (2022, 2023, 2024 admission years)
└──────┬──────┘
       │ has many
┌──────▼──────┐
│   Section   │  (A, B, C sections per batch)
└──────┬──────┘
       │ has many
┌──────▼──────┐
│   Student   │  (individual students)
└─────────────┘
```

## Embedding Strategy

### Embedded Subdocuments (1:N where N is small-medium)

| Parent Collection | Embedded Array | Max Items | Rationale |
|------------------|----------------|-----------|-----------|
| Assignment | `submissions[]` | 100 | Submissions are tightly coupled to assignments |
| Conversation | `messages[]` | 10,000 | Messages belong to one conversation |
| FeePayment | `installments[]` | 12 | Max 12 installments per fee structure |
| FeePayment | `payments[]` | 50 | Payment history for a fee record |
| FeePayment | `fines[]` | 10 | Fines per student per semester |
| FeePayment | `scholarships[]` | 5 | Scholarships per student per year |

### Referenced Collections (1:N where N is large)

| Source | Target | Reference Field | Query Pattern |
|--------|--------|-----------------|---------------|
| Student | User | `userId` (ObjectId) | Login lookup |
| Student | User | `parentId` (ObjectId) | Parent portal |
| DailyAttendance | Student | `studentId` (string) | Attendance by student |
| Result | Student | `studentId` (string) | Results by student |
| Schedule | Section | `sectionId` (ObjectId) | Timetable lookup |
| Assignment | Subject | `subjectId` (ObjectId) | Assignments by subject |

## Indexing Strategy

### Compound Indexes (Most Common Queries)

```typescript
// Attendance: "Show me all attendance for student X in semester Y"
DailyAttendance: { studentId: 1, semester: 1, academicYear: 1 }

// Results: "Show all results for student X in semester Y"
Result: { studentId: 1, semester: 1, academicYear: 1 }

// Fee: "Show fee status for student X"
FeePayment: { studentId: 1, semester: 1, academicYear: 1 }

// Schedule: "Show timetable for section X on day Y"
Schedule: { sectionId: 1, dayOfWeek: 1 }

// Assignment: "Show assignments for subject X"
Assignment: { subjectId: 1, status: 1, dueDate: -1 }
```

### Unique Indexes

| Collection | Fields | Purpose |
|-----------|--------|---------|
| College | `code` | One college per system |
| Department | `code` | Unique department code |
| Program | `code` | Unique program code |
| Batch | `programId` + `year` | One batch per program per year |
| Section | `batchId` + `name` | Unique section name per batch |
| Student | `studentId` | Unique student ID |
| Student | `registerNumber` | Unique register number |
| User | `username` | Unique username |
| Subject | `code` | Unique subject code |
| FeeStructure | `code` + `academicYear` | Unique fee code per year |

### Partial/Partial Filter Indexes

```typescript
// Conversation: Only index active conversations
Conversation: { lastMessageAt: -1 }, { partialFilterExpression: { isActive: true } }

// KnowledgeBase: Only index active content
KnowledgeBase: { category: 1, isActive: 1 }, { partialFilterExpression: { isActive: true } }
```

## Data Flow Diagrams

### Student Attendance Flow
```
DailyAttendance → (aggregated by) → Attendance Summary
       ↓
  Student.studentId
       ↓
  Notification (if percentage < 75%)
```

### Fee Payment Flow
```
FeeStructure (template)
       ↓
FeePayment.installments[] (per-student schedule)
       ↓
FeePayment.payments[] (individual transactions)
       ↓
FeePayment.fines[] (late penalties)
       ↓
FeePayment.scholarships[] (discounts)
```

### Assignment Flow
```
Assignment (created by faculty)
       ↓
Assignment.submissions[] (student submissions)
       ↓
Result (marks → grade)
```

### AI Knowledge Flow
```
KnowledgeBase (pre-built responses)
       ↓
Gemini (tool-calling)
       ↓
Conversation.messages[] (response)
```

## Backup Strategy

| Collection | Priority | Frequency | Retention |
|-----------|----------|-----------|-----------|
| College | High | Weekly | Forever |
| Department | High | Weekly | Forever |
| Program | High | Weekly | Forever |
| Batch | High | Weekly | Forever |
| Section | High | Weekly | Forever |
| Student | Critical | Daily | Forever |
| User | Critical | Daily | Forever |
| DailyAttendance | Critical | Daily | 3 years |
| Schedule | Medium | Weekly | 2 years |
| Subject | Medium | Weekly | Forever |
| Result | Critical | Daily | Forever |
| Assignment | Medium | Weekly | 2 years |
| FeeStructure | Medium | Weekly | Forever |
| FeePayment | Critical | Daily | Forever |
| Announcement | Low | Weekly | 1 year |
| KnowledgeBase | Medium | Weekly | Versioned |
| Conversation | High | Daily | 1 year |
| Notification | Low | Weekly | 90 days |

## Migration Notes

### Collections Removed (Merged)
- `DetailedResult` → merged into `Result` (component marks as subdocuments)
- `Installment` → merged into `FeePayment.installments[]`
- `Payment` → merged into `FeePayment.payments[]`
- `Receipt` → merged into `FeePayment.payments[].receipt`
- `Fine` → merged into `FeePayment.fines[]`
- `Scholarship` → merged into `FeePayment.scholarships[]`
- `Attendance` → merged into `DailyAttendance`
- `HolidayOverride` → merged into `Schedule.holidays[]`
- `AssignmentSubmission` → merged into `Assignment.submissions[]`
- `PublicContent` → replaced by `KnowledgeBase`
- `Message` → merged into `Conversation.messages[]`

### New Collections Added
- `Department` — Academic department registry
- `Program` — Degree program registry
- `Batch` — Student admission batch tracking
- `Section` — Student section management
- `KnowledgeBase` — AI knowledge repository with embeddings

## Performance Considerations

1. **DailyAttendance** is the largest collection — use time-based indexes and archive old data
2. **Conversation.messages[]** can grow large — implement message pagination
3. **FeePayment** has complex subdocuments — use `$elemMatch` for efficient queries
4. **KnowledgeBase** embeddings require vector search — use Atlas Vector Search when available
5. **Notification** has high write volume — use bulk operations for batch notifications

## Security Notes

- `User.passwordHash` has `select: false` — never returned in queries by default
- Student PII (phone, email, DOB) should be encrypted at rest in production
- WhatsApp JIDs should not be exposed in API responses
- Fee payment data requires audit logging
