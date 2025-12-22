import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Get optimized file context for the repository
export async function getOptimizedFileContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<string> {
  try {
    console.log(`[Helpers] Getting optimized context for ${owner}/${repo}:${branch}`);

    // Get repository information
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    const isPrivate = repoInfo.data.private;

    // Get recent commits to understand activity
    const commits = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 5
    });

    // Get repository structure (top level files/directories)
    const contents = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
      ref: branch
    });

    const items = Array.isArray(contents.data) ? contents.data : [contents.data];

    // Build context string
    let context = `## Repository Overview\n`;
    context += `- **Name**: ${repoInfo.data.name}\n`;
    context += `- **Owner**: ${repoInfo.data.owner.login}\n`;
    context += `- **Description**: ${repoInfo.data.description || 'No description'}\n`;
    context += `- **Language**: ${repoInfo.data.language || 'Not specified'}\n`;
    context += `- **Private**: ${isPrivate ? 'Yes' : 'No'}\n`;
    context += `- **Default Branch**: ${repoInfo.data.default_branch}\n`;
    context += `- **Stars**: ${repoInfo.data.stargazers_count}\n`;
    context += `- **Forks**: ${repoInfo.data.forks_count}\n\n`;

    context += `## Repository Structure\n`;
    const dirs = items.filter(item => item.type === 'dir').map(item => item.name);
    const files = items.filter(item => item.type === 'file').map(item => item.name);

    if (dirs.length > 0) {
      context += `### Directories:\n${dirs.map(d => `- ${d}/`).join('\n')}\n\n`;
    }

    if (files.length > 0) {
      context += `### Files:\n${files.map(f => `- ${f}`).join('\n')}\n\n`;
    }

    // Get package.json if it exists
    try {
      const packageJson = await getFileContent(octokit, owner, repo, 'package.json', branch);
      const pkg = JSON.parse(packageJson);
      context += `## Package Information\n`;
      context += `- **Name**: ${pkg.name || 'Unknown'}\n`;
      context += `- **Version**: ${pkg.version || 'Unknown'}\n`;
      if (pkg.dependencies) {
        const depCount = Object.keys(pkg.dependencies).length;
        context += `- **Dependencies**: ${depCount}\n`;
      }
      if (pkg.devDependencies) {
        const devDepCount = Object.keys(pkg.devDependencies).length;
        context += `- **Dev Dependencies**: ${devDepCount}\n`;
      }
      if (pkg.scripts) {
        context += `- **Scripts**: ${Object.keys(pkg.scripts).join(', ')}\n`;
      }
      context += '\n';
    } catch (error) {
      // package.json doesn't exist
    }

    // Get README if it exists
    try {
      const readme = await getFileContent(octokit, owner, repo, 'README.md', branch);
      const lines = readme.split('\n').slice(0, 10); // First 10 lines
      context += `## README Preview\n${lines.join('\n')}\n\n`;
    } catch (error) {
      // README doesn't exist
    }

    // Recent commits
    if (commits.data.length > 0) {
      context += `## Recent Activity\n`;
      commits.data.slice(0, 3).forEach(commit => {
        const date = new Date(commit.commit.author?.date || '').toLocaleDateString();
        const message = commit.commit.message.split('\n')[0];
        context += `- ${date}: ${message} (${commit.sha.substring(0, 7)})\n`;
      });
      context += '\n';
    }

    console.log(`[Helpers] Generated context: ${context.length} characters`);
    return context;

  } catch (error) {
    console.error('[Helpers] Error getting optimized context:', error);
    return 'Unable to retrieve repository context.';
  }
}

// Get file content from GitHub
export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<string> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    if (Array.isArray(response.data)) {
      throw new Error(`${path} is a directory, not a file`);
    }

    const fileData = response.data as any;
    if (fileData.encoding === 'base64') {
      return Buffer.from(fileData.content, 'base64').toString('utf-8');
    }

    return fileData.content || '';
  } catch (error) {
    console.error(`[Helpers] Error getting file content for ${path}:`, error);
    throw error;
  }
}

// Get staged changes summary
export function getStagedChanges(stagedChanges: Map<string, any>): string {
  if (stagedChanges.size === 0) {
    return 'No staged changes.';
  }

  let summary = `## Staged Changes (${stagedChanges.size})\n\n`;
  for (const [path, change] of stagedChanges) {
    summary += `- **${change.operation.toUpperCase()}**: ${path}\n`;
    if (change.description) {
      summary += `  - ${change.description}\n`;
    }
  }
  return summary + '\n';
}

// Apply incremental edits to content
export function applyIncrementalEdits(
  content: string,
  edits: Array<{ old_string: string; new_string: string; context_lines?: number }>
): string {
  let newContent = content;
  for (const edit of edits) {
    const { old_string, new_string } = edit;
    const escapedOld = old_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedOld, 'g');
    newContent = newContent.replace(regex, new_string);
  }
  return newContent;
}

// --------------------- GitHub App Auth & Utilities ---------------------

// Generate GitHub App JWT for authentication
export function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 600, iss: appId };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

// Get installation access token
export async function getInstallationToken(installationId: number): Promise<string> {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const jwtToken = generateAppJWT(appId, privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-SWE-Agent'
      }
    }
  );

  if (!response.ok) throw new Error(`Failed to get installation token: ${response.statusText}`);
  const data = await response.json();
  return data.token;
}

// Create authenticated Octokit instance
export async function createAuthenticatedOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);
  return new Octokit({ auth: token, userAgent: 'PiPilot-SWE-Agent' });
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const computedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
}

// Extract bot commands from text (@mention parser)
export function extractBotCommands(text: string): { command: string; args: string } | null {
  const mentionRegex = /@pipilot-swe-agent\s+(.+)/i;
  const match = text.match(mentionRegex);
  if (!match) return null;
  const commandText = match[1].trim();
  const parts = commandText.split(/\s+/, 2);
  const command = parts[0]?.toLowerCase() || '';
  const args = parts[1] || '';
  return { command, args };
}

// Common bot commands
export const BOT_COMMANDS = {
  EXPLAIN: ['explain', 'what', 'analyze', 'review'],
  FIX: ['fix', 'resolve', 'solve', 'address'],
  SEARCH: ['search', 'find', 'locate', 'grep'],
  CREATE: ['create', 'add', 'new', 'generate'],
  UPDATE: ['update', 'modify', 'change', 'edit'],
  DELETE: ['delete', 'remove', 'rm'],
  HELP: ['help', 'commands', 'usage']
};

// Categorize command
export function categorizeCommand(command: string): string {
  for (const [category, keywords] of Object.entries(BOT_COMMANDS)) {
    if (keywords.some(keyword => command.includes(keyword))) return category.toLowerCase();
  }
  return 'unknown';
}
