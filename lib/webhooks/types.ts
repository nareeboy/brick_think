import type { WebhookTriggerType } from './constants';

export type WebhookConfig = {
  id: string;
  webhookType: string;
  webhookUrl: string;
  triggerType: WebhookTriggerType;
  delayDays: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export type WebhookDelivery = {
  id: string;
  email: string;
  webhookType: string;
  scheduledFor: string;
  sentAt: string | null;
  errorMessage: string | null;
};
