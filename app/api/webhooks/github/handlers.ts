import { getInstallationToken, getRepositoryInfo, createComment } from './helpers';
import { WebhookEvent } from './types';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/lib/stripe';

const BOT_NAME = 'pipilot-swe-agent';

// Process issue events (opened, edited, commented)
export async function handleIssueEvent(payload: WebhookEvent) {
  const { action, issue, repository, sender, comment } = payload;

  // Only process issue creation or new comments
  if (action !== 'opened' && action !== 'created') {
    return;
  }

  const content = comment?.body || issue?.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository) {
    console.log('Missing required data for issue event');
    return;
  }

  // Check if the bot is mentioned - use simple includes check
  if (!content.includes(`@${BOT_NAME}`)) {
    console.log('Bot not mentioned in issue/PR');
    return;
  }

  console.log(`Processing ${comment ? 'issue comment' : 'issue'} #${issue?.number}`);

  try {
    // Get repository info for default branch
    const repoInfo = await getRepositoryInfo(installationId, repository.full_name);
    if (!repoInfo) {
      console.error('Failed to get repository info');
      return;
    }

    const defaultBranch = repoInfo.default_branch || 'main';

    // Extract command (remove bot mention)
    const command = content.replace(new RegExp(`@${BOT_NAME}`, 'gi'), '').trim();

    // Check user subscription and usage limits
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, subscription_plan, tasks_this_month')
      .eq('github_username', sender.login)
      .single();

    if (!user) {
      console.log('User not found in DB, skipping');
      return;
    }

    const planLimits = PLAN_LIMITS[user.subscription_plan as keyof typeof PLAN_LIMITS];
    if (!planLimits || user.tasks_this_month >= planLimits.monthlyTasks) {
      let limitMessage: string;
      if (user.subscription_plan === 'free') {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Upgrade to **Pro** for 150 tasks/month:\n` +
                      `🔗 [Subscribe Now](https://swe.pipilot.dev/setup?plan=pro_monthly)`;
      } else {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Buy **150 extra credits** for $30 ($0.20/credit):\n` +
                      `🔗 [Buy Credits](https://swe.pipilot.dev/setup?plan=credits_150)`;
      }
      await createComment(installationId, repository.full_name, issue!.number, limitMessage);
      return;
    }

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: `Regarding issue #${issue.number}: ${command || 'Please help me understand this issue.'}`
    }];

    // Call the chat API - AI will use github_create_comment tool to respond directly
    await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId),
      issueNumber: issue!.number,
      commentId: comment?.id,
      isReply: !!comment?.id,
      userId: user.id,
      installationId
    });

    // Usage increment now handled inside chat API after stream completes

    // AI handles commenting directly via tools - no manual posting needed

  } catch (error) {
    console.error('Error processing issue event:', error);
  }
}

