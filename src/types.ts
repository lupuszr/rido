export interface NotificationConfig {
  slack?: {
    webhook_url: string;
    channel: string;
  };
  telegram?: {
    bot_token: string;
    chat_id: string;
  };
}

export interface DeploymentStep {
  name: string;
  run: string;
}

export interface DeploymentConfig {
  path: string;
  steps: DeploymentStep[];
}

export interface AppConfig {
  notifications?: NotificationConfig;
  deployments: Record<string, DeploymentConfig>;
}
