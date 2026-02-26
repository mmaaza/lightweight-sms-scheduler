"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
var client_1 = require("@prisma/client");
var providers_1 = require("../providers");
var prisma = new client_1.PrismaClient();
var smsProvider = (0, providers_1.getSmsProvider)();
var MAX_RETRIES = 3;
var BATCH_SIZE = 10;
var POLL_INTERVAL_MS = 5000;
var Scheduler = /** @class */ (function () {
    function Scheduler() {
        this.isRunning = false;
        this.timer = null;
    }
    Scheduler.prototype.start = function () {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('Scheduler started...');
        this.poll();
    };
    Scheduler.prototype.stop = function () {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('Scheduler stopped.');
    };
    Scheduler.prototype.poll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isRunning)
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, this.processJobs()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error during polling:', error_1);
                        return [3 /*break*/, 5];
                    case 4:
                        if (this.isRunning) {
                            this.timer = setTimeout(function () { return _this.poll(); }, POLL_INTERVAL_MS);
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Scheduler.prototype.processJobs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, pendingJobs, _i, pendingJobs_1, job, lockedJob, success, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        return [4 /*yield*/, prisma.messageJob.findMany({
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
                            })];
                    case 1:
                        pendingJobs = _a.sent();
                        if (pendingJobs.length === 0) {
                            return [2 /*return*/];
                        }
                        _i = 0, pendingJobs_1 = pendingJobs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < pendingJobs_1.length)) return [3 /*break*/, 13];
                        job = pendingJobs_1[_i];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 10, , 12]);
                        return [4 /*yield*/, prisma.messageJob.updateMany({
                                where: {
                                    id: job.id,
                                    status: 'PENDING',
                                },
                                data: {
                                    status: 'PROCESSING',
                                },
                            })];
                    case 4:
                        lockedJob = _a.sent();
                        // If count is 0, another instance already picked it up
                        if (lockedJob.count === 0) {
                            return [3 /*break*/, 12];
                        }
                        return [4 /*yield*/, smsProvider.sendSms(job.to, job.body)];
                    case 5:
                        success = _a.sent();
                        if (!success) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma.messageJob.update({
                                where: { id: job.id },
                                data: { status: 'SENT' },
                            })];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, this.handleFailure(job)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9: return [3 /*break*/, 12];
                    case 10:
                        error_2 = _a.sent();
                        console.error("Error processing job ".concat(job.id, ":"), error_2);
                        return [4 /*yield*/, this.handleFailure(job)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        _i++;
                        return [3 /*break*/, 2];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    Scheduler.prototype.handleFailure = function (job) {
        return __awaiter(this, void 0, void 0, function () {
            var newRetryCount, backoffMinutes, nextScheduledAt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newRetryCount = job.retryCount + 1;
                        if (!(newRetryCount >= MAX_RETRIES)) return [3 /*break*/, 2];
                        return [4 /*yield*/, prisma.messageJob.update({
                                where: { id: job.id },
                                data: { status: 'FAILED', retryCount: newRetryCount },
                            })];
                    case 1:
                        _a.sent();
                        console.log("Job ".concat(job.id, " failed permanently after ").concat(MAX_RETRIES, " retries."));
                        return [3 /*break*/, 4];
                    case 2:
                        backoffMinutes = Math.pow(2, newRetryCount - 1);
                        nextScheduledAt = new Date(Date.now() + backoffMinutes * 60000);
                        return [4 /*yield*/, prisma.messageJob.update({
                                where: { id: job.id },
                                data: {
                                    status: 'PENDING',
                                    retryCount: newRetryCount,
                                    scheduledAt: nextScheduledAt,
                                },
                            })];
                    case 3:
                        _a.sent();
                        console.log("Job ".concat(job.id, " failed. Retrying at ").concat(nextScheduledAt, " (Attempt ").concat(newRetryCount, "/").concat(MAX_RETRIES, ")"));
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return Scheduler;
}());
exports.Scheduler = Scheduler;
