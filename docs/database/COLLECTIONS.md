# Collection Field Specifications — HITS Database

This document provides detailed field specifications for all 18 MongoDB collections.

---

## 1. College

**Purpose:** Institution configuration (single document for HITS)

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `name` | String | yes | no | — | Institution name |
| `code` | String | yes | UK | — | Institution code (e.g., "HITS") |
| `whatsappEnabled` | Boolean | no | no | `true` | WhatsApp integration toggle |
| `address` | Object | no | no | `{}` | Address details |
| `address.street` | String | no | no | — | Street address |
| `address.city` | String | no | no | — | City |
| `address.state` | String | no | no | — | State |
| `address.pincode` | String | no | no | — | Pincode |
| `contact` | Object | no | no | `{}` | Contact details |
| `contact.phone` | String | no | no | — | Phone number |
| `contact.email` | String | no | no | — | Email |
| `contact.website` | String | no | no | — | Website URL |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ code: 1 }` (unique)

---

## 2. Department

**Purpose:** Academic department registry

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `name` | String | yes | no | — | Department name (e.g., "Computer Science") |
| `code` | String | yes | UK | — | Department code (e.g., "CSE") |
| `collegeId` | ObjectId | yes | no | — | Reference to College |
| `hodName` | String | no | no | — | Head of Department name |
| `email` | String | no | no | — | Department email |
| `phone` | String | no | no | — | Department phone |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ code: 1 }` (unique)
- `{ collegeId: 1 }`
- `{ isActive: 1 }`

---

## 3. Program

**Purpose:** Degree programs (B.Tech, M.Tech, etc.)

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `name` | String | yes | no | — | Program name (e.g., "B.Tech Computer Science") |
| `code` | String | yes | UK | — | Program code (e.g., "BTechCSE") |
| `departmentId` | ObjectId | yes | no | — | Reference to Department |
| `degree` | String | yes | no | — | Degree type (B.Tech, M.Tech, MBA, etc.) |
| `durationYears` | Number | yes | no | `4` | Duration in years |
| `totalSemesters` | Number | yes | no | `8` | Total semesters |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ code: 1 }` (unique)
- `{ departmentId: 1 }`
- `{ isActive: 1 }`

---

## 4. Batch

**Purpose:** Student admission batches

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `programId` | ObjectId | yes | no | — | Reference to Program |
| `year` | Number | yes | no | — | Admission year (e.g., 2024) |
| `name` | String | yes | no | — | Batch name (e.g., "2024 Batch") |
| `totalStudents` | Number | no | no | `0` | Total students in batch |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ programId: 1, year: 1 }` (unique)
- `{ isActive: 1 }`

---

## 5. Section

**Purpose:** Student sections within batches

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `batchId` | ObjectId | yes | no | — | Reference to Batch |
| `name` | String | yes | no | — | Section name (A, B, C, etc.) |
| `advisorName` | String | no | no | — | Class advisor name |
| `capacity` | Number | no | no | `60` | Maximum students |
| `currentStrength` | Number | no | no | `0` | Current student count |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ batchId: 1, name: 1 }` (unique)
- `{ isActive: 1 }`

---

## 6. Student

**Purpose:** Student profiles

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `userId` | ObjectId | yes | no | — | Reference to User (auth) |
| `studentId` | String | yes | UK | — | Student ID (e.g., "22CSE001") |
| `registerNumber` | String | yes | UK | — | University register number |
| `rollNumber` | String | yes | no | — | Roll number |
| `fullName` | String | yes | no | — | Full name |
| `email` | String | yes | UK | — | Email address |
| `phone` | String | yes | no | — | Phone number |
| `gender` | String | yes | no | — | male/female/other |
| `dateOfBirth` | Date | yes | no | — | Date of birth |
| `department` | String | yes | no | — | Department name (denormalized) |
| `program` | String | yes | no | — | Program name (denormalized) |
| `semester` | Number | yes | no | — | Current semester (1-8) |
| `section` | String | yes | no | — | Section name (denormalized) |
| `batch` | String | yes | no | — | Batch year (denormalized) |
| `sectionId` | ObjectId | yes | no | — | Reference to Section |
| `advisor` | String | yes | no | — | Class advisor name |
| `parentId` | ObjectId | no | no | `null` | Reference to User (parent) |
| `whatsappNumber` | String | no | UK(sparse) | `null` | WhatsApp number |
| `parentWhatsappNumber` | String | no | no | `null` | Parent's WhatsApp number |
| `status` | String | no | no | `'active'` | active/graduated/suspended |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ studentId: 1 }` (unique)
- `{ registerNumber: 1 }` (unique)
- `{ email: 1 }` (unique)
- `{ whatsappNumber: 1 }` (unique, sparse)
- `{ userId: 1 }`
- `{ sectionId: 1 }`
- `{ parentId: 1 }`
- `{ department: 1, semester: 1 }`
- `{ status: 1, isActive: 1 }`

