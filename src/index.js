"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var scheduler_1 = require("./scheduler");
var messages_1 = require("./routes/messages");
var testing_1 = require("./routes/testing");
dotenv_1.default.config();
var app = (0, express_1.default)();
var port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/messages', messages_1.default);
app.use('/api/testing', testing_1.default);
app.get('/health', function (req, res) {
    res.json({ status: 'ok' });
});
// Global error handler
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});
var server = app.listen(port, function () {
    console.log("Server is running on port ".concat(port));
});
// Start the scheduler
var scheduler = new scheduler_1.Scheduler();
scheduler.start();
// Graceful shutdown
var shutdown = function () {
    console.log('Shutting down gracefully...');
    scheduler.stop();
    server.close(function () {
        console.log('Closed out remaining connections.');
        process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(function () {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