// Process pull request events
export async function handlePullRequestEvent(payload: WebhookEvent) {
  const { action, pull_request, repository, sender } = payload;

  // Only process opened PRs and new comments
  if (action !== 'opened' && action !== 'created') {
    return;
  }

  const content = pull_request?.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository || !pull_request) {
    return;
  }

  // Check if bot is mentioned - use simple includes check
  if (!content.includes(`@${BOT_NAME}`)) {
    return;
  }

  console.log(`Processing PR #${pull_request.number}`);

  try {
    // Get repository info for default branch
    const repoInfo = await getRepositoryInfo(installationId, repository.full_name);
    if (!repoInfo) {
      console.error('Failed to get repository info');
      return;
    }

    const defaultBranch = repoInfo.default_branch || 'main';

    // Extract command (remove bot mention)
    const command = content.replace(new RegExp(`@${BOT_NAME}`, 'gi'), '').trim();

    // Check user subscription and usage limits
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, subscription_plan, tasks_this_month')
      .eq('github_username', sender.login)
      .single();

    if (!user) {
      console.log('User not found in DB, skipping');
      return;
    }

    const planLimits = PLAN_LIMITS[user.subscription_plan as keyof typeof PLAN_LIMITS];
    if (!planLimits || user.tasks_this_month >= planLimits.monthlyTasks) {
      let limitMessage: string;
      if (user.subscription_plan === 'free') {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Upgrade to **Pro** for 150 tasks/month:\n` +
                      `🔗 [Subscribe Now](https://swe.pipilot.dev/setup?plan=pro_monthly)`;
      } else {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Buy **150 extra credits** for $30 ($0.20/credit):\n` +
                      `🔗 [Buy Credits](https://swe.pipilot.dev/setup?plan=credits_150)`;
      }
      await createComment(installationId, repository.full_name, pull_request.number, limitMessage);
      return;
    }

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this PR.'
    }];

    // Call the chat API - AI will use github_create_comment tool to respond directly
    await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId),
      issueNumber: pull_request.number,
      userId: user.id,
      installationId
    });

    // Usage increment now handled inside chat API after stream completes
  } catch (error) {
    console.error('Error processing PR event:', error);
  }
}
// Process pull request review comment events
export async function handlePullRequestReviewCommentEvent(payload: WebhookEvent) {
  const { action, comment, repository, pull_request } = payload;

  // Only process new review comments
  if (action !== 'created') {
    return;
  }

  const content = comment?.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository || !pull_request) {
    return;
  }

  // Check if bot is mentioned - use simple includes check
  if (!content.includes(`@${BOT_NAME}`)) {
    return;
  }

  console.log(`Processing PR review comment on PR #${pull_request.number}`);

  try {
    // Get repository info for default branch
    const repoInfo = await getRepositoryInfo(installationId, repository.full_name);
    if (!repoInfo) {
      console.error('Failed to get repository info');
      return;
    }

    const defaultBranch = repoInfo.default_branch || 'main';

    // Extract command (remove bot mention)
    const command = content.replace(new RegExp(`@${BOT_NAME}`, 'gi'), '').trim();

    // Check user subscription and usage limits
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('id, subscription_plan, tasks_this_month')
      .eq('github_username', comment.user.login)
      .single();

    if (!user) {
      console.log('User not found in DB, skipping');
      return;
    }

    const planLimits = PLAN_LIMITS[user.subscription_plan as keyof typeof PLAN_LIMITS];
    if (!planLimits || user.tasks_this_month >= planLimits.monthlyTasks) {
      let limitMessage: string;
      if (user.subscription_plan === 'free') {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Upgrade to **Pro** for 150 tasks/month:\n` +
                      `🔗 [Subscribe Now](https://swe.pipilot.dev/setup?plan=pro_monthly)`;
      } else {
        limitMessage = `🚫 **Monthly task limit reached!** (${user.tasks_this_month}/${planLimits?.monthlyTasks || 0})\n\n` +
                      `Buy **150 extra credits** for $30 ($0.20/credit):\n` +
                      `🔗 [Buy Credits](https://swe.pipilot.dev/setup?plan=credits_150)`;
      }
      await createComment(installationId, repository.full_name, pull_request.number, limitMessage);
      return;
    }

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this review comment.'
    }];

    // Call the chat API - AI will use github_create_comment tool to respond directly
    await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId),
      issueNumber: pull_request.number,
      userId: user.id,
      installationId
    });

    // Usage increment now handled inside chat API after stream completes

  } catch (error) {
    console.error('Error processing PR review comment event:', error);
  }
}

// Handle app installation events
export async function handleInstallation(payload: WebhookEvent) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (action === 'created') {
    const repoNames = repositories_added?.map(repo => repo.full_name) || [];
    console.log(`App installed on repositories:`, repoNames);
  } else if (action === 'deleted') {
    const repoNames = repositories_removed?.map(repo => repo.full_name) || [];
    console.log(`App uninstalled from repositories:`, repoNames);
  }
}

// Call the chat API - AI will use tools to communicate directly
async function callChatAPI(params: {
  messages: Array<{ role: string; content: string }>;
  repo: string;
  branch: string;
  githubToken: string;
  issueNumber?: number;
  commentId?: number;
  isReply?: boolean;
  userId: string;
  installationId: number;
}) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error(`Chat API error: ${response.status}`);
      return null;
    }

    // AI uses tools to communicate directly - no text response expected
    console.log('Chat API called - AI will use commenting tools to respond');
    return true;
  } catch (error) {
    console.error('Error calling chat API:', error);
    return null;
  }
}

// Post comment to GitHub
async function postCommentToGitHub(
  installationId: number,
  repo: string,
  number: number,
  type: 'issue' | 'issue_comment' | 'pull_request' | 'pull_request_review_comment',
  content: string
) {
  try {
    const token = await getInstallationToken(installationId);

    let url: string;
    let body: any;

    if (type === 'issue') {
      // Comment on issue
      url = `https://api.github.com/repos/${repo}/issues/${number}/comments`;
      body = { body: formatBotResponse(content) };
    } else if (type === 'issue_comment') {
      // Reply to issue comment
      url = `https://api.github.com/repos/${repo}/issues/comments/${number}`;
      body = { body: formatBotResponse(content) };
    } else if (type === 'pull_request') {
      // Comment on PR
      url = `https://api.github.com/repos/${repo}/issues/${number}/comments`;
      body = { body: formatBotResponse(content) };
    } else {
      // PR review comment
      url = `https://api.github.com/repos/${repo}/pulls/${number}/comments`;
      body = { body: formatBotResponse(content) };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`, await response.text());
    } else {
      console.log(`Posted ${type} comment to ${repo}#${number}`);
    }
  } catch (error) {
    console.error('Error posting comment to GitHub:', error);
  }
}

// Format bot response for GitHub
function formatBotResponse(content: string): string {
  return `🤖 **PiPilot SWE Agent**

${content}`;
}