**Static Methods:**
- `findByStudentId(studentId)` — Find by studentId where isActive=true
- `findByRegisterNumber(registerNumber)` — Find by registerNumber where isActive=true
- `findByUserId(userId)` — Find by userId where isActive=true

---

## 7. User

**Purpose:** Authentication accounts

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `fullName` | String | yes | no | — | Full name |
| `username` | String | yes | UK | — | Username for login |
| `passwordHash` | String | yes | no | — | Bcrypt password hash (select: false) |
| `role` | String | yes | no | — | student/parent |
| `studentId` | String | yes | no | — | Associated student ID |
| `whatsappNumber` | String | no | UK(sparse) | `null` | WhatsApp number |
| `department` | String | yes | no | — | Department name |
| `year` | Number | yes | no | — | Year of study |
| `section` | String | yes | no | — | Section name |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ username: 1 }` (unique)
- `{ whatsappNumber: 1 }` (unique, sparse)
- `{ studentId: 1 }`
- `{ isActive: 1 }`

**Static Methods:**
- `findByPhone(phone)` — Find by whatsappNumber where isActive=true

---

## 8. DailyAttendance

**Purpose:** Daily attendance records

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `studentId` | String | yes | no | — | Student ID (denormalized) |
| `subject` | String | yes | no | — | Subject name |
| `date` | Date | yes | no | — | Attendance date |
| `status` | String | yes | no | — | present/absent/od/medical_leave/leave/late/cancelled |
| `markedBy` | ObjectId | no | no | `null` | Reference to User (faculty) |
| `semester` | Number | yes | no | — | Semester (1-8) |
| `academicYear` | String | yes | no | — | Academic year (e.g., "2024-25") |
| `notes` | String | no | no | `null` | Additional notes |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ studentId: 1, subject: 1, date: 1 }` (unique)
- `{ studentId: 1, date: 1 }`
- `{ studentId: 1, semester: 1, academicYear: 1 }`
- `{ date: 1 }`
- `{ semester: 1, academicYear: 1 }`

---

## 9. Schedule

**Purpose:** Timetable and holiday overrides

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `sectionId` | ObjectId | yes | no | — | Reference to Section |
| `dayOfWeek` | String | yes | no | — | monday/tuesday/wednesday/thursday/friday/saturday |
| `periodNumber` | Number | yes | no | — | Period number (1-8) |
| `timeSlot` | String | yes | no | — | Time slot (e.g., "09:00-09:50") |
| `subject` | String | yes | no | — | Subject name |
| `faculty` | String | yes | no | — | Faculty name |
| `room` | String | yes | no | — | Room number |
| `type` | String | yes | no | — | lecture/lab/tutorial |
| `semester` | Number | yes | no | — | Semester (1-8) |
| `academicYear` | String | yes | no | — | Academic year |
| `holidays` | Array | no | no | `[]` | Holiday overrides |
| `holidays[].date` | Date | yes | no | — | Holiday date |
| `holidays[].reason` | String | yes | no | — | Holiday reason |
| `holidays[].academicYear` | String | yes | no | — | Academic year |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ sectionId: 1, dayOfWeek: 1 }`
- `{ sectionId: 1, academicYear: 1 }`
- `{ faculty: 1 }`
- `{ semester: 1, academicYear: 1 }`

---

## 10. Subject

**Purpose:** Course subjects

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `code` | String | yes | UK | — | Subject code (e.g., "CS401") |
| `name` | String | yes | no | — | Subject name |
| `department` | String | yes | no | — | Department name |
| `semester` | Number | yes | no | — | Semester (1-8) |
| `credits` | Number | yes | no | — | Credit hours |
| `type` | String | yes | no | — | theory/lab/elective |
| `faculty` | String | yes | no | — | Faculty name |
| `prerequisites` | Array | no | no | `[]` | Prerequisite subject codes |
| `isActive` | Boolean | no | no | `true` | Active status |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ code: 1 }` (unique)
- `{ department: 1, semester: 1 }`
- `{ faculty: 1 }`
- `{ isActive: 1 }`

