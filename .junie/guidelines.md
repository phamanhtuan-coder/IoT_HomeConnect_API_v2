# Junie Development Guidelines

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Database Management](#database-management)
6. [Error Handling](#error-handling)
7. [API Documentation](#api-documentation)
8. [Testing](#testing)
9. [Deployment](#deployment)

## Introduction

This document provides guidelines for developing and maintaining the IoT Backend V2 project. Following these guidelines ensures code quality, maintainability, and consistency across the codebase.

## Project Structure

The project follows a modular structure organized by functionality:

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── routes/         # API route definitions
├── services/       # Business logic
├── sockets/        # Socket.io related code
├── templates/      # Email templates
├── tools/          # Utility tools
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── app.ts          # Main Express application setup
└── server.ts       # Server initialization
```

### Key Conventions:
- **Controllers**: Handle HTTP requests and responses, but delegate business logic to services
- **Services**: Contain business logic and interact with the database via Prisma
- **Routes**: Define API endpoints and connect them to controllers
- **Middleware**: Handle cross-cutting concerns like authentication, logging, etc.

## Development Workflow

### Setup
1. Clone the repository
2. Install dependencies: `npm install` or `pnpm install`
3. Set up environment variables (copy `.env.example` to `.env` and fill in values)
4. Generate Prisma client: `npx prisma generate`

### Development
1. Start development server: `npm run dev` or `pnpm dev`
2. Make changes following the coding standards
3. Test your changes locally
4. Commit changes with descriptive commit messages

### Scripts
- `npm run build`: Compile TypeScript to JavaScript
- `npm run start`: Start the production server
- `npm run dev`: Start the development server with hot-reload
- `npm run merge-postman`: Merge Postman collections

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define interfaces for all data structures
- Use proper type annotations for function parameters and return types
- Avoid using `any` type when possible

### Naming Conventions
- **Files**: Use kebab-case for filenames (e.g., `user-service.ts`)
- **Classes**: Use PascalCase (e.g., `UserService`)
- **Functions/Methods**: Use camelCase (e.g., `getUserById`)
- **Variables**: Use camelCase (e.g., `userData`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: Prefix with 'I' (e.g., `IUserData`)
- **Types**: Use PascalCase (e.g., `UserType`)

### Code Organization
- Keep functions small and focused on a single responsibility
- Group related functions in the same file or module
- Use meaningful names for variables and functions
- Add comments for complex logic
- Use JSDoc comments for public APIs

### Imports
- Group imports in the following order:
  1. Node.js built-in modules
  2. External dependencies
  3. Internal modules
- Sort imports alphabetically within each group

## Database Management

### Prisma
- Use Prisma for all database operations
- Define all database schema changes in `prisma/schema.prisma`
- Run migrations for schema changes: `npx prisma migrate dev --name <migration-name>`
- Generate Prisma client after schema changes: `npx prisma generate`

### Schema Conventions
- Use singular form for model names (e.g., `user` not `users`)
- Use snake_case for database field names
- Add comments to document fields using `/// Comment` syntax
- Define appropriate indexes for frequently queried fields
- Use appropriate field types and constraints

### Database Operations
- Use transactions for operations that modify multiple records
- Handle database errors properly
- Implement proper pagination for list endpoints
- Use optimistic concurrency control for updates when appropriate

## Error Handling

The project uses a centralized error handling approach:

### Error Types
- Use the `ErrorCodes` enum in `src/utils/errors.ts` for all error types
- Add new error codes to the enum when needed, following the established categories:
  - HTTP Errors
  - Internal Errors
  - Custom Business Errors

### Throwing Errors
- Use the `throwError` utility function to throw errors:
  ```typescript
  import { throwError, ErrorCodes } from '../utils/errors';

  if (!user) {
    throwError(ErrorCodes.NOT_FOUND, 'User not found');
  }
  ```

### Error Responses
- All API errors should return a consistent format:
  ```json
  {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "User not found"
  }
  ```

## API Documentation

### Swagger
- Document all API endpoints using Swagger JSDoc comments
- Include request and response schemas
- Document possible error responses
- Keep documentation up-to-date with code changes

### Example Swagger Documentation
```typescript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a user by their unique ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
```

## Testing

### Unit Testing
- Write unit tests for all services and utilities
- Use Jest for testing
- Mock external dependencies
- Focus on testing business logic

### Integration Testing
- Test API endpoints with real database interactions
- Use a test database for integration tests
- Reset the database state before each test

### Test Coverage
- Aim for at least 80% test coverage
- Focus on testing critical paths and edge cases

## Deployment

### Docker
- The project includes Docker configuration for containerized deployment
- Build the Docker image: `docker build -t iot-backend-v2 .`
- Run with Docker Compose: `docker-compose up -d`

### Environment Variables
- Store sensitive information in environment variables
- Use different environment files for different environments
- Never commit sensitive information to the repository

### CI/CD
- Automated tests run on pull requests
- Automated deployment to staging on merge to main branch
- Manual promotion to production

---

These guidelines are meant to evolve with the project. If you have suggestions for improvements, please discuss them with the team.
