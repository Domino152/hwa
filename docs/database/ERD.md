# Entity Relationship Diagram — HITS Database

## Overview

This document contains Mermaid ERD diagrams showing all 18 collections and their relationships.

## Academic Hierarchy ERD

```mermaid
erDiagram
    COLLEGE {
        string _id PK
        string name
        string code UK
        boolean whatsappEnabled
        object address
        object contact
    }
    
    DEPARTMENT {
        string _id PK
        string name
        string code UK
        string collegeId FK
        string hodName
        string email
        boolean isActive
    }
    
    PROGRAM {
        string _id PK
        string name
        string code UK
        string departmentId FK
        string degree
        number durationYears
        boolean isActive
    }
    
    BATCH {
        string _id PK
        string programId FK
        number year
        string name
        number totalStudents
        boolean isActive
    }
    
    SECTION {
        string _id PK
        string batchId FK
        string name
        string advisorName
        number capacity
        boolean isActive
    }
    
    STUDENT {
        string _id PK
        string userId FK
        string studentId UK
        string registerNumber UK
        string sectionId FK
        string fullName
        string email
        string phone
        string department
        string program
        number semester
        string batch
        string section
    }
    
    COLLEGE ||--o{ DEPARTMENT : "has"
    DEPARTMENT ||--o{ PROGRAM : "offers"
    PROGRAM ||--o{ BATCH : "has"
    BATCH ||--o{ SECTION : "has"
    SECTION ||--o{ STUDENT : "has"
```

## User & Auth ERD

```mermaid
erDiagram
    USER {
        string _id PK
        string fullName
        string username UK
        string passwordHash
        string role
        string studentId
        string whatsappNumber UK
        string department
        number year
        string section
        boolean isActive
    }
    
    STUDENT {
        string _id PK
        string userId FK
        string studentId UK
        string parentId FK
        string fullName
    }
    
    USER ||--o| STUDENT : "linked to"
    USER ||--o| STUDENT : "parent of"
```

## Attendance ERD

```mermaid
erDiagram
    DAILY_ATTENDANCE {
        string _id PK
        string studentId FK
        string subject
        date date
        string status
        string markedBy FK
        number semester
        string academicYear
        string notes
    }
    
    STUDENT ||--o{ DAILY_ATTENDANCE : "has"
```

## Timetable ERD

```mermaid
erDiagram
    SCHEDULE {
        string _id PK
        string sectionId FK
        string dayOfWeek
        number periodNumber
        string timeSlot
        string subject
        string faculty
        string room
        string type
        number semester
        string academicYear
        array holidays
    }
    
    SECTION ||--o{ SCHEDULE : "has"
```

## Academics ERD

```mermaid
erDiagram
    SUBJECT {
        string _id PK
        string code UK
        string name
        string department
        number semester
        number credits
        string type
        string faculty
        array prerequisites
        boolean isActive
    }
    
    RESULT {
        string _id PK
        string studentId FK
        string subjectCode
        string subjectName
        number semester
        string academicYear
        object internalMarks
        object externalMarks
        object assignmentMarks
        object labMarks
        number totalMarks
        number totalMax
        number percentage
        number credits
        string grade
        number gradePoints
        boolean isPublished
    }
    
    ASSIGNMENT {
        string _id PK
        string title
        string description
        string subjectId FK
        string department
        number semester
        string academicYear
        string createdBy
        string facultyName
        date dueDate
        number maxMarks
        number passingMarks
        string status
        array submissions
    }
    
    STUDENT ||--o{ RESULT : "has"
    SUBJECT ||--o{ ASSIGNMENT : "has"
```

## Fees ERD

```mermaid
erDiagram
    FEE_STRUCTURE {
        string _id PK
        string code UK
        string name
        string category
        number amount
        string frequency
        string department
        string program
        number semester
        string academicYear
        boolean isActive
    }
    
    FEE_PAYMENT {
        string _id PK
        string studentId FK
        string feeStructureId FK
        string feeCode
        string feeName
        string category
        number totalAmount
        number paidAmount
        number remainingAmount
        string status
        number semester
        string academicYear
        array installments
        array payments
        array fines
        array scholarships
    }
    
    FEE_STRUCTURE ||--o{ FEE_PAYMENT : "defines"
    STUDENT ||--o{ FEE_PAYMENT : "has"
```

## Communication ERD

