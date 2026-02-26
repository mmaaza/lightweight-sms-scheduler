"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const scheduler_1 = require("./scheduler");
const messages_1 = __importDefault(require("./routes/messages"));
const testing_1 = __importDefault(require("./routes/testing"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/messages', messages_1.default);
app.use('/api/testing', testing_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// Start the scheduler
const scheduler = new scheduler_1.Scheduler();
scheduler.start();
// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    scheduler.stop();
    server.close(() => {
        console.log('Closed out remaining connections.');
        process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
