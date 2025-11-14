# TeleMedCare Backend Server

A comprehensive backend server for the TeleMedCare telemedicine platform built with Node.js and Express.js.

## Features

- **User Management**: Authentication and user profile management for patients, doctors, technicians, and administrators
- **Appointment System**: Complete appointment booking, scheduling, and management
- **Device Integration**: Real-time medical device readings and data collection
- **Medical Kit Tracking**: Management of medical equipment kits and their deployment
- **RESTful API**: Clean, well-documented API endpoints
- **CORS Support**: Cross-origin resource sharing for frontend integration

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get all users (with optional role filtering)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Appointments
- `GET /api/appointments` - Get appointments (with filtering by user/role/status)
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Device Readings
- `GET /api/device-readings` - Get device readings (with appointment filtering)
- `POST /api/device-readings` - Submit new device reading

### Medical Kits
- `GET /api/medical-kits` - Get medical kits (with status/technician filtering)
- `PUT /api/medical-kits/:id` - Update medical kit status

### Health Check
- `GET /api/health` - Server health status

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Start the production server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3001` by default.

## Environment Variables

- `PORT` - Server port (default: 3001)

## Data Structure

The server uses in-memory data stores for demonstration purposes. In a production environment, these should be replaced with proper database connections (PostgreSQL, MongoDB, etc.).

### Sample Data

The server comes pre-loaded with sample data including:
- Demo users for each role (patient, doctor, technician, admin)
- Sample appointments and medical records
- Device readings and medical kit information

## Demo Credentials

- **Patient**: patient@test.com
- **Doctor**: doctor@test.com  
- **Technician**: tech@test.com
- **Admin**: admin@test.com

All demo accounts accept any password for login.

## Development

For development, use `npm run dev` to start the server with nodemon for automatic restarts on file changes.

## Production Considerations

Before deploying to production:

1. Replace in-memory data stores with proper databases
2. Implement proper password hashing and JWT authentication
3. Add input validation and sanitization
4. Implement rate limiting and security middleware
5. Add comprehensive error handling and logging
6. Set up proper environment configuration
7. Add API documentation (Swagger/OpenAPI)
8. Implement proper CORS policies
9. Add health monitoring and metrics
10. Set up proper backup and recovery procedures