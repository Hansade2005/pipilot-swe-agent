import { getInstallationToken, getRepositoryInfo } from './helpers';
import { WebhookEvent } from './types';
import { callChatAPI, postCommentToGitHub } from './handlers';

const BOT_NAME = 'pipilot-swe-agent';

// Process pull request review events
export async function handlePRReviewEvent(payload: WebhookEvent) {
  const { action, review, repository, pull_request } = payload;

  // Only process submitted reviews (not pending or dismissed)
  if (action !== 'submitted' || !review) {
    return;
  }

  const content = review.body || '';
  const installationId = payload.installation?.id;

  if (!installationId || !content || !repository || !pull_request) {
    return;
  }

  // Check if bot is mentioned in the review - use simple includes check
  if (!content.includes(`@${BOT_NAME}`)) {
    console.log('Bot not mentioned in PR review');
    return;
  }

  console.log(`Processing PR review on PR #${pull_request.number}`);

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

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: command || 'Please help me understand this PR review.'
    }];

    // Call the chat API - AI will use github_create_comment tool to respond directly
    await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId),
      issueNumber: pull_request.number
    });

    // AI handles commenting directly via tools

  } catch (error) {
    console.error('Error processing PR review event:', error);
  }
}

// Process check run events (CI/CD failures)
export async function handleCheckRunEvent(payload: WebhookEvent) {
  const { action, check_run, repository } = payload;

  // Only process completed check runs
  if (action !== 'completed' || !check_run) {
    return;
  }

  // Only process failed checks
  if (check_run.conclusion !== 'failure') {
    console.log(`Check run ${check_run.name} completed with status: ${check_run.conclusion}`);
    return;
  }

  const installationId = payload.installation?.id;

  if (!installationId || !repository) {
    return;
  }

  console.log(`Processing failed check run: ${check_run.name} in ${repository.full_name}`);

  try {
    // Get repository info for default branch
    const repoInfo = await getRepositoryInfo(installationId, repository.full_name);
    if (!repoInfo) {
      console.error('Failed to get repository info');
      return;
    }

    const defaultBranch = repoInfo.default_branch || 'main';

    // Prepare messages for chat API
    const messages = [{
      role: 'user' as const,
      content: `The CI/CD check "${check_run.name}" has failed. Please help analyze and fix this build failure. Check details: ${check_run.html_url}`
    }];

    // Call the chat API and get response
    const chatResponse = await callChatAPI({
      messages,
      repo: repository.full_name,
      branch: defaultBranch,
      githubToken: await getInstallationToken(installationId)
    });

    if (chatResponse) {
      // Create an issue to track the CI failure
      await createIssueForCIFailure(installationId, repository.full_name, check_run, chatResponse);
    }

  } catch (error) {
    console.error('Error processing check run event:', error);
  }
}

// Helper function to create an issue for CI failures
async function createIssueForCIFailure(
  installationId: number,
  repo: string,
  checkRun: any,
  analysis: string
) {
  try {
    const token = await getInstallationToken(installationId);

    const issueTitle = `🔴 CI Failure: ${checkRun.name}`;
    const issueBody = `🤖 **PiPilot SWE Agent - CI Failure Analysis**

The CI/CD check **"${checkRun.name}"** has failed.

**Check Details:**
- Status: ${checkRun.status}
- Conclusion: ${checkRun.conclusion}
- Check URL: ${checkRun.html_url}

**Analysis:**
${analysis}

**Next Steps:**
- Review the check logs for detailed error messages
- Fix any identified issues
- Re-run the CI pipeline after fixes

@pipilot-swe-agent can help implement fixes if needed.`;

    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['ci-failure', 'pipilot-swe-agent']
      }),
    });

    if (response.ok) {
      const issue = await response.json();
      console.log(`Created CI failure issue: ${repo}#${issue.number}`);
    } else {
      console.error(`Failed to create CI issue: ${response.status}`, await response.text());
    }
  } catch (error) {
    console.error('Error creating CI failure issue:', error);
  }
}