```mermaid
erDiagram
    ANNOUNCEMENT {
        string _id PK
        string title
        string content
        string category
        string audience
        string department
        number semester
        string academicYear
        array targetSemesters
        string priority
        array attachments
        boolean isActive
        date publishedAt
        date expiresAt
    }
    
    KNOWLEDGE_BASE {
        string _id PK
        string category
        string title
        string content
        string intent
        array keywords
        array synonyms
        array examples
        array responseTemplates
        array embedding
        string source
        string department
        number priority
        boolean isActive
        string lastUpdatedBy
    }
    
    NOTIFICATION {
        string _id PK
        string type
        object recipient
        object message
        string status
        string priority
        date sentAt
        object reference
        number retryCount
    }
```

## WhatsApp ERD

```mermaid
erDiagram
    CONVERSATION {
        string _id PK
        string phone UK
        string jid
        string contactName
        string lastMessage
        date lastMessageAt
        string lastMessageDirection
        number unreadCount
        boolean isActive
        string studentId
        string userId
        array messages
    }
    
    CONVERSATION ||--o{ CONVERSATION : "contains"
```

## Complete ERD (All Relationships)

```mermaid
erDiagram
    COLLEGE ||--o{ DEPARTMENT : "has"
    DEPARTMENT ||--o{ PROGRAM : "offers"
    PROGRAM ||--o{ BATCH : "has"
    BATCH ||--o{ SECTION : "has"
    SECTION ||--o{ STUDENT : "has"
    SECTION ||--o{ SCHEDULE : "has"
    
    USER ||--o| STUDENT : "linked to"
    USER ||--o| STUDENT : "parent of"
    
    STUDENT ||--o{ DAILY_ATTENDANCE : "has"
    STUDENT ||--o{ RESULT : "has"
    STUDENT ||--o{ FEE_PAYMENT : "has"
    
    SUBJECT ||--o{ ASSIGNMENT : "has"
    
    FEE_STRUCTURE ||--o{ FEE_PAYMENT : "defines"
    
    COLLEGE {
        string _id PK
        string name
        string code UK
    }
    
    DEPARTMENT {
        string _id PK
        string name
        string code UK
        string collegeId FK
    }
    
    PROGRAM {
        string _id PK
        string name
        string code UK
        string departmentId FK
    }
    
    BATCH {
        string _id PK
        string programId FK
        number year
    }
    
    SECTION {
        string _id PK
        string batchId FK
        string name
    }
    
    STUDENT {
        string _id PK
        string userId FK
        string studentId UK
        string sectionId FK
    }
    
    USER {
        string _id PK
        string username UK
        string role
    }
    
    DAILY_ATTENDANCE {
        string _id PK
        string studentId FK
        date date
        string status
    }
    
    SCHEDULE {
        string _id PK
        string sectionId FK
        string dayOfWeek
    }
    
    SUBJECT {
        string _id PK
        string code UK
        string name
    }
    
    RESULT {
        string _id PK
        string studentId FK
        string subjectCode
    }
    
    ASSIGNMENT {
        string _id PK
        string subjectId FK
        string title
    }
    
    FEE_STRUCTURE {
        string _id PK
        string code UK
        string name
    }
    
    FEE_PAYMENT {
        string _id PK
        string studentId FK
        string feeStructureId FK
    }
    
    ANNOUNCEMENT {
        string _id PK
        string title
        string category
    }
    
    KNOWLEDGE_BASE {
        string _id PK
        string category
        string intent
    }
    
    NOTIFICATION {
        string _id PK
        string type
        string status
    }
    
    CONVERSATION {
        string _id PK
        string phone UK
    }
```

## Key Relationships Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| College → Department | 1:N | One college has many departments |
| Department → Program | 1:N | One department offers many programs |
| Program → Batch | 1:N | One program has many admission batches |
| Batch → Section | 1:N | One batch has many sections |
| Section → Student | 1:N | One section has many students |
| Section → Schedule | 1:N | One section has many timetable entries |
| User → Student | 1:1 | One user links to one student profile |
| User → Student (parent) | 1:1 | One user can be parent of one student |
| Student → DailyAttendance | 1:N | One student has many attendance records |
| Student → Result | 1:N | One student has many results |
| Student → FeePayment | 1:N | One student has many fee payments |
| Subject → Assignment | 1:N | One subject has many assignments |
| FeeStructure → FeePayment | 1:N | One fee structure defines many payments |
| Conversation → Messages | 1:N | One conversation has many messages (embedded) |
| Assignment → Submissions | 1:N | One assignment has many submissions (embedded) |
| FeePayment → Installments | 1:N | One fee payment has many installments (embedded) |
| FeePayment → Payments | 1:N | One fee payment has many transactions (embedded) |
| FeePayment → Fines | 1:N | One fee payment has many fines (embedded) |
| FeePayment → Scholarships | 1:N | One fee payment has many scholarships (embedded) |
