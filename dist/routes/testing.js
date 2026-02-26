"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const MockProvider_1 = require("../providers/MockProvider");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const mockProvider = new MockProvider_1.MockProvider();
// Simulate sending an SMS immediately using the MockProvider
router.post('/simulate', async (req, res) => {
    try {
        const { to, body } = req.body;
        if (!to || !body) {
            return res.status(400).json({ error: "to and body are required" });
        }
        const success = await mockProvider.sendSms(to, body);
        if (success) {
            res.json({ message: "Simulated SMS sent successfully" });
        }
        else {
            res.status(500).json({ error: "Simulated SMS failed to send" });
        }
    }
    catch (error) {
        console.error("Error simulating SMS:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get all jobs for testing purposes
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await prisma.messageJob.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ jobs });
    }
    catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Clear all jobs for testing purposes
router.delete('/jobs', async (req, res) => {
    try {
        await prisma.messageJob.deleteMany({});
        res.json({ message: "All jobs cleared" });
    }
    catch (error) {
        console.error("Error clearing jobs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
