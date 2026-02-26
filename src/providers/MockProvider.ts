import { SmsProvider } from './SmsProvider';

export class MockProvider implements SmsProvider {
  async sendSms(to: string, body: string): Promise<boolean> {
    console.log(`[MockProvider] Sending SMS to ${to}: "${body}"`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    if (success) {
      console.log(`[MockProvider] Successfully sent SMS to ${to}`);
      return true;
    } else {
      console.error(`[MockProvider] Failed to send SMS to ${to}`);
      return false;
    }
  }
}
