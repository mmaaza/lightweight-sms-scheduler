import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// Validation schema for scheduling a message
const scheduleSchema = z.object({
  to: z.string().min(1, "Phone number is required"),
  body: z.string().min(1, "Message body is required"),
  scheduledAt: z.string().datetime({ message: "Invalid ISO datetime string" }),
});

// Schedule a new SMS
router.post('/schedule', async (req, res) => {
  try {
    const parsed = scheduleSchema.parse(req.body);
    const scheduledDate = new Date(parsed.scheduledAt);

    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be in the future" });
    }

    const job = await prisma.messageJob.create({
      data: {
        to: parsed.to,
        body: parsed.body,
        scheduledAt: scheduledDate,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: "Message scheduled successfully", job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    console.error("Error scheduling message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get status of a scheduled message
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.messageJob.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ job });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel a scheduled message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only allow cancelling PENDING messages
    const job = await prisma.messageJob.findUnique({ where: { id } });
    
    if (!job) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (job.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel message with status ${job.status}` });
    }

    await prisma.messageJob.delete({
      where: { id },
    });

    res.json({ message: "Message cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
