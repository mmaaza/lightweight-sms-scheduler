# SMS Scheduler Microservice

A robust, minimal, and scalable open-source SMS scheduling microservice. Built with Node.js, TypeScript, and Prisma.

This service allows you to schedule SMS messages to be sent at a specific time in the future. It is designed to be hosted as a standalone microservice that your main application can interact with via REST API endpoints.

## Features

- **No Redis/BullMQ Required**: Uses a database-backed polling engine with Optimistic Locking, making it lightweight and easy to host.
- **Horizontally Scalable**: Run multiple instances of this service safely. The optimistic locking ensures a message is never sent twice.
- **Database Agnostic**: Powered by Prisma. Configured for PostgreSQL out-of-the-box, but easily configurable for MySQL or SQLite.
- **Automatic Retries**: Built-in exponential backoff (1 min, 2 mins, 4 mins) for failed SMS deliveries.
- **Provider Agnostic**: Easily swap between different SMS providers (Twilio, MessageBird, generic webhooks) via environment variables. Includes a `MockProvider` for cost-free testing.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/mmaaza/lightweight-sms-scheduler.git
cd sms-scheduler
npm install
```

### 2. Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to configure your database and SMS provider:

   ```env
   PORT=3000
   DATABASE_URL="postgresql://user:password@localhost:5432/sms_scheduler?schema=public"
   
   # Choose your provider: "mock", "api", or "webhook"
   SMS_PROVIDER="mock" 
   ```

   **Using a Real SMS API (Generic):**
   To usage a real SMS provider (Twilio, Nexmo etc.), set `SMS_PROVIDER="api"` and configure the template variables in `.env`. 
   
   See `.env.example` for detailed configuration examples for different API types (JSON, Form Data, GET params).

### 3. Database Setup

Initialize the database schema (make sure your PostgreSQL server is running):

```bash
npx prisma db push
```

*(Note: For production, you should use `npx prisma migrate dev` instead).*

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
To switch from PostgreSQL to SQLite for local testing:
1. Open `prisma/schema.prisma`.
2. Change `provider = "postgresql"` to `provider = "sqlite"`.
3. Update `DATABASE_URL` in your `.env` to `"file:./dev.db"`.
4. Run `npx prisma db push`.

## License

MIT

---

## Detailed Testing Guide

This guide will walk you through testing the core functionality of the SMS Scheduler using `curl` (or you can use Postman/Insomnia).

### 1. Start the Server
Ensure your database is running, your `.env` is configured, and start the server:
```bash
npm run dev
```
You should see:
```
Server is running on port 3000
Scheduler started...
```

### 2. Schedule a Message
Let's schedule a message to be sent 1 minute from now.

**Request:**
```bash
curl -X POST http://localhost:3000/api/messages/schedule \
-H "Content-Type: application/json" \
-d '{
  "to": "+1234567890",
  "body": "Test message from curl",
  "scheduledAt": "2026-02-26T10:01:00.000Z" 
}'
```
*(Note: Replace `scheduledAt` with a time about 1 minute in the future from your current time).*

**Expected Response:**
```json
{
  "message": "Message scheduled successfully",
  "job": {
    "id": "some-uuid",
    "status": "PENDING",
    ...
  }
}
```
*Copy the `id` from the response for the next steps.*

### 3. Check the Status
Before the scheduled time arrives, check the status of your message.

**Request:**
```bash
curl http://localhost:3000/api/messages/<YOUR_JOB_ID>
```

**Expected Response:**
```json
{
  "job": {
    "id": "some-uuid",
    "status": "PENDING",
    ...
  }
}
```

### 4. Wait for the Scheduler
Wait for the `scheduledAt` time to pass. Watch your terminal running the server. Because we are using the `MockProvider`, you should see logs like:
```
[MockProvider] Sending SMS to +1234567890: "Test message from curl"
[MockProvider] Successfully sent SMS to +1234567890
```
*(Note: The MockProvider has a 10% chance to fail to demonstrate the retry logic. If it fails, you will see a failure log and it will retry in 1 minute).*

### 5. Verify it was Sent
Check the status again using the same command from Step 3.

**Expected Response:**
```json
{
  "job": {
    "id": "some-uuid",
    "status": "SENT",
    ...
  }
}
```

### 6. Test Cancellation
Schedule another message far in the future, then cancel it.

**Schedule:**
```bash
curl -X POST http://localhost:3000/api/messages/schedule \
-H "Content-Type: application/json" \
-d '{
  "to": "+1999999999",
  "body": "Cancel me",
  "scheduledAt": "2030-01-01T00:00:00.000Z" 
}'
```

**Cancel (using the new ID):**
```bash
curl -X DELETE http://localhost:3000/api/messages/<NEW_JOB_ID>
```

**Expected Response:**
```json
{
  "message": "Message cancelled successfully"
}
```

### 7. View All Jobs (Testing Endpoint)
To see all jobs currently in the database:
```bash
curl http://localhost:3000/api/testing/jobs
```

### 8. Clear Database (Testing Endpoint)
To wipe all jobs and start fresh:
```bash
curl -X DELETE http://localhost:3000/api/testing/jobs
```