---

## 11. Result

**Purpose:** Component-wise exam results

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `studentId` | String | yes | no | — | Student ID (denormalized) |
| `subjectCode` | String | yes | no | — | Subject code |
| `subjectName` | String | yes | no | — | Subject name |
| `semester` | Number | yes | no | — | Semester (1-8) |
| `academicYear` | String | yes | no | — | Academic year |
| `examType` | String | yes | no | — | midterm/assignment/final |
| `internalMarks` | Object | no | no | `null` | Internal assessment |
| `internalMarks.marks` | Number | no | no | `0` | Marks obtained |
| `internalMarks.max` | Number | no | no | `0` | Maximum marks |
| `externalMarks` | Object | no | no | `null` | External exam |
| `externalMarks.marks` | Number | no | no | `0` | Marks obtained |
| `externalMarks.max` | Number | no | no | `0` | Maximum marks |
| `assignmentMarks` | Object | no | no | `null` | Assignment marks |
| `assignmentMarks.marks` | Number | no | no | `0` | Marks obtained |
| `assignmentMarks.max` | Number | no | no | `0` | Maximum marks |
| `labMarks` | Object | no | no | `null` | Lab/practical marks |
| `labMarks.marks` | Number | no | no | `0` | Marks obtained |
| `labMarks.max` | Number | no | no | `0` | Maximum marks |
| `totalMarks` | Number | yes | no | `0` | Total marks obtained |
| `totalMax` | Number | yes | no | `0` | Total maximum marks |
| `percentage` | Number | yes | no | `0` | Percentage (0-100) |
| `credits` | Number | yes | no | `0` | Credit hours |
| `grade` | String | yes | no | `'F'` | Letter grade |
| `gradePoints` | Number | yes | no | `0` | Grade points (0-10) |
| `gpa` | Number | no | no | `null` | Semester GPA |
| `cgpa` | Number | no | no | `null` | Cumulative GPA |
| `isPublished` | Boolean | yes | no | `false` | Published status |
| `isAbsent` | Boolean | yes | no | `false` | Absent flag |
| `remarks` | String | no | no | `null` | Faculty remarks |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ studentId: 1, semester: 1, academicYear: 1 }`
- `{ studentId: 1, subjectCode: 1, semester: 1, academicYear: 1 }` (unique)
- `{ subjectCode: 1, semester: 1, academicYear: 1 }`
- `{ isPublished: 1 }`

---

## 12. Assignment

**Purpose:** Assignments with embedded submissions

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `title` | String | yes | no | — | Assignment title |
| `description` | String | yes | no | — | Assignment description |
| `subjectId` | ObjectId | yes | no | — | Reference to Subject |
| `subject` | String | yes | no | — | Subject name (denormalized) |
| `department` | String | yes | no | — | Department name |
| `semester` | Number | yes | no | — | Semester |
| `academicYear` | String | yes | no | — | Academic year |
| `createdBy` | String | yes | no | — | Faculty name |
| `facultyName` | String | yes | no | — | Faculty name |
| `attachmentUrl` | String | no | no | `null` | Attachment URL |
| `attachmentName` | String | no | no | `null` | Attachment filename |
| `dueDate` | Date | yes | no | — | Due date |
| `maxMarks` | Number | yes | no | — | Maximum marks |
| `passingMarks` | Number | yes | no | — | Passing marks |
| `status` | String | yes | no | `'draft'` | draft/published/closed |
| `submissions` | Array | no | no | `[]` | Student submissions |
| `submissions[].studentId` | String | yes | no | — | Student ID |
| `submissions[].studentName` | String | yes | no | — | Student name |
| `submissions[].submissionDate` | Date | yes | no | — | Submission timestamp |
| `submissions[].isLate` | Boolean | yes | no | `false` | Late submission flag |
| `submissions[].latePenalty` | Number | no | no | `0` | Late penalty percentage |
| `submissions[].fileUrl` | String | no | no | `null` | Submitted file URL |
| `submissions[].fileName` | String | no | no | `null` | Submitted filename |
| `submissions[].status` | String | yes | no | `'submitted'` | submitted/graded/returned/resubmitted |
| `submissions[].marks` | Number | no | no | `null` | Marks awarded |
| `submissions[].grade` | String | no | no | `null` | Grade |
| `submissions[].feedback` | String | no | no | `null` | Faculty feedback |
| `submissions[].gradedBy` | String | no | no | `null` | Graded by |
| `submissions[].gradedAt` | Date | no | no | `null` | Grading timestamp |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ subjectId: 1, status: 1, dueDate: -1 }`
- `{ createdBy: 1, status: 1 }`
- `{ department: 1, semester: 1, academicYear: 1 }`

