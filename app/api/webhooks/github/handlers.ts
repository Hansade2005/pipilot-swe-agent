import { getInstallationToken, getRepositoryInfo } from './helpers';
import { WebhookEvent } from './types';

const BOT_NAME = 'pipilot-swe-agent';

// Process issue events (opened, edited, commented)
export async function handleIssueEvent(payload: WebhookEvent) {
  const { action, issue, repository, sender, comment } = payload;

  // Only process new comments (not issue creation/edits)
  if (action !== 'opened' && action !== 'created') {
    return;
  }

  const content = comment?.body || issue?.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository) {
    console.log('Missing required data for issue event');
    return;
  }

  // Check if the bot is mentioned
  const mentionPattern = new RegExp(`@${BOT_NAME}\\b`, 'i');
  if (!mentionPattern.test(content)) {
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
    const command = content.replace(mentionPattern, '').trim();

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this issue.'
    }];

    // Call the chat API and get response
    const chatResponse = await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId)
    });

    if (chatResponse) {
      // Post response back to GitHub
      await postCommentToGitHub(
        installationId,
        repository.full_name,
        issue!.number,
        comment?.id ? 'issue_comment' : 'issue',
        chatResponse
      );
    }

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

  // Check if bot is mentioned
  const mentionPattern = new RegExp(`@${BOT_NAME}\\b`, 'i');
  if (!mentionPattern.test(content)) {
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
    const command = content.replace(mentionPattern, '').trim();

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this pull request.'
    }];

    // Call the chat API and get response
    const chatResponse = await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId)
    });

    if (chatResponse) {
      // Post response back to GitHub
      await postCommentToGitHub(
        installationId,
        repository.full_name,
        pull_request.number,
        'pull_request',
        chatResponse
      );
    }

  } catch (error) {
    console.error('Error processing PR event:', error);
  }
}

// Process pull request review comment events
export async function handlePullRequestReviewCommentEvent(payload: WebhookEvent) {
  const { action, comment, repository, sender } = payload;

  // Only process new review comments
  if (action !== 'created') {
    return;
  }

  const content = comment?.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository || !comment) {
    return;
  }

  // Check if bot is mentioned
  const mentionPattern = new RegExp(`@${BOT_NAME}\\b`, 'i');
  if (!mentionPattern.test(content)) {
    return;
  }

  console.log(`Processing PR review comment`);

  try {
    // Get repository info for default branch
    const repoInfo = await getRepositoryInfo(installationId, repository.full_name);
    if (!repoInfo) {
      console.error('Failed to get repository info');
      return;
    }

    const defaultBranch = repoInfo.default_branch || 'main';

    // Extract command (remove bot mention)
    const command = content.replace(mentionPattern, '').trim();

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this review comment.'
    }];

    // Call the chat API and get response
    const chatResponse = await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId)
    });

    if (chatResponse) {
      // Post response back to GitHub
      await postCommentToGitHub(
        installationId,
        repository.full_name,
        comment.pull_request_url.split('/').pop()!, // Extract PR number from URL
        'pull_request_review_comment',
        chatResponse
      );
    }

  } catch (error) {
    console.error('Error processing PR review comment event:', error);
  }
}

// Process installation events
export async function handleInstallationEvent(payload: WebhookEvent) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  if (action === 'created') {
    const repoNames = repositories_added?.map(repo => repo.full_name) || [];
    console.log(`App installed on repositories:`, repoNames);
  } else if (action === 'deleted') {
    const repoNames = repositories_removed?.map(repo => repo.full_name) || [];
    console.log(`App uninstalled from repositories:`, repoNames);
  }
}

// Call the chat API and collect streaming response
async function callChatAPI(params: {
  messages: Array<{role: string, content: string}>,
  repo: string,
  branch: string,
  githubToken: string | null
}): Promise<string | null> {
  if (!githubToken) {
    console.error('No GitHub token available');
    return null;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
        repo: params.repo,
        branch: params.branch,
        githubToken: params.githubToken
        // No modelId - let the API use defaults
      })
    });

    if (!response.ok) {
      console.error('Chat API error:', await response.text());
      return null;
    }

    // Collect streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('No response body');
      return null;
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const part = JSON.parse(line);
            if (part.type === 'text-delta' && part.textDelta) {
              fullResponse += part.textDelta;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse.trim() || 'I apologize, but I was unable to generate a response. Please try again.';

  } catch (error) {
    console.error('Error calling chat API:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again later.';
  }
}

// Post comment to GitHub
async function postCommentToGitHub(
  installationId: number,
  repo: string,
  issueNumber: number,
  type: 'issue' | 'issue_comment' | 'pull_request' | 'pull_request_review_comment',
  body: string
) {
  try {
    const token = await getInstallationToken(installationId);
    if (!token) {
      console.error('No installation token for posting comment');
      return;
    }

    // Format the comment with bot attribution
    const formattedBody = `🤖 **PiPilot SWE Agent**\n\n${body}`;

    const endpoint = type === 'pull_request'
      ? `/repos/${repo}/issues/${issueNumber}/comments`
      : `/repos/${repo}/issues/${issueNumber}/comments`;

    const response = await fetch(`https://api.github.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-SWE-Agent'
      },
      body: JSON.stringify({ body: formattedBody })
    });

    if (!response.ok) {
      console.error('Failed to post comment:', await response.text());
    } else {
      console.log('✅ Comment posted successfully');
    }

  } catch (error) {
    console.error('Error posting comment to GitHub:', error);
  }
}