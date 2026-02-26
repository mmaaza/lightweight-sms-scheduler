"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsProvider = getSmsProvider;
const MockProvider_1 = require("./MockProvider");
const WebhookProvider_1 = require("./WebhookProvider");
function getSmsProvider() {
    const providerType = process.env.SMS_PROVIDER || 'mock';
    switch (providerType.toLowerCase()) {
        case 'webhook':
            return new WebhookProvider_1.WebhookProvider();
        case 'mock':
        default:
            return new MockProvider_1.MockProvider();
    }
}
