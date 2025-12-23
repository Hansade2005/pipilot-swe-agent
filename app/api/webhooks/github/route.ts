import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Verify webhook signature from GitHub
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const computedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

// Webhook event types we handle
interface WebhookEvent {
  action?: string;
  issue?: any;
  pull_request?: any;
  comment?: any;
  repository?: {
    full_name: string;
    owner: { login: string };
  };
  sender?: { login: string };
  installation: {
    id: number;
  };
  repositories?: Array<{
    full_name: string;
    name: string;
    private: boolean;
  }>;
  repositories_added?: Array<{
    full_name: string;
    name: string;
    private: boolean;
  }>;
  repositories_removed?: Array<{
    full_name: string;
    name: string;
    private: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    console.log(`Received webhook: ${event}, delivery: ${delivery}`);

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      console.error('Missing webhook secret or signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!verifySignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: WebhookEvent = JSON.parse(body);

    // Handle different event types
    switch (event) {
      case 'installation':
        await handleInstallation(payload);
        break;

      case 'issues':
        await handleIssueEvent(payload);
        break;

      case 'issue_comment':
        await handleIssueComment(payload);
        break;

      case 'pull_request':
        await handlePullRequest(payload);
        break;

      case 'pull_request_review_comment':
        await handlePullRequestReviewComment(payload);
        break;

      case 'workflow_run':
        await handleWorkflowRun(payload);
        break;

      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle app installation events
async function handleInstallation(payload: WebhookEvent) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (action === 'created') {
    const repos = repositories_added || [];
    console.log(`App installed on repositories:`, repos.map(r => r.full_name));
    // Could store installation info in database here
  } else if (action === 'deleted') {
    const repos = repositories_removed || [];
    console.log(`App uninstalled from repositories:`, repos.map(r => r.full_name));
    // Could clean up installation data here
  }
}

// Handle issue events (opened, edited, etc.)
async function handleIssueEvent(payload: WebhookEvent) {
  const { action, issue, repository, installation } = payload;

  if (!issue || !installation) return;

  // Check if this is a new issue or if the bot was mentioned
  const body = issue.body || '';
  const title = issue.title || '';

  // Look for @ mentions of the bot (pipilot-swe-agent)
  const botMention = /@pipilot-swe-agent/i.test(body) || /@pipilot-swe-agent/i.test(title);

  if (action === 'opened' || botMention) {
    console.log(`Processing issue #${issue.number}: ${issue.title}`);

    // Queue the issue for processing by the agent
    await queueAgentTask({
      type: 'issue_analysis',
      installationId: installation.id,
      repository: repository.full_name,
      issueNumber: issue.number,
      content: body,
      title: title
    });
  }
}

// Handle issue comment events
async function handleIssueComment(payload: WebhookEvent) {
  const { action, issue, comment, repository, installation } = payload;

  if (!comment || !issue || !installation || action !== 'created') return;

  const body = comment.body || '';

  // Check for bot mentions in comments (pipilot-swe-agent)
  if (/@pipilot-swe-agent/i.test(body)) {
    console.log(`Bot mentioned in issue #${issue.number} comment`);

    await queueAgentTask({
      type: 'issue_comment',
      installationId: installation.id,
      repository: repository.full_name,
      issueNumber: issue.number,
      commentId: comment.id,
      content: body
    });
  }
}

// Handle pull request events
async function handlePullRequest(payload: WebhookEvent) {
  const { action, pull_request, repository, installation } = payload;

  if (!pull_request || !installation) return;

  if (action === 'opened' || action === 'synchronize') {
    console.log(`Processing PR #${pull_request.number}: ${pull_request.title}`);

    // Check PR description and comments for bot mentions (pipilot-swe-agent)
    const body = pull_request.body || '';
    const hasMention = /@pipilot-swe-agent/i.test(body);

    if (hasMention || action === 'opened') {
      await queueAgentTask({
        type: 'pull_request_review',
        installationId: installation.id,
        repository: repository.full_name,
        pullRequestNumber: pull_request.number,
        content: body,
        title: pull_request.title
      });
    }
  }
}

// Handle pull request review comment events
async function handlePullRequestReviewComment(payload: WebhookEvent) {
  const { action, comment, pull_request, repository, installation } = payload;

  if (!comment || !pull_request || !installation || action !== 'created') return;

  const body = comment.body || '';

  if (/@pipilot-swe-agent/i.test(body)) {
    console.log(`Bot mentioned in PR #${pull_request.number} review comment (pipilot-swe-agent)`);

    await queueAgentTask({
      type: 'pr_review_comment',
      installationId: installation.id,
      repository: repository.full_name,
      pullRequestNumber: pull_request.number,
      commentId: comment.id,
      content: body
    });
  }
}

// Handle workflow run events (for CI/CD monitoring)
async function handleWorkflowRun(payload: WebhookEvent) {
  const { action, workflow_run, repository, installation } = payload;

  if (!workflow_run || !installation) return;

  if (action === 'completed' && workflow_run.conclusion === 'failure') {
    console.log(`Workflow failure detected: ${workflow_run.name}`);

    await queueAgentTask({
      type: 'workflow_failure',
      installationId: installation.id,
      repository: repository.full_name,
      workflowRunId: workflow_run.id,
      workflowName: workflow_run.name
    });
  }
}

// Queue agent tasks for processing
async function queueAgentTask(task: any) {
  console.log('Queueing agent task:', task);

  // Process the task immediately for development/demo purposes
  // In production, you'd want to use a proper job queue
  try {
    await processAgentTask(task);
  } catch (error) {
    console.error('Error processing agent task:', error);
  }
}

// Process agent task by calling the chat API
async function processAgentTask(task: any) {
  try {
    console.log('Processing agent task:', task.type);

    // Extract the command/request from the content
    let command = '';
    if (task.type === 'issue_analysis' || task.type === 'issue_comment') {
      // Remove the bot mention and extract the actual command
      command = task.content.replace(/@pipilot-swe-agent/gi, '').trim();
    } else if (task.type === 'pull_request_review') {
      command = `Review this pull request: ${task.title}`;
    } else if (task.type === 'workflow_failure') {
      command = `Fix this workflow failure: ${task.workflowName}`;
    }

    if (!command && task.type !== 'pull_request_review') {
      console.log('No command extracted from task');
      return;
    }

    // Get installation token for GitHub API access
    const installationToken = await getInstallationToken(task.installationId);
    if (!installationToken) {
      console.error('Failed to get installation token');
      return;
    }

    // Get repository info to determine default branch
    const repoInfo = await getRepositoryInfo(task.installationId, task.repository);
    const defaultBranch = repoInfo?.default_branch || 'main';

    // Format as messages array for the chat API
    const messages = [
      {
        role: 'user',
        content: command
      }
    ];

    // Call the chat API (not repo-agent)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        repo: task.repository,
        branch: defaultBranch,
        githubToken: installationToken,
        modelId: 'claude-3-5-sonnet-20241022'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Agent API error:', error);
      return;
    }

    const result = await response.json();
    console.log('Agent task completed successfully:', result);

  } catch (error) {
    console.error('Error processing agent task:', error);
  }
}