---

## 13. FeeStructure

**Purpose:** Fee templates

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `code` | String | yes | no | — | Fee code (e.g., "TUITION") |
| `name` | String | yes | no | — | Fee name |
| `category` | String | yes | no | — | tuition/exam/lab/development/misc |
| `amount` | Number | yes | no | — | Fee amount |
| `frequency` | String | yes | no | `'semester'` | one_time/semester/yearly |
| `department` | String | yes | no | — | Department name |
| `program` | String | yes | no | — | Program name |
| `semester` | Number | no | no | `null` | Applicable semester |
| `year` | Number | no | no | `null` | Applicable year |
| `academicYear` | String | yes | no | — | Academic year |
| `isActive` | Boolean | no | no | `true` | Active status |
| `description` | String | no | no | `null` | Description |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ code: 1, academicYear: 1 }` (unique)
- `{ department: 1, program: 1, semester: 1, academicYear: 1 }`
- `{ category: 1 }`
- `{ isActive: 1 }`

---

## 14. FeePayment

**Purpose:** Payments, installments, fines, scholarships (embedded subdocuments)

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `studentId` | String | yes | no | — | Student ID (denormalized) |
| `studentName` | String | yes | no | — | Student name (denormalized) |
| `feeStructureId` | ObjectId | yes | no | — | Reference to FeeStructure |
| `feeCode` | String | yes | no | — | Fee code (denormalized) |
| `feeName` | String | yes | no | — | Fee name (denormalized) |
| `category` | String | yes | no | — | Fee category |
| `totalAmount` | Number | yes | no | — | Total fee amount |
| `paidAmount` | Number | no | no | `0` | Total paid amount |
| `remainingAmount` | Number | yes | no | — | Remaining amount |
| `status` | String | yes | no | `'pending'` | pending/partial/paid/overdue |
| `semester` | Number | yes | no | — | Semester |
| `academicYear` | String | yes | no | — | Academic year |
| `installments` | Array | no | no | `[]` | Installment schedule |
| `installments[].installmentNumber` | Number | yes | no | — | Installment number |
| `installments[].amount` | Number | yes | no | — | Installment amount |
| `installments[].dueDate` | Date | yes | no | — | Due date |
| `installments[].paidAmount` | Number | no | no | `0` | Paid amount |
| `installments[].remainingAmount` | Number | yes | no | — | Remaining amount |
| `installments[].status` | String | yes | no | `'upcoming'` | upcoming/due/overdue/paid/partial |
| `installments[].paidDate` | Date | no | no | `null` | Payment date |
| `installments[].lateFine` | Number | no | no | `0` | Late fine amount |
| `payments` | Array | no | no | `[]` | Payment transactions |
| `payments[].receiptNumber` | String | yes | no | — | Receipt number |
| `payments[].amount` | Number | yes | no | — | Payment amount |
| `payments[].method` | String | yes | no | — | cash/card/upi/netbanking/cheque/dd/online |
| `payments[].transactionId` | String | no | no | `null` | Transaction ID |
| `payments[].status` | String | yes | no | `'completed'` | pending/completed/failed/refunded |
| `payments[].paidAt` | Date | yes | no | — | Payment timestamp |
| `payments[].collectedBy` | String | no | no | `null` | Collected by |
| `payments[].remarks` | String | no | no | `null` | Remarks |
| `fines` | Array | no | no | `[]` | Student fines |
| `fines[].reason` | String | yes | no | — | Fine reason |
| `fines[].description` | String | yes | no | — | Description |
| `fines[].amount` | Number | yes | no | — | Fine amount |
| `fines[].waivedAmount` | Number | no | no | `0` | Waived amount |
| `fines[].netAmount` | Number | yes | no | — | Net amount after waiver |
| `fines[].paidAmount` | Number | no | no | `0` | Paid amount |
| `fines[].status` | String | yes | no | `'pending'` | pending/paid/partial/waived |
| `fines[].dueDate` | Date | yes | no | — | Due date |
| `fines[].paidDate` | Date | no | no | `null` | Payment date |
| `fines[].imposedBy` | String | no | no | `null` | Imposed by |
| `fines[].waivedBy` | String | no | no | `null` | Waived by |
| `fines[].waiverReason` | String | no | no | `null` | Waiver reason |
| `scholarships` | Array | no | no | `[]` | Student scholarships |
| `scholarships[].name` | String | yes | no | — | Scholarship name |
| `scholarships[].type` | String | yes | no | — | merit/need_based/sports/government/institutional/other |
| `scholarships[].amount` | Number | yes | no | — | Scholarship amount |
| `scholarships[].percentage` | Number | no | no | `null` | Percentage discount |
| `scholarships[].provider` | String | yes | no | — | Scholarship provider |
| `scholarships[].validFrom` | Date | yes | no | — | Valid from date |
| `scholarships[].validUntil` | Date | yes | no | — | Valid until date |
| `scholarships[].status` | String | yes | no | `'active'` | active/expired/revoked |
| `scholarships[].appliedAmount` | Number | no | no | `0` | Applied amount |
| `scholarships[].approvedBy` | String | no | no | `null` | Approved by |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ studentId: 1, semester: 1, academicYear: 1 }`
- `{ studentId: 1, feeStructureId: 1 }`
- `{ status: 1, academicYear: 1 }`
- `{ "installments.status": 1, "installments.dueDate": 1 }`

