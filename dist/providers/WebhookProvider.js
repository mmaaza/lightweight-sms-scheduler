"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookProvider = void 0;
class WebhookProvider {
    webhookUrl;
    constructor() {
        const url = process.env.SMS_WEBHOOK_URL;
        if (!url) {
            throw new Error('SMS_WEBHOOK_URL environment variable is required for WebhookProvider');
        }
        this.webhookUrl = url;
    }
    async sendSms(to, body) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SMS_WEBHOOK_TOKEN || ''}`
                },
                body: JSON.stringify({ to, body }),
            });
            if (!response.ok) {
                console.error(`[WebhookProvider] Failed to send SMS. Status: ${response.status}`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error(`[WebhookProvider] Error sending SMS:`, error);
            return false;
        }
    }
}
exports.WebhookProvider = WebhookProvider;
