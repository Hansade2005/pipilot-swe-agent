import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'
import { NextResponse } from 'next/server'
import { authenticateUser, processRequestBilling } from '@/lib/billing/auth-middleware'
import { CREDITS_PER_MESSAGE } from '@/lib/billing/credit-manager'
import { Octokit } from '@octokit/rest'
import { getOptimizedFileContext, getStagedChanges, getFileContent, applyIncrementalEdits } from './helpers'
import JSZip from 'jszip'

// Tavily API configuration for web search
const tavilyConfig = {
  apiKeys: [
    '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',
    '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',
    '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'
  ],
  searchUrl: 'https://api.tavily.com/search',
  extractUrl: 'https://api.tavily.com/extract',
  currentKeyIndex: 0
};

// Timeout utility function
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // For fetch requests, we need to handle AbortController differently
    if (promise instanceof Promise && 'abort' in (promise as any)) {
      // This is likely a fetch request, pass the signal
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    } else {
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Clean and format web search results for better AI consumption
function cleanWebSearchResults(results: any[], query: string): string {
  if (!results || results.length === 0) {
    return `No results found for query: "${query}"`
  }

  let cleanedText = `🔍 **Web Search Results for: "${query}"**\n\n`

  results.forEach((result, index) => {
    const title = result.title || 'Untitled'
    const url = result.url || 'No URL'
    const content = result.content || result.raw_content || 'No content available'

    // Clean and truncate content to 1500 chars total
    const maxContentPerResult = Math.floor(1500 / results.length)
    const cleanedContent = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerResult)

    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedContent}${cleanedContent.length >= maxContentPerResult ? '...' : ''}\n\n`
  })

  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }

  return cleanedText
}

// Web search function using Tavily API
async function searchWeb(query: string) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }

  try {
    console.log('Starting web search for:', query);

    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;

    const response = await fetch(tavilyConfig.searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response format from Tavily API');
    }

    return cleanWebSearchResults(data.results, query);
  } catch (error) {
    console.error('Web search error:', error);
    throw new Error(`Failed to search web: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// GitHub API helper functions
async function getGitHubClient(installationId: string) {
  const { createAppAuth } = await import('@octokit/auth-app');
  const { Octokit } = await import('@octokit/rest');

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GitHub App credentials not configured');
  }

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId: parseInt(installationId)
    }
  });

  return octokit;
}