---

## 15. Announcement

**Purpose:** College announcements

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `title` | String | yes | no | — | Announcement title |
| `content` | String | yes | no | — | Announcement content |
| `category` | String | yes | no | — | college/department |
| `audience` | String | yes | no | — | all/students/parents/department |
| `department` | String | no | no | `null` | Department (if category=department) |
| `semester` | Number | no | no | `null` | Target semester |
| `academicYear` | String | no | no | `null` | Academic year |
| `targetSemesters` | Array | no | no | `[]` | Target semesters |
| `priority` | String | no | no | `'normal'` | low/normal/high/urgent |
| `attachments` | Array | no | no | `[]` | Attachment objects |
| `attachments[].url` | String | yes | no | — | Attachment URL |
| `attachments[].name` | String | yes | no | — | Filename |
| `attachments[].type` | String | yes | no | — | MIME type |
| `isActive` | Boolean | no | no | `true` | Active status |
| `publishedAt` | Date | no | no | `null` | Publication timestamp |
| `expiresAt` | Date | no | no | `null` | Expiration timestamp |
| `createdBy` | String | yes | no | — | Created by |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ audience: 1, isActive: 1 }`
- `{ department: 1, isActive: 1 }`
- `{ publishedAt: -1 }`
- `{ category: 1, isActive: 1 }`
- `{ semester: 1, academicYear: 1 }`
- `{ expiresAt: 1 }` (TTL, partial filter: `{ isActive: true }`)

---

## 16. KnowledgeBase

**Purpose:** AI knowledge repository for Gemini

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `category` | String | yes | no | — | campus_info/academic/fees/exam_results/hostel/library/placements/events/rules/guidelines/procedures/faqs/courses/faculty |
| `title` | String | yes | no | — | Knowledge entry title |
| `content` | String | yes | no | — | Detailed content |
| `intent` | String | no | no | `null` | Associated chatbot intent |
| `keywords` | Array | no | no | `[]` | Search keywords |
| `synonyms` | Array | no | no | `[]` | Keyword synonyms |
| `examples` | Array | no | no | `[]` | Example queries |
| `responseTemplates` | Array | no | no | `[]` | Pre-built response templates |
| `embedding` | Array | no | no | `[]` | Vector embeddings for semantic search |
| `source` | String | no | no | `null` | Knowledge source |
| `department` | String | no | no | `null` | Department-specific |
| `priority` | Number | no | no | `0` | Priority (higher = more relevant) |
| `isActive` | Boolean | no | no | `true` | Active status |
| `lastUpdatedBy` | String | no | no | `null` | Last updated by |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ category: 1, isActive: 1 }`
- `{ keywords: 1 }`
- `{ intent: 1 }`
- `{ priority: -1 }`
- `{ embedding: 1 }` (when vector search is enabled)

