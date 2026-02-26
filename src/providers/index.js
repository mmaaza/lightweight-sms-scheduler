"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsProvider = getSmsProvider;
var MockProvider_1 = require("./MockProvider");
var WebhookProvider_1 = require("./WebhookProvider");
function getSmsProvider() {
    var providerType = process.env.SMS_PROVIDER || 'mock';
    switch (providerType.toLowerCase()) {
        case 'webhook':
            return new WebhookProvider_1.WebhookProvider();
        case 'mock':
        default:
            return new MockProvider_1.MockProvider();
    }
}
