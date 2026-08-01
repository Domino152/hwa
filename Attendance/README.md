# College Attendance Management System

A professional web application for managing student attendance in colleges. Built with React + TypeScript frontend and Node.js + Express + MongoDB backend.

## Features

- **Dashboard** - Overview with stats cards, today's summary, and recent activity
- **Student Management** - CRUD operations with search, filter by department/year/section
- **Attendance Marking** - Select class details, load students, mark present/absent, save
- **Attendance History** - View and filter past attendance records

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Query (TanStack Query)
- React Hook Form + Zod
- Lucide React icons
- React Router DOM

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- Zod validation
- CORS enabled

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd Whatsapp_chat
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college_attendance
NODE_ENV=development
```

Start the backend server:

```bash
npm run dev
```

The server will run on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on http://localhost:5173

### 4. MongoDB

Make sure MongoDB is running locally on port 27017, or update the `MONGODB_URI` in the backend `.env` file to point to your MongoDB instance.

## API Endpoints

### Students
- `POST /api/students` - Create a student
- `GET /api/students` - Get all students (with filters)
- `GET /api/students/:id` - Get student by ID
- `PUT /api/students/:id` - Update a student
- `DELETE /api/students/:id` - Delete a student

### Attendance
- `POST /api/attendance` - Mark attendance (bulk)
- `GET /api/attendance` - Get attendance records (with filters)
- `GET /api/attendance/student/:studentId` - Get attendance by student
- `GET /api/attendance/summary` - Get dashboard summary

## Project Structure

```
Whatsapp_chat/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/      # Error handler, validation
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities, error classes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── layout/     # Layout components
│   │   │   ├── dashboard/  # Dashboard components
│   │   │   ├── students/   # Student components
│   │   │   └── attendance/ # Attendance components
│   │   ├── hooks/          # React Query hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities
│   └── package.json
└── README.md
```

## Default Departments

- CSE (Computer Science)
- ECE (Electronics)
- EEE (Electrical)
- MECH (Mechanical)
- CIVIL
- IT (Information Technology)

## License

MIT
