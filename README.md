# PiPilot SWE Agent - Complete Setup Documentation

## Overview
PiPilot is a GitHub App that provides an autonomous software engineering agent. Users can interact with it via GitHub comments, and it enforces subscription-based usage limits with Stripe payments.

## Architecture

### Core Components
1. **GitHub App** - Handles webhooks and provides installation context
2. **Next.js API Routes** - Backend logic for webhooks, Stripe, OAuth
3. **Supabase Database** - User data, subscriptions, usage tracking
4. **Stripe** - Payment processing and subscription management
5. **AI Chat API** - Processes user commands and generates responses

### Data Flow
1. User installs app → OAuth flow → Setup page → Subscription
2. User comments on GitHub → Webhook → Limit check → AI processing → Response
3. Usage tracked after each AI response completion

## Database Schema

### Tables
- `users` - User accounts with subscription info
- `github_installations` - App installations
- `repositories` - Linked repos
- `usage_logs` - Detailed usage tracking
- `webhook_logs` - Webhook processing logs

### Key Fields
- `users.tasks_this_month` - Monthly usage counter
- `users.subscription_plan` - 'free', 'pro_monthly', 'pro_annual'
- `users.stripe_customer_id` - Links to Stripe

## GitHub App Configuration

### Required Permissions
```
Contents: write
Issues: write
Pull requests: write
Repository hooks: write
Statuses: write
Workflows: write
Metadata: read
Checks: write
```

### Webhook URL
`https://swe.pipilot.dev/api/webhooks/github`

### OAuth Setup
- **Request OAuth during installation**: Enabled
- **Callback URL**: `https://swe.pipilot.dev/api/oauth/callback`
- **Setup URL**: Not used (OAuth callback serves as setup)

## Stripe Configuration

### Products
- **Free**: $0, 10 tasks/month
- **Pro Monthly**: $30/month, 150 tasks/month
- **Pro Annual**: $288/year = $24/month, 170 tasks/month
- **Extra Credits**: $30 for 150 credits ($0.20/credit)

### Webhooks
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## API Routes

### Webhooks
- `POST /api/webhooks/github` - Processes GitHub events

### Stripe
- `POST /api/stripe/create-checkout-session` - Creates payment sessions
- `POST /api/stripe/webhook` - Handles Stripe events
- `POST /api/stripe/check-subscription` - Verifies user status

### OAuth
- `GET /api/oauth/callback` - Handles OAuth flow

### Chat
- `POST /api/chat` - AI processing with usage tracking

## User Flow

### Installation & Setup
1. User installs GitHub App
2. Redirected to OAuth authorization
3. OAuth callback creates/updates user in DB
4. Redirected to `/setup` page
5. User selects plan and subscribes via Stripe
6. Success page confirms setup

### Usage
1. User comments `@pipilot-swe-agent [command]` on issue/PR
2. Webhook triggers, checks user limits
3. If within limits, calls AI API
4. AI streams response, increments usage on completion
5. If over limits, replies with upgrade prompt

## Environment Variables

### Required
```
# GitHub
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Database
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI/API
NEXT_PUBLIC_BASE_URL=https://swe.pipilot.dev
```

### Optional Stripe Price IDs
```
STRIPE_PRICE_FREE=price_1SiIwD3G7U0M1bp1FrBOA3KB
STRIPE_PRICE_PRO_MONTHLY=price_1SiIwD3G7U0M1bp1Vc3ndopi
STRIPE_PRICE_PRO_ANNUAL=price_1SiIwE3G7U0M1bp1auNQbKID
STRIPE_PRICE_CREDITS_150=price_1SiIwF3G7U0M1bp1yfI4CgyQ
```

## Usage Tracking

### Limits
- **Free**: 10 tasks/month
- **Pro**: 150-170 tasks/month
- Tasks = completed AI chat responses

### Implementation
- Checked before each AI call in webhook handlers
- Incremented in `/api/chat` `onFinish` callback after streaming
- Logged to `usage_logs` with token counts

### Monthly Reset
Implement cron job or scheduled function:
```sql
UPDATE users SET tasks_this_month = 0 WHERE EXTRACT(MONTH FROM NOW()) != EXTRACT(MONTH FROM last_reset_date);
```

## Deployment Checklist

### GitHub App
- [ ] App created with correct permissions
- [ ] Webhook URL set
- [ ] OAuth enabled with callback URL
- [ ] Client ID/Secret generated

### Database
- [ ] Schema applied to Supabase
- [ ] `tasks_this_month` column added
- [ ] RLS policies configured

### Stripe
- [ ] Products and prices created
- [ ] Webhook endpoint configured
- [ ] Test mode enabled for development

### Environment
- [ ] All required env vars set
- [ ] Secrets properly configured
- [ ] Domain (swe.pipilot.dev) pointed correctly

### Testing
- [ ] Install app on test repo
- [ ] Complete OAuth/setup flow
- [ ] Test free tier limits
- [ ] Subscribe and test Pro features
- [ ] Verify usage logging

## Security Considerations

### Webhook Verification
- SHA-256 signature verification
- Secure secret storage

### User Authentication
- OAuth 2.0 flow for user identification
- GitHub user data validation

### Rate Limiting
- Per-user monthly limits
- Potential IP-based abuse detection

### Data Privacy
- Minimal user data collection
- Secure token handling
- GDPR compliance considerations

## Monitoring & Maintenance

### Logs
- Webhook processing in `webhook_logs`
- Usage analytics in `usage_logs`
- Error tracking in console/server logs

### Metrics
- User acquisition/installations
- Subscription conversion rates
- Usage patterns per plan
- Error rates

### Support
- Free tier for testing
- Clear upgrade prompts
- Subscription management via Stripe dashboard

## Troubleshooting

### Common Issues
1. **Webhook not firing**: Check GitHub App webhook URL and secret
2. **OAuth errors**: Verify callback URL and client credentials
3. **Stripe failures**: Check webhook secrets and price IDs
4. **Usage not tracking**: Ensure `userId`/`installationId` passed to chat API

### Debug Steps
1. Check server logs for errors
2. Verify database connections
3. Test API routes individually
4. Use Stripe/Supabase dashboards for data validation

---

This documentation covers the complete PiPilot SWE Agent system. The setup is production-ready with proper monetization, security, and scalability considerations.
