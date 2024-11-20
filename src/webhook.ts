import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import yaml from 'js-yaml';
import fs from 'fs';
import axios from 'axios';
import { AppConfig, DeploymentConfig } from './types';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-here';

// Load config
function loadConfig(): AppConfig {
  try {
    const fileContent = fs.readFileSync('config.yml', 'utf8');
    // Replace environment variables
    const configFile = fileContent.replace(/\${([^}]+)}/g, (_, envVar) => {
      return process.env[envVar] || '';
    });
    return yaml.load(configFile) as AppConfig;
  } catch (e) {
    console.error('Error loading config:', e);
    process.exit(1);
  }
}

const config = loadConfig();

// Notifications
async function notify(message: string): Promise<void> {
  if (!config.notifications) return;

  const { slack, telegram } = config.notifications;

  if (slack?.webhook_url) {
    try {
      await axios.post(slack.webhook_url, {
        channel: slack.channel,
        text: message,
      });
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  if (telegram?.bot_token && telegram?.chat_id) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${telegram.bot_token}/sendMessage`,
        {
          chat_id: telegram.chat_id,
          text: message,
          parse_mode: 'HTML'
        }
      );
    } catch (error) {
      console.error('Telegram notification failed:', error);
    }
  }
}

// Verify GitHub signature
function verifySignature(signature: string, payload: string): boolean {
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = hmac.update(payload).digest('hex');
  return signature === `sha256=${digest}`;
}

// Run deployment steps
async function runDeployment(appName: string, deployment: DeploymentConfig): Promise<void> {
  await notify(`🚀 Starting deployment of *${appName}*`);

  try {
    for (const step of deployment.steps) {
      console.log(`Running step: ${step.name}`);
      await notify(`⚙️ Executing: ${step.name}`);
      
      try {
        const { stdout } = await execAsync(step.run, { cwd: deployment.path });
        console.log(`Output: ${stdout}`);
      } catch (error) {
        throw new Error(`Step "${step.name}" failed: ${error.message}`);
      }
    }

    await notify(`✅ Successfully deployed *${appName}*`);
  } catch (error) {
    await notify(`🚨 Deployment of *${appName}* failed: ${error.message}`);
    throw error;
  }
}

app.use(express.json());

// Webhook endpoint
app.post('/webhook/:app', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const appName = req.params.app;
  const deployment = config.deployments[appName];

  if (!deployment) {
    return res.status(404).send('Deployment not configured');
  }

  if (!signature || typeof signature !== 'string') {
    return res.status(401).send('No signature');
  }

  const payload = JSON.stringify(req.body);
  if (!verifySignature(signature, payload)) {
    return res.status(401).send('Invalid signature');
  }

  try {
    await runDeployment(appName, deployment);
    res.status(200).send('Deployed successfully');
  } catch (error) {
    console.error(`Deployment error for ${appName}:`, error);
    res.status(500).send('Deployment failed');
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log('Configured deployments:', Object.keys(config.deployments));
  
  if (config.notifications) {
    console.log('Notifications enabled for:', 
      Object.keys(config.notifications)
        .filter(platform => {
          const platformConfig = config.notifications?.[platform];
          return platformConfig && Object.values(platformConfig).every(value => value);
        })
    );
  }
});
