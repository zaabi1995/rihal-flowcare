# FlowCare - Queue & Appointment Booking System

A RESTful API for managing appointment bookings across multiple branches with staff assignment, slot management, and audit trails.

Built for Rihal CODESTAKER 2026.

## Tech Stack

- Node.js 20 + Express 4
- PostgreSQL 16
- Sequelize 6 ORM
- Basic Authentication
- multer for file uploads

## Quick Start

### With Docker (recommended)

```bash
docker compose up --build
# in another terminal:
docker compose exec app npm run seed
```

The API will be at `http://localhost:3000`

### Without Docker

1. Make sure PostgreSQL is running
2. Create a database called `flowcare`
3. Copy `.env.example` to `.env` and update the values

```bash
cp .env.example .env
npm install
npm run seed
npm start
```

## Default Credentials

| Role     | Email                | Password  |
|----------|---------------------|-----------|
| Admin    | admin               | admin123  |
| Manager  | sara@flowcare.om    | staff123  |
| Staff    | rashid@flowcare.om  | staff123  |
| Customer | ahmed@example.com   | pass123   |

## API Endpoints

### Public (no auth required)

```bash
# List branches
curl http://localhost:3000/api/branches

# Services for a branch
curl http://localhost:3000/api/branches/{branchId}/services

# Available slots
curl "http://localhost:3000/api/slots/available?branchId={id}&serviceTypeId={id}&date=2026-03-15"
```

### Auth

```bash
# Register (needs ID image, 2-5MB)
curl -X POST http://localhost:3000/api/auth/register \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "password=test123" \
  -F "phone=+968 9900 0000" \
  -F "idImage=@/path/to/id.jpg"

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"
```

### Appointments

```bash
# Book (as customer)
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Basic $(echo -n 'ahmed@example.com:pass123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"slotId": "..."}'

# List own appointments
curl http://localhost:3000/api/appointments \
  -H "Authorization: Basic $(echo -n 'ahmed@example.com:pass123' | base64)"

# Cancel
curl -X DELETE http://localhost:3000/api/appointments/{id} \
  -H "Authorization: Basic $(echo -n 'ahmed@example.com:pass123' | base64)"

# Reschedule
curl -X PUT http://localhost:3000/api/appointments/{id} \
  -H "Authorization: Basic $(echo -n 'ahmed@example.com:pass123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"slotId": "new-slot-id"}'

# Update status (staff/manager/admin)
curl -X PATCH http://localhost:3000/api/appointments/{id}/status \
  -H "Authorization: Basic $(echo -n 'rashid@flowcare.om:staff123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"status": "checked-in"}'
```

### Slots (manager/admin)

```bash
# Create a slot
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"branchId": "...", "serviceTypeId": "...", "date": "2026-03-16", "startTime": "09:00", "endTime": "09:30"}'

# Bulk create
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
  -H "Content-Type: application/json" \
  -d '[{"branchId": "...", "serviceTypeId": "...", "date": "2026-03-16", "startTime": "09:00", "endTime": "09:30"}, {"branchId": "...", "serviceTypeId": "...", "date": "2026-03-16", "startTime": "10:00", "endTime": "10:30"}]'

# List slots (admin can add ?includeDeleted=true)
curl http://localhost:3000/api/slots \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"

# Soft delete
curl -X DELETE http://localhost:3000/api/slots/{id} \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"
```

### Staff & Customers

```bash
# List staff
curl http://localhost:3000/api/staff \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"

# Assign staff to services
curl -X POST http://localhost:3000/api/staff/{staffId}/services \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"serviceTypeIds": ["service-uuid-1", "service-uuid-2"]}'

# List customers (admin only)
curl http://localhost:3000/api/customers \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"
```

### Audit Logs

```bash
# View logs (admin: all, manager: branch only)
curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"

# Export CSV (admin only)
curl -X POST http://localhost:3000/api/audit-logs/export \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
  --output audit-logs.csv
```

### Admin

```bash
# Set retention period
curl -X POST http://localhost:3000/api/admin/soft-delete-retention \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"days": 14}'

# Run cleanup manually
curl -X POST http://localhost:3000/api/admin/cleanup \
  -H "Authorization: Basic $(echo -n 'admin:admin123' | base64)"
```

## Pagination & Search

All list endpoints support:
- `?page=1&pageSize=20` — pagination
- `?search=term` — case-insensitive search

Response format:
```json
{
  "results": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

## Rate Limiting

- Global: 100 requests per 15 minutes per IP
- Booking: Max 3 appointments per hour per customer

## Roles

| Role     | Scope        | Can do                                                    |
|----------|-------------|-----------------------------------------------------------|
| Admin    | System-wide | Everything                                                |
| Manager  | Own branch  | Manage slots, assign staff, view branch appointments/logs |
| Staff    | Own schedule | View schedule, update appointment status, add notes       |
| Customer | Own data    | Book, reschedule, cancel appointments, view history       |

## Seed Data

The seed script creates:
- 2 branches (Al Khuwair + Salalah)
- 4 services per branch
- 6 staff members (1 manager + 2 staff per branch)
- 5 customers
- 12+ slots across the next 5 days
