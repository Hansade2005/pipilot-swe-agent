import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleInstallation, handleIssueEvent, handlePullRequestEvent, handlePullRequestReviewCommentEvent } from './handlers';
import { WebhookEvent } from './types';

// GitHub webhook secret - should be set in environment variables
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');

    if (!WEBHOOK_SECRET) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Verify webhook signature
    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 401 });
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(body, 'utf8');
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: WebhookEvent = JSON.parse(body);

    console.log(`Received webhook: ${event}, delivery: ${request.headers.get('x-github-delivery')}`);

    // Route events to handlers
    switch (event) {
      case 'installation':
      case 'installation_repositories':
        await handleInstallation(payload);
        break;

      case 'issues':
      case 'issue_comment':
        await handleIssueEvent(payload);
        break;

      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;

      case 'pull_request_review_comment':
        await handlePullRequestReviewCommentEvent(payload);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}