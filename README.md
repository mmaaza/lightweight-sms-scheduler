# SMS Scheduler Microservice

A robust, minimal, and scalable open-source SMS scheduling microservice. Built with Node.js, TypeScript, and Prisma.

This service allows you to schedule SMS messages to be sent at a specific time in the future. It is designed to be hosted as a standalone microservice that your main application can interact with via REST API endpoints.

## Features

- **No Redis/BullMQ Required**: Uses a database-backed polling engine with Optimistic Locking, making it lightweight and easy to host.
- **Horizontally Scalable**: Run multiple instances of this service safely. The optimistic locking ensures a message is never sent twice.
- **Database Agnostic**: Powered by Prisma. Works out-of-the-box with SQLite for zero-setup testing, but easily configurable for PostgreSQL or MySQL in production.
- **Automatic Retries**: Built-in exponential backoff (1 min, 2 mins, 4 mins) for failed SMS deliveries.
- **Provider Agnostic**: Easily swap between different SMS providers (Twilio, MessageBird, generic webhooks) via environment variables. Includes a `MockProvider` for cost-free testing.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd sms-scheduler
npm install
```

### 2. Configuration

Create a `.env` file in the root directory (or modify the existing one):

```env
PORT=3000
DATABASE_URL="file:./dev.db" # Change to postgresql://... for production
SMS_PROVIDER="mock"          # Options: mock, webhook
```

### 3. Database Setup

Initialize the database schema:

```bash
npx prisma db push
```

*(Note: If you switch to PostgreSQL/MySQL, you should use `npx prisma migrate dev` instead).*

### 4. Run the Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

---

## API Reference

### Schedule a Message

Schedule an SMS to be sent at a specific future date/time.

**Endpoint:** `POST /api/messages/schedule`

**Request Body:**
```json
{
  "to": "+1234567890",
  "body": "Hello, this is a scheduled message!",
  "scheduledAt": "2026-02-26T15:30:00.000Z"
}
```
*(Note: `scheduledAt` must be a valid ISO-8601 datetime string in the future).*

**Response (201 Created):**
```json
{
  "message": "Message scheduled successfully",
  "job": {
    "id": "uuid-string",
    "to": "+1234567890",
    "body": "Hello, this is a scheduled message!",
    "scheduledAt": "2026-02-26T15:30:00.000Z",
    "status": "PENDING",
    "retryCount": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Check Message Status

Check the current status of a scheduled message.

**Endpoint:** `GET /api/messages/:id`

**Response (200 OK):**
```json
{
  "job": {
    "id": "uuid-string",
    "status": "SENT", // PENDING, PROCESSING, SENT, or FAILED
    // ...other fields
  }
}
```

### Cancel a Message

Cancel a message that has not yet been sent.

**Endpoint:** `DELETE /api/messages/:id`

**Response (200 OK):**
```json
{
  "message": "Message cancelled successfully"
}
```
*(Note: You can only cancel messages with a `PENDING` status).*

---

## Testing Endpoints

These endpoints are useful for development and integration testing.

- `POST /api/testing/simulate`: Immediately simulate sending an SMS using the `MockProvider` (bypasses the scheduler).
  - Body: `{ "to": "+1", "body": "test" }`
- `GET /api/testing/jobs`: Retrieve all jobs in the database.
- `DELETE /api/testing/jobs`: Clear all jobs from the database.

---

## Architecture & Scaling

### The Polling Engine
Because this service avoids heavy dependencies like Redis, it uses a `setInterval` polling mechanism. Every 5 seconds, it queries the database for `PENDING` jobs where `scheduledAt <= NOW()`.

### Optimistic Locking
To allow you to run multiple instances of this server (e.g., behind a load balancer) without sending duplicate messages, the service uses Optimistic Locking. 

When an instance finds a due job, it attempts to update the status to `PROCESSING` using a strict `WHERE id = X AND status = 'PENDING'` clause. If another instance already grabbed the job, the update will affect 0 rows, and the current instance will safely skip it.

### Changing the Database
To switch from SQLite to PostgreSQL for production:
1. Open `prisma/schema.prisma`.
2. Change `provider = "sqlite"` to `provider = "postgresql"`.
3. Update `DATABASE_URL` in your `.env` to your Postgres connection string.
4. Run `npx prisma migrate dev --name init`.

## License

MIT
