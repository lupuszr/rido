# RIDO

**R**emote **I**nstallation **D**eployment **O**perator - A secure webhook-based deployment tool for your baremetal servers.

RIDO provides a secure, controlled way to automate deployments through GitHub webhooks instead of exposing SSH access to your servers. It's simple, reliable, and keeps a detailed audit trail of all deployments.

## Why RIDO?

- 🔒 **Secure**: No SSH access needed, only predefined commands
- 🚀 **Simple**: Easy to configure with YAML
- 📝 **Auditable**: Every deployment is logged and can be notified
- 🔄 **Reliable**: Same process every time
- 🛡️ **Controlled**: Only runs what you configure

## Why Use Webhooks Instead of Direct SSH?

### Security Benefits:
1. **Limited Access**: 
   - Webhooks only expose specific HTTP endpoints
   - No need to manage SSH keys or user accounts
   - No direct shell access to your server

2. **Controlled Execution**: 
   - Only predefined commands can be executed
   - Commands are configured in YAML, not sent from outside
   - No risk of arbitrary command execution

3. **Signature Verification**:
   - Every request is verified using GitHub's HMAC signatures
   - Prevents unauthorized deployments
   - Cannot be replayed or tampered with

4. **Audit Trail**:
   - All deployments are logged
   - Notifications sent to Slack/Telegram
   - Know exactly what was deployed and when

### Operational Benefits:
1. **Standardized Deployments**:
   - Same process every time
   - No human error in deployment steps
   - Consistent across all deployments

2. **Automated Workflow**:
   - Deploys automatically on git push
   - No manual intervention needed
   - Faster and more reliable

## Setup

1. Install:
```bash
mkdir -p /opt/deploy-webhook
cd /opt/deploy-webhook
git clone [repository-url] .
npm install
npm run build
```

2. Configure deployments in config.yml:
```yaml
# Optional notifications
notifications:
  slack:
    webhook_url: ${SLACK_WEBHOOK_URL}
    channel: "#deployments"
  telegram:
    bot_token: ${TELEGRAM_BOT_TOKEN}
    chat_id: ${TELEGRAM_CHAT_ID}

deployments:
  my-app:
    path: /opt/my-app
    steps:
      - name: Update code
        run: git pull
      - name: Install
        run: npm install
      - name: Build
        run: npm run build
      - name: Restart
        run: systemctl restart my-app
```

3. Set up systemd service:
```bash
sudo cp deploy-webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable deploy-webhook
sudo systemctl start deploy-webhook
```

## GitHub Setup

1. Go to repository Settings → Webhooks
2. Add webhook:
   - URL: `http://your-server:9000/webhook/my-app`
   - Content type: `application/json`
   - Secret: Same as WEBHOOK_SECRET
   - Events: Push events

## Environment Variables

```bash
WEBHOOK_PORT=9000              # Port to listen on
WEBHOOK_SECRET=your-secret     # GitHub webhook secret
SLACK_WEBHOOK_URL=...          # Optional: Slack webhook URL
TELEGRAM_BOT_TOKEN=...         # Optional: Telegram bot token
TELEGRAM_CHAT_ID=...           # Optional: Telegram chat ID
```

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Start
npm start

# Lint
npm run lint
```

## Logs

View deployment logs:
```bash
journalctl -u deploy-webhook -f
```

## Security Recommendations

1. Run behind a reverse proxy with HTTPS
2. Use a strong webhook secret
3. Keep config.yml and .env secure
4. Run as non-root user
5. Use specific systemd service user
6. Limit deployed application permissions

## Architecture

```
GitHub Push → GitHub Webhook → Deploy Webhook → Deployment Steps
     ↓                                              ↓
   Verify                                     Slack/Telegram
  Signature                                  Notifications
```

Each step is verified and logged, providing a secure and traceable deployment process.
