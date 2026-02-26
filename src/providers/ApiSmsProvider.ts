import { SmsProvider } from './SmsProvider';

export class ApiSmsProvider implements SmsProvider {
  private apiUrl: string;
  private apiMethod: string;
  private apiHeaders: Record<string, string>;
  private apiBodyTemplate: string;

  constructor() {
    const url = process.env.SMS_API_URL;
    if (!url) {
      throw new Error('SMS_API_URL environment variable is required for ApiSmsProvider');
    }
    this.apiUrl = url;

    this.apiMethod = process.env.SMS_API_METHOD || 'POST';

    try {
      this.apiHeaders = process.env.SMS_API_HEADERS
        ? JSON.parse(process.env.SMS_API_HEADERS)
        : { 'Content-Type': 'application/json' };
    } catch (error) {
      console.error('[ApiSmsProvider] Failed to parse SMS_API_HEADERS. Using default headers.', error);
      this.apiHeaders = { 'Content-Type': 'application/json' };
    }

    this.apiBodyTemplate = process.env.SMS_API_BODY_TEMPLATE || '{"to": "{{to}}", "body": "{{body}}"}';
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    try {
      const toUrlEncoded = encodeURIComponent(to);
      const bodyUrlEncoded = encodeURIComponent(body);

      // Replace placeholders in the URL (useful for GET requests)
      const requestUrl = this.apiUrl
        .replace(/\{\{to\}\}/g, to)
        .replace(/\{\{body\}\}/g, body)
        .replace(/\{\{to_url_encoded\}\}/g, toUrlEncoded)
        .replace(/\{\{body_url_encoded\}\}/g, bodyUrlEncoded);

      // Replace placeholders in the template
      const requestBody = this.apiBodyTemplate
        .replace(/\{\{to\}\}/g, to)
        .replace(/\{\{body\}\}/g, body)
        .replace(/\{\{to_url_encoded\}\}/g, toUrlEncoded)
        .replace(/\{\{body_url_encoded\}\}/g, bodyUrlEncoded);

      const isGetOrHead = this.apiMethod.toUpperCase() === 'GET' || this.apiMethod.toUpperCase() === 'HEAD';

      const response = await fetch(requestUrl, {
        method: this.apiMethod,
        headers: this.apiHeaders,
        body: isGetOrHead ? undefined : requestBody,
      });

      if (!response.ok) {
        console.error(`[ApiSmsProvider] Failed to send SMS. Status: ${response.status} ${response.statusText}`);
        const responseText = await response.text();
        console.error(`[ApiSmsProvider] Response body: ${responseText}`);
        return false;
      }

      console.log(`[ApiSmsProvider] Successfully sent SMS to ${to}`);
      return true;
    } catch (error) {
      console.error(`[ApiSmsProvider] Error sending SMS:`, error);
      return false;
    }
  }
}
