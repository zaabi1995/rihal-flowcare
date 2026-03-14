const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FlowCare API',
      version: '1.0.0',
      description:
        'Smart Healthcare Queue & Appointment Booking System — Rihal CODESTACKER 2026 Challenge #2',
      contact: {
        name: 'Ali Al Zaabi',
        url: 'https://alizaabi.om',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development' },
      {
        url: 'https://alizaabi.om/rihal-codestack/flowcare-api',
        description: 'Live Production',
      },
    ],
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic Authentication (email:password base64 encoded)',
        },
      },
      schemas: {
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'FlowCare Al Khuwair' },
            location: { type: 'string', example: 'Muscat, Al Khuwair' },
            phone: { type: 'string', example: '+968 2456 7890' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ServiceType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'General Consultation' },
            description: { type: 'string' },
            durationMinutes: { type: 'integer', example: 30 },
            price: { type: 'string', example: '5.000', description: 'OMR (3 decimals)' },
            branchId: { type: 'string', format: 'uuid' },
          },
        },
        Staff: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Dr. Sara Al Zadjali' },
            email: { type: 'string', example: 'sara@flowcare.om' },
            role: { type: 'string', enum: ['admin', 'manager', 'staff'] },
            branchId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Ahmed Al Balushi' },
            email: { type: 'string', example: 'ahmed@example.com' },
            phone: { type: 'string', example: '+968 9912 3456' },
            idImage: { type: 'string', description: 'Path to uploaded ID image' },
          },
        },
        Slot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            branchId: { type: 'string', format: 'uuid' },
            serviceTypeId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid', nullable: true },
            date: { type: 'string', format: 'date', example: '2026-03-20' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '09:30' },
            isBooked: { type: 'boolean', default: false },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customerId: { type: 'string', format: 'uuid' },
            slotId: { type: 'string', format: 'uuid' },
            branchId: { type: 'string', format: 'uuid' },
            serviceTypeId: { type: 'string', format: 'uuid' },
            staffId: { type: 'string', format: 'uuid', nullable: true },
            status: {
              type: 'string',
              enum: ['booked', 'checked-in', 'no-show', 'completed', 'cancelled'],
            },
            notes: { type: 'string', nullable: true },
            attachment: { type: 'string', nullable: true },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            action: { type: 'string', example: 'appointment.create' },
            actorId: { type: 'string', format: 'uuid' },
            actorRole: { type: 'string' },
            targetType: { type: 'string' },
            targetId: { type: 'string', format: 'uuid' },
            branchId: { type: 'string', format: 'uuid', nullable: true },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            results: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Public', description: 'No authentication required' },
      { name: 'Auth', description: 'Registration and login' },
      { name: 'Appointments', description: 'Booking, rescheduling, cancellation' },
      { name: 'Slots', description: 'Time slot management (Manager/Admin)' },
      { name: 'Staff', description: 'Staff management' },
      { name: 'Customers', description: 'Customer records (Admin)' },
      { name: 'Audit Logs', description: 'Compliance & audit trail' },
      { name: 'Admin', description: 'System administration' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