// File operations
async function readFile(octokit: any, repo: string, path: string, branch: string = 'main') {
  try {
    const response = await octokit.repos.getContent({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      ref: branch
    });

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createFile(octokit: any, repo: string, path: string, content: string, message: string, branch: string = 'main') {
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch
    });
  } catch (error) {
    throw new Error(`Failed to create file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function editFile(octokit: any, repo: string, path: string, oldContent: string, newContent: string, message: string, branch: string = 'main') {
  try {
    const response = await octokit.repos.getContent({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      ref: branch
    });

    await octokit.repos.createOrUpdateFileContents({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      message,
      content: Buffer.from(newContent).toString('base64'),
      sha: response.data.sha,
      branch
    });
  } catch (error) {
    throw new Error(`Failed to edit file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function deleteFile(octokit: any, repo: string, path: string, message: string, branch: string = 'main') {
  try {
    const response = await octokit.repos.getContent({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      ref: branch
    });

    await octokit.repos.deleteFile({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      message,
      sha: response.data.sha,
      branch
    });
  } catch (error) {
    throw new Error(`Failed to delete file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function listDirectory(octokit: any, repo: string, path: string = '', branch: string = 'main') {
  try {
    const response = await octokit.repos.getContent({
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path,
      ref: branch
    });

    return response.data.map((item: any) => ({
      name: item.name,
      type: item.type,
      path: item.path,
      size: item.size
    }));
  } catch (error) {
    throw new Error(`Failed to list directory ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function searchCode(octokit: any, repo: string, query: string, path: string = '', extension: string = '') {
  try {
    const response = await octokit.search.code({
      q: `${query} repo:${repo} ${path ? `path:${path}` : ''} ${extension ? `extension:${extension}` : ''}`,
      per_page: 10
    });

    return response.data.items.map((item: any) => ({
      path: item.path,
      repository: item.repository.full_name,
      url: item.html_url,
      snippet: item.text_matches ? item.text_matches[0]?.fragment : ''
    }));
  } catch (error) {
    throw new Error(`Failed to search code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main POST handler
export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  let authContext: any = null;
  let currentRepo = 'unknown';
  let currentBranch = 'main';

  try {
    const body = await request.json();
    const {
      messages,
      model: modelId,
      repo,
      branch = 'main',
      installationId
    } = body;

    currentRepo = repo || 'unknown';
    currentBranch = branch;

    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🚀 Starting request:`, {
      repo: currentRepo,
      branch: currentBranch,
      model: modelId || DEFAULT_CHAT_MODEL,
      messageCount: messages?.length || 0
    });

    // ============================================================================
    // GITHUB APP AUTHENTICATION (Replaced Supabase auth)
    // ============================================================================
    if (!installationId) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Missing installationId`);
      return NextResponse.json(
        { error: 'GitHub App installation ID required' },
        { status: 400 }
      );
    }

    const octokit = await getGitHubClient(installationId);

    // ============================================================================
    // BILLING REMOVED - No more authentication or credit checking
    // ============================================================================

    const model = getModel(modelId || DEFAULT_CHAT_MODEL);

    // ============================================================================
    // SYSTEM PROMPT - Enhanced for autonomous SWE operations
    // ============================================================================
    const systemPrompt = `You are PiPilot, an autonomous software engineering agent powered by a GitHub App. You have direct access to manipulate repository files, search code, run web searches, and create pull requests.

## Your Capabilities:
- **File Operations**: Read, create, edit, delete files in the repository
- **Code Search**: Search repository code using exact text, regex, or semantic queries
- **Web Research**: Search the web for documentation, fixes, and best practices
- **Git Operations**: Create branches, commit changes, open pull requests
- **CI/CD Awareness**: Monitor workflows, understand failures, suggest fixes

## Safety Rules:
- Never touch .env files or sensitive configuration
- Always create branches for non-trivial changes
- Respect repository branch protection rules
- Ask for confirmation on destructive operations
- All changes go through pull requests (never push to main)

## Communication Style:
- Explain your reasoning clearly
- Report progress on long operations
- Summarize changes made
- Act visibly in GitHub with transparent operations

## Available Tools:
Use the provided tools to perform operations. Always explain what you're doing and why.

Repository: ${currentRepo}
Branch: ${currentBranch}`;

    // ============================================================================
    // STREAMING RESPONSE
    // ============================================================================
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      maxToolRoundtrips: 10,
      tools: {
        // File operations
        read_file: tool({
          description: 'Read the contents of a file from the repository',
          parameters: z.object({
            path: z.string().describe('File path in repository'),
            branch: z.string().optional().describe('Branch name, defaults to current')
          }),
          execute: async ({ path, branch }) => {
            return await readFile(octokit, currentRepo, path, branch || currentBranch);
          }
        }),

        create_file: tool({
          description: 'Create a new file in the repository',
          parameters: z.object({
            path: z.string().describe('File path for new file'),
            content: z.string().describe('File content'),
            message: z.string().describe('Commit message'),
            branch: z.string().optional().describe('Branch name, defaults to current')
          }),
          execute: async ({ path, content, message, branch }) => {
            await createFile(octokit, currentRepo, path, content, message, branch || currentBranch);
            return `File created: ${path}`;
          }
        }),

        edit_file: tool({
          description: 'Edit an existing file using search/replace',
          parameters: z.object({
            path: z.string().describe('File path to edit'),
            old_content: z.string().describe('Content to replace'),
            new_content: z.string().describe('New content'),
            message: z.string().describe('Commit message'),
            branch: z.string().optional().describe('Branch name, defaults to current')
          }),
          execute: async ({ path, old_content, new_content, message, branch }) => {
            await editFile(octokit, currentRepo, path, old_content, new_content, message, branch || currentBranch);
            return `File edited: ${path}`;
          }
        }),

        delete_file: tool({
          description: 'Delete a file from the repository',
          parameters: z.object({
            path: z.string().describe('File path to delete'),
            message: z.string().describe('Commit message'),
            branch: z.string().optional().describe('Branch name, defaults to current')
          }),
          execute: async ({ path, message, branch }) => {
            await deleteFile(octokit, currentRepo, path, message, branch || currentBranch);
            return `File deleted: ${path}`;
          }
        }),

        list_directory: tool({
          description: 'List files and directories in a repository path',
          parameters: z.object({
            path: z.string().optional().describe('Directory path, empty for root'),
            branch: z.string().optional().describe('Branch name, defaults to current')
          }),
          execute: async ({ path, branch }) => {
            return await listDirectory(octokit, currentRepo, path || '', branch || currentBranch);
          }
        }),

        search_code: tool({
          description: 'Search for code patterns in the repository',
          parameters: z.object({
            query: z.string().describe('Search query'),
            path: z.string().optional().describe('Limit to specific path'),
            extension: z.string().optional().describe('File extension filter')
          }),
          execute: async ({ query, path, extension }) => {
            return await searchCode(octokit, currentRepo, query, path, extension);
          }
        }),

        // Web search
        web_search: tool({
          description: 'Search the web for documentation and context',
          parameters: z.object({
            query: z.string().describe('Search query')
          }),
          execute: async ({ query }) => {
            return await searchWeb(query);
          }
        }),

        // Git operations (simplified for now)
        create_branch: tool({
          description: 'Create a new branch',
          parameters: z.object({
            name: z.string().describe('Branch name'),
            source: z.string().optional().describe('Source branch, defaults to current')
          }),
          execute: async ({ name, source }) => {
            // Implementation would go here
            return `Branch created: ${name}`;
          }
        }),

        create_pull_request: tool({
          description: 'Create a pull request',
          parameters: z.object({
            title: z.string().describe('PR title'),
            body: z.string().describe('PR description'),
            head: z.string().describe('Head branch'),
            base: z.string().optional().describe('Base branch, defaults to main')
          }),
          execute: async ({ title, body, head, base }) => {
            // Implementation would go here
            return `PR created: ${title}`;
          }
        })
      },
      onFinish: async (result) => {
        const responseTime = Date.now() - startTime;
        console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Request completed (${responseTime}ms):`, {
          toolCalls: result.toolCalls?.length || 0,
          textLength: result.text?.length || 0,
          repo: currentRepo
        });

        // ============================================================================
        // BILLING REMOVED - No more credit processing
        // ============================================================================
      }
    });

    // Return streaming response
    return new Response(result.toDataStreamResponse().body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Error in POST handler (${responseTime}ms):`, {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      repo: currentRepo,
      branch: currentBranch
    });

    // ============================================================================
    // BILLING REMOVED - No error logging needed
    // ============================================================================

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}