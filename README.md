# Hach-2026-F Backend

> A robust backend API for Hach-2026-F, a learning platform. Built with Node.js, Express, and PostgreSQL with multi-tenancy support.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

Hach-2026-F Backend is a multi-tenant learning management system designed specifically for educational institutions.

## ✨ Features

### Core Functionality
- **Multi-tenancy Support**: School-based tenant isolation with domain-based routing
- **Authentication & Authorization**: Secure authentication using Better Auth with role-based access control
- **User Management**: Support for students, instructors, admins, and super admins
- **Course Management**: Complete CRUD operations for courses, lectures, and learning materials
- **Assessment System**: MCQ, coding challenges, and paragraph-based questions
- **Progress Tracking**: Track lecture completion and assignment submissions
- **Analytics**: Comprehensive analytics for student performance and engagement
- **CSV Import**: Bulk data import functionality for students, admins, and schools
- **Comment System**: Discussion and collaboration features
- **Package Management**: Subscription and package management for schools

### Security Features
- Rate limiting
- CORS protection
- Tenant isolation
- Role-based access control
- Secure password reset functionality
- Token-based authentication

## 🛠️ Tech Stack

### Core Technologies
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js (v5.2.1)
- **Language**: TypeScript (v5.9.3)
- **Database**: PostgreSQL with Drizzle ORM (v0.45.1)
- **Authentication**: Better Auth (v1.4.9)

### Key Dependencies
- **Database**: `drizzle-orm`, `pg`, `postgres`
- **Validation**: Zod (v4.2.1)
- **Email**: Node Mailjet (v6.0.11)
- **File Upload**: Multer (v2.0.2)
- **CSV Parsing**: Papa Parse (v5.5.3)
- **Security**: CORS, Express Rate Limit
- **Development**: Nodemon, TSX, Prettier, ESLint

## 🏗️ Architecture

### Directory Structure
```
hach-2026-f-backend/
├── src/
│   ├── controllers/       # Request handlers for each resource
│   │   ├── validation/    # Input validation schemas
│   │   ├── admin.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── assignment.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── course.controller.ts
│   │   └── ...
│   ├── db/                # Database configuration and schema
│   │   ├── auth-schema.ts
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── middleware/        # Express middleware
│   │   ├── role.middleware.ts
│   │   └── tenant.middleware.ts
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   │   ├── mail.service.ts
│   │   └── password.service.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── apiResponse.utils.ts
│   │   ├── auth.util.ts
│   │   ├── permissions.util.ts
│   │   └── token.util.ts
│   └── index.ts           # Application entry point
├── migrations/            # Database migrations
├── uploads/               # File upload directory
└── scripts/               # Utility scripts
```

### Multi-Tenancy Architecture

The application uses a **schema-per-tenant** approach where:
1. Each school has a unique domain identifier
2. Requests include `x-school-domain` header for tenant resolution
3. Tenant middleware resolves and attaches school context to requests
4. Database queries are automatically scoped to the current tenant

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- PostgreSQL >= 14.x
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/careercafe-in/hach-2026-f-backend.git
cd hach-2026-f-backend
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Generate migration files
pnpm drizzle:generate

# Run migrations
pnpm drizzle:migrate

# Or push schema directly (development)
pnpm drizzle:push
```

5. **Generate authentication schema**
```bash
pnpm auth:generate
```

6. **Start development server**
```bash
pnpm dev
```

The server will start on `http://localhost:5000` (or your configured PORT).

### Building for Production

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
CLIENT_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/hach2026f

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:5000

# Email Configuration (Mailjet)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret
MAILJET_SENDER_EMAIL=noreply@yourdomain.com
MAILJET_SENDER_NAME=Hach-2026-F

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secret key for authentication
- `CLIENT_URL`: Frontend application URL for CORS
- `MAILJET_API_KEY` & `MAILJET_API_SECRET`: For email functionality

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require authentication via session cookies. Include credentials in requests:
```javascript
fetch('http://localhost:5000/api/student', {
  credentials: 'include',
  headers: {
    'x-school-domain': 'myschool.hach-2026-f.vercel.app'
  }
})
```

### API Endpoints

#### Authentication
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-out` - User logout
- `GET /api/me` - Get current session
- `POST /api/password/forgot` - Request password reset
- `POST /api/password/reset` - Reset password with token

#### Super Admin (No tenant required)
- `GET /api/superAdmin/schools` - List all schools
- `POST /api/superAdmin/school` - Create new school
- `PUT /api/superAdmin/school/:id` - Update school
- `DELETE /api/superAdmin/school/:id` - Delete school

#### Admin Management (Requires tenant)
- `GET /api/admin` - List admins
- `POST /api/admin` - Create admin
- `POST /api/admin/csv` - Bulk import admins
- `GET /api/admin/:id` - Get admin details
- `PUT /api/admin/:id` - Update admin
- `DELETE /api/admin/:id` - Delete admin

#### Student Management
- `GET /api/student` - List students
- `POST /api/student` - Create student
- `POST /api/student/csv` - Bulk import students
- `GET /api/student/:id` - Get student details
- `PUT /api/student/:id` - Update student
- `DELETE /api/student/:id` - Delete student

#### Course Management
- `GET /api/course` - List courses
- `POST /api/course` - Create course
- `GET /api/course/:id` - Get course details
- `PUT /api/course/:id` - Update course
- `DELETE /api/course/:id` - Delete course

#### Instructor Management
- `GET /api/instructor` - List instructors
- `POST /api/instructor` - Create instructor
- `GET /api/instructor/:id` - Get instructor details
- `PUT /api/instructor/:id` - Update instructor
- `DELETE /api/instructor/:id` - Delete instructor

#### Lecture Management
- `GET /api/lecture` - List lectures
- `POST /api/lecture` - Create lecture
- `GET /api/lecture/:id` - Get lecture details
- `PUT /api/lecture/:id` - Update lecture
- `DELETE /api/lecture/:id` - Delete lecture
- `POST /api/lecture-watched` - Mark lecture as watched
- `GET /api/lecture-watched/student/:studentId` - Get watched lectures

#### Question/Assessment Management
- `GET /api/question` - List questions
- `POST /api/question` - Create question (MCQ/Coding/Paragraph)
- `GET /api/question/:id` - Get question details
- `PUT /api/question/:id` - Update question
- `DELETE /api/question/:id` - Delete question

#### Assignment Management
- `GET /api/assignment` - List assignments
- `POST /api/assignment` - Create assignment
- `GET /api/assignment/:id` - Get assignment details
- `PUT /api/assignment/:id` - Update assignment
- `DELETE /api/assignment/:id` - Delete assignment
- `POST /api/assignment-completed` - Submit assignment
- `GET /api/assignment-completed/student/:studentId` - Get completed assignments

#### Package Management
- `GET /api/packages` - List available packages
- `POST /api/packages` - Create package
- `GET /api/packages/:id` - Get package details
- `PUT /api/packages/:id` - Update package
- `DELETE /api/packages/:id` - Delete package

#### Analytics
- `GET /api/analytics/overview` - Get platform overview
- `GET /api/analytics/student/:id` - Get student analytics
- `GET /api/analytics/course/:id` - Get course analytics
- `GET /api/analytics/engagement` - Get engagement metrics

#### Comments
- `GET /api/comment` - List comments
- `POST /api/comment` - Create comment
- `GET /api/comment/:id` - Get comment details
- `PUT /api/comment/:id` - Update comment
- `DELETE /api/comment/:id` - Delete comment

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "statusCode": 200
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🗄️ Database Schema

### Key Tables

#### Users & Authentication
- `controller` - Parent/Admin/SuperAdmin users
- `student` - Student users
- `instructor` - Course instructors
- `user` - Better Auth user table
- `session` - User sessions

#### School Management
- `school` - School/tenant information
- `schoolDomain` - Additional domains for schools
- `schoolController` - School-admin relationships

#### Course Content
- `course` - Course information
- `lecture` - Video lectures and content
- `courseInstructor` - Course-instructor relationships
- `comment` - User comments and discussions

#### Assessments
- `qna` - Base question table
- `mcq` - Multiple choice questions
- `coding` - Coding challenges
- `paragraph` - Paragraph questions
- `assignment` - Assignment definitions

#### Progress Tracking
- `lectureWatched` - Lecture completion tracking
- `assignmentCompleted` - Assignment submissions
- `qnaCompleted` - Question completion tracking

#### Subscription
- `packages` - Available subscription packages

### Schema Enums
- `qnaType`: `['mcq', 'coding', 'paragraph']`
- `studentRole`: `['individual', 'school']`
- `status`: `['pending', 'completed', 'inProgress']`
- `difficultyLevel`: `['easy', 'medium', 'hard']`
- `controllerRole`: `['parent', 'admin', 'superAdmin']`

## 👨‍💻 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server with hot reload
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting

# Database
pnpm drizzle:push     # Push schema changes to database
pnpm drizzle:migrate  # Run migrations
pnpm drizzle:generate # Generate migration files

# Authentication
pnpm auth:generate    # Generate Better Auth schema

# Testing
pnpm seed:test        # Seed test data
```

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **lint-staged** for staged file linting

Code is automatically formatted on commit.

### Adding New Endpoints

1. **Create Controller**
```typescript
// src/controllers/example.controller.ts
export const createExample = async (req: Request, res: Response) => {
  try {
    // Your logic here
    return ApiSuccess(res, "Success", 200, data);
  } catch (error) {
    return ApiError(res, "Error message", 500);
  }
};
```

2. **Create Route**
```typescript
// src/routes/example.route.ts
import { Router } from "express";
import { createExample } from "../controllers/example.controller";
import { requireRole } from "../middleware/role.middleware";

const router = Router();
router.post("/", requireRole(["admin"]), createExample);
export default router;
```

3. **Register Route**
```typescript
// src/index.ts
import exampleRouter from "./routes/example.route";
app.use("/api/example", tenantResolver, exampleRouter);
```

### Middleware Usage

#### Tenant Resolution
```typescript
// Automatically resolves school from x-school-domain header
app.use("/api/student", tenantResolver, studentRouter);
```

#### Role-Based Access Control
```typescript
import { requireRole, requireAdminOrSuperAdmin } from "../middleware/role.middleware";

// Require specific roles
router.post("/admin", requireRole(["admin", "superAdmin"]), createAdmin);

// Require admin for specific school
router.get("/students", requireOwnSchool, getStudents);
```

## 🚀 Deployment

### Docker Deployment (Recommended)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 5000

CMD ["pnpm", "start"]
```

### Environment-specific Configuration

#### Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:pass@prod-host:5432/curiotech
BETTER_AUTH_URL=https://api.hach-2026-f.vercel.app
CLIENT_URL=https://hach-2026-f.vercel.app
```

#### Staging
```bash
NODE_ENV=staging
DATABASE_URL=postgresql://staging-user:pass@staging-host:5432/curiotech
BETTER_AUTH_URL=https://api-staging.hach-2026-f.vercel.app
CLIENT_URL=https://staging.hach-2026-f.vercel.app
```

### Database Migrations

Always run migrations in production:
```bash
pnpm drizzle:migrate
```

### Health Check

Test the API:
```bash
curl http://localhost:5000/test
```

Expected response:
```json
{
  "success": true,
  "message": "API is working fine",
  "data": {
    "time": "2026-01-02T10:30:00.000Z"
  },
  "statusCode": 200
}
```

## 🤝 Contributing

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. **Write Code**: Follow TypeScript and ESLint conventions
2. **Test**: Ensure all endpoints work correctly
3. **Format**: Code is auto-formatted on commit
4. **Document**: Update API documentation if needed
5. **Submit PR**: Include description of changes

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] No console.logs in production code
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Database queries are optimized
- [ ] Security best practices followed
- [ ] Documentation is updated

## 📝 License

ISC License - Copyright (c) 2025 Career Cafe

## 🙋 Support

For issues, questions, or contributions:
- **Issues**: [GitHub Issues](https://github.com/careercafe-in/hach-2026-f-backend/issues)
- **Repository**: [GitHub](https://github.com/careercafe-in/hach-2026-f-backend)

## 🗺️ Roadmap

### Current Status
- ✅ Multi-tenant architecture
- ✅ Authentication & authorization
- ✅ Core CRUD operations
- ✅ CSV import functionality
- ✅ Analytics endpoints

### Planned Features
- [ ] Enhanced unit and integration tests
- [ ] Query optimization
- [ ] WebSocket support for real-time features
- [ ] Advanced analytics dashboard
- [ ] API rate limiting per tenant
- [ ] Enhanced file upload capabilities
- [ ] Email templates management
- [ ] Notification system
- [ ] Internationalization (i18n)

## 📊 Performance Considerations

- Database connection pooling enabled
- Rate limiting to prevent abuse
- Efficient database queries with Drizzle ORM
- Tenant isolation for data security
- Optimized middleware chain

---

**Built with ❤️ by Career Cafe Team**