---

## 17. Conversation

**Purpose:** WhatsApp conversations with embedded messages

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `phone` | String | yes | UK | — | Phone number (E.164 format) |
| `jid` | String | yes | no | — | WhatsApp JID |
| `contactName` | String | no | no | `null` | Contact name |
| `lastMessage` | String | no | no | `null` | Last message preview |
| `lastMessageAt` | Date | no | no | `null` | Last message timestamp |
| `lastMessageDirection` | String | no | no | `null` | incoming/outgoing |
| `unreadCount` | Number | no | no | `0` | Unread message count |
| `isActive` | Boolean | no | no | `true` | Active status |
| `studentId` | String | no | no | `null` | Linked student ID |
| `userId` | ObjectId | no | no | `null` | Linked user ID |
| `messages` | Array | no | no | `[]` | Embedded messages |
| `messages[].messageId` | String | yes | no | — | WhatsApp message ID |
| `messages[].direction` | String | yes | no | — | incoming/outgoing |
| `messages[].type` | String | yes | no | `'text'` | text/image/video/document/audio/other |
| `messages[].content` | String | yes | no | — | Message content |
| `messages[].status` | String | yes | no | `'received'` | received/sent/delivered/read/failed |
| `messages[].timestamp` | Date | yes | no | — | Message timestamp |
| `messages[].requestId` | String | no | no | `null` | Request ID for tracking |
| `messages[].fromMe` | Boolean | yes | no | `false` | Sent by bot flag |
| `messages[].pushName` | String | no | no | `null` | Sender's push name |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ phone: 1 }` (unique)
- `{ lastMessageAt: -1 }`
- `{ studentId: 1 }`
- `{ userId: 1 }`
- `{ isActive: 1 }`

---

## 18. Notification

**Purpose:** Delivery tracking

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | auto | PK | — | Document identifier |
| `type` | String | yes | no | — | attendance_alert/fee_reminder/exam_reminder/holiday_notice/timetable_update/general_announcement/ai_response |
| `recipient` | Object | yes | no | — | Recipient details |
| `recipient.userId` | ObjectId | no | no | `null` | Reference to User |
| `recipient.studentId` | String | no | no | `null` | Student ID |
| `recipient.role` | String | no | no | `null` | student/parent |
| `recipient.phone` | String | no | no | `null` | Phone number |
| `message` | Object | yes | no | — | Message content |
| `message.title` | String | yes | no | — | Notification title |
| `message.body` | String | yes | no | — | Notification body |
| `message.subject` | String | no | no | `null` | Email subject |
| `status` | String | yes | no | `'pending'` | pending/queued/sent/failed/cancelled |
| `priority` | String | no | no | `'normal'` | low/normal/high/urgent |
| `sentAt` | Date | no | no | `null` | Sent timestamp |
| `failedAt` | Date | no | no | `null` | Failure timestamp |
| `failReason` | String | no | no | `null` | Failure reason |
| `retryCount` | Number | no | no | `0` | Retry count |
| `scheduledFor` | Date | no | no | `null` | Scheduled send time |
| `reference` | Object | no | no | `null` | Reference to related entity |
| `reference.type` | String | yes | no | — | attendance/fee/assignment/announcement |
| `reference.id` | ObjectId | yes | no | — | Related document ID |
| `createdAt` | Date | auto | no | `Date.now` | Creation timestamp |
| `updatedAt` | Date | auto | no | `Date.now` | Last update timestamp |

**Indexes:**
- `{ type: 1 }`
- `{ priority: 1 }`
- `{ status: 1, priority: 1, scheduledFor: 1 }`
- `{ "recipient.userId": 1, status: 1 }`
- `{ "recipient.studentId": 1, type: 1 }`
- `{ "recipient.studentId": 1, status: 1 }`
- `{ createdAt: -1 }`
