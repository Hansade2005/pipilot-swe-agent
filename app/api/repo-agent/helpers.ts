import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';

// Generate GitHub App JWT for authentication
export function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + (10 * 60), // 10 minutes
    iss: appId
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

// Get installation access token for a specific installation
export async function getInstallationToken(installationId: number): Promise<string> {
  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const jwt = generateAppJWT(appId, privateKey);

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PiPilot-SWE-Agent'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get installation token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

// Create authenticated Octokit instance for an installation
export async function createAuthenticatedOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId);

  return new Octokit({
    auth: token,
    userAgent: 'PiPilot-SWE-Agent'
  });
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const computedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

// Extract bot commands from text (mentions like @pipilot-swe-agent do something)
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

// Check if command matches any category
export function categorizeCommand(command: string): string {
  for (const [category, keywords] of Object.entries(BOT_COMMANDS)) {
    if (keywords.some(keyword => command.includes(keyword))) {
      return category.toLowerCase();
    }
  }
  return 'unknown';
}