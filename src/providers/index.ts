import { SmsProvider } from './SmsProvider';
import { MockProvider } from './MockProvider';
import { WebhookProvider } from './WebhookProvider';

export function getSmsProvider(): SmsProvider {
  const providerType = process.env.SMS_PROVIDER || 'mock';

  switch (providerType.toLowerCase()) {
    case 'webhook':
      return new WebhookProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}
