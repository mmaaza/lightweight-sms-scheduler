"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const client_1 = require("@prisma/client");
const providers_1 = require("../providers");
const prisma = new client_1.PrismaClient();
const smsProvider = (0, providers_1.getSmsProvider)();
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 5000;
class Scheduler {
    isRunning = false;
    timer = null;
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('Scheduler started...');
        this.poll();
    }
    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('Scheduler stopped.');
    }
    async poll() {
        if (!this.isRunning)
            return;
        try {
            await this.processJobs();
        }
        catch (error) {
            console.error('Error during polling:', error);
        }
        finally {
            if (this.isRunning) {
                this.timer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
            }
        }
    }
    async processJobs() {
        const now = new Date();
        // 1. Find pending jobs that are due
        const pendingJobs = await prisma.messageJob.findMany({
            where: {
                status: 'PENDING',
                scheduledAt: {
                    lte: now,
                },
            },
            take: BATCH_SIZE,
            orderBy: {
                scheduledAt: 'asc',
            },
        });
        if (pendingJobs.length === 0) {
            return;
        }
        // 2. Process each job with optimistic locking
        for (const job of pendingJobs) {
            try {
                // Attempt to lock the job by changing status to PROCESSING
                // The WHERE clause ensures we only update if it's still PENDING
                const lockedJob = await prisma.messageJob.updateMany({
                    where: {
                        id: job.id,
                        status: 'PENDING',
                    },
                    data: {
                        status: 'PROCESSING',
                    },
                });
                // If count is 0, another instance already picked it up
                if (lockedJob.count === 0) {
                    continue;
                }
                // 3. Send the SMS
                const success = await smsProvider.sendSms(job.to, job.body);
                if (success) {
                    await prisma.messageJob.update({
                        where: { id: job.id },
                        data: { status: 'SENT' },
                    });
                }
                else {
                    await this.handleFailure(job);
                }
            }
            catch (error) {
                console.error(`Error processing job ${job.id}:`, error);
                await this.handleFailure(job);
            }
        }
    }
    async handleFailure(job) {
        const newRetryCount = job.retryCount + 1;
        if (newRetryCount >= MAX_RETRIES) {
            await prisma.messageJob.update({
                where: { id: job.id },
                data: { status: 'FAILED', retryCount: newRetryCount },
            });
            console.log(`Job ${job.id} failed permanently after ${MAX_RETRIES} retries.`);
        }
        else {
            // Exponential backoff: 1 min, 2 mins, 4 mins...
            const backoffMinutes = Math.pow(2, newRetryCount - 1);
            const nextScheduledAt = new Date(Date.now() + backoffMinutes * 60000);
            await prisma.messageJob.update({
                where: { id: job.id },
                data: {
                    status: 'PENDING',
                    retryCount: newRetryCount,
                    scheduledAt: nextScheduledAt,
                },
            });
            console.log(`Job ${job.id} failed. Retrying at ${nextScheduledAt} (Attempt ${newRetryCount}/${MAX_RETRIES})`);
        }
    }
}
exports.Scheduler = Scheduler;
