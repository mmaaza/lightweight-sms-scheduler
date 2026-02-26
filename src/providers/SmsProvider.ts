export interface SmsProvider {
  sendSms(to: string, body: string): Promise<boolean>;
}
