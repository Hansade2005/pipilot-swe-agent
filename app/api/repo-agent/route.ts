import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'
import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { getOptimizedFileContext, getStagedChanges, getFileContent, applyIncrementalEdits } from './helpers'
import JSZip from 'jszip'

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID
const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET

// Tavily API configuration for web search
const tavilyConfig = {
  apiKeys: [
    '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', // Replace with actual keys
    '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',
    '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'
  ],
  searchUrl: 'https://api.tavily.com/search',
  extractUrl: 'https://api.tavily.com/extract',
  currentKeyIndex: 0
}

// Timeout utility function
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const result = await promise
    clearTimeout(timeoutId)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`)
    }
    throw error
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
    throw new Error('No Tavily API keys are configured.')
  }

  try {
    console.log('Starting web search for:', query)

    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex]
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: true,
        max_results: 5
      })
    })

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`)
    }

    const data = await response.json()

    // Clean and format results for AI consumption
    const cleanedResults = cleanWebSearchResults(data.results || [], query)

    console.log('Web search successful (cleaned and formatted):', {
      query,
      resultCount: data.results?.length || 0,
      cleanedLength: cleanedResults.length
    })

    return {
      rawData: data,
      cleanedResults: cleanedResults,
      query: query,
      resultCount: data.results?.length || 0
    }
  } catch (error) {
    console.error('Web search error:', error)
    throw error
  }
}

// GitHub App authentication utilities
async function generateAppJWT(): Promise<string> {
  if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App credentials not configured')
  }

  const { createAppAuth } = await import('@octokit/auth-app')
  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_PRIVATE_KEY,
  })

  const { token } = await auth({ type: 'app' })
  return token
}

async function getInstallationToken(installationId: number): Promise<string> {
  if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY) {
    throw new Error('GitHub App credentials not configured')
  }

  const { createAppAuth } = await import('@octokit/auth-app')
  const auth = createAppAuth({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_PRIVATE_KEY,
  })

  const { token } = await auth({ type: 'installation', installationId })
  return token
}

async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('GitHub webhook secret not configured, skipping verification')
    return true
  }

  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET)
  hmac.update(payload, 'utf8')
  const expectedSignature = `sha256=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Disable Next.js body parser for binary data handling
export const config = {
  api: {
    bodyParser: false,
  },
}

// In-memory project storage for repo-agent sessions
// Key: repoKey (owner/repo), Value: { fileTree: string[], files: Map<path, fileData> }
const repoSessionStorage = new Map<string, {
  fileTree: string[]
  files: Map<string, any>
}>()

// Get AI model by ID with fallback to default
const getAIModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)

    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }

    console.log(`[RepoAgent] Using AI model: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('[RepoAgent] Failed to get AI model:', error)
    console.log(`[RepoAgent] Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Get specialized system prompt for Repo Agent
const getRepoAgentSystemPrompt = (modelId: string): string => {
  return `You are PiPilot SWE Agent, an elite AI assistant specialized in remote GitHub repository operations. You have direct access to manipulate files, create branches, and manage repositories through the GitHub API.

═══════════════════════════════════════════════════════════════
CORE CAPABILITIES
═══════════════════════════════════════════════════════════════

## 🔧 AVAILABLE TOOLS
- **github_read_file** - Read any file from the connected repository
- **github_write_file** - Create or update files in the repository
- **github_delete_file** - Remove files from the repository
- **github_list_files** - Browse repository directory structure
- **github_list_repos** - Show user's accessible repositories
- **github_get_repo_info** - Get repository metadata and details
- **github_get_commit_statuses** - Get deployment/CI statuses for a commit
- **github_create_branch** - Create new branches for changes
- **github_create_repo** - Create new GitHub repositories
- **github_create_tag** - Create tags (releases)
- **github_list_tags** - List repository tags
- **github_delete_tag** - Delete tags
- **github_search_code** - Search for code patterns across the repository
- **github_get_commits** - View commit history and changes
- **github_get_commit** - Get detailed information about a specific commit (files changed, additions/deletions, diffs)
- **github_revert_to_commit** - Revert repository to a specific commit (force reset all changes after that commit)
- **github_create_pull_request** - Create PRs for your changes
- **github_semantic_search** - Advanced semantic code search and analysis
- **github_replace_string** - Powerful string replacement with regex support
- **github_grep_search** - Elite multi-strategy search engine
- **github_edit_file** - Precise file editing with Git diff-style search/replace blocks
- **github_create_todo** - Create todo items to track progress on tasks
- **github_update_todo** - Update existing todo items (status, title, description)
- **github_delete_todo** - Delete todo items
- **check_dev_errors** - Run error checks on the repository (JavaScript/TypeScript build or Python syntax)
- **github_list_workflows** - List all GitHub Actions workflows in the repository
- **github_trigger_workflow** - Manually trigger a workflow run with optional input parameters
- **github_list_workflow_runs** - List runs for a specific workflow with status filtering
- **github_get_workflow_run** - Get detailed information about a specific workflow run (status, timing, logs URL)
- **github_get_workflow_run_logs** - Download and retrieve complete logs from a workflow run
- **github_cancel_workflow_run** - Cancel an in-progress workflow run
- **github_rerun_workflow** - Rerun a failed or previous workflow execution
- **web_search** - Search the web for current information and context, returns clean structured text
- **web_extract** - Extract content from web pages using AnyAPI web scraper

## 🎯 WORKFLOW PRINCIPLES
1. **Repository Context**: Always maintain awareness of the current repository and branch
2. **Safe Operations**: Never delete important files without confirmation
3. **Clear Communication**: Explain every action you're taking
4. **Version Control**: Create branches for significant changes
5. **Code Quality**: Follow repository conventions and patterns

## 🌐 WEB RESEARCH CAPABILITIES
- **web_search**: Use when you need current information, documentation, or context from the internet
  - Search for programming frameworks, APIs, best practices, or troubleshooting information
  - Get up-to-date information about tools, libraries, or technologies
  - Research solutions to technical problems or implementation approaches
- **web_extract**: Use when you need to analyze specific web pages or documentation
  - Extract content from API documentation, tutorials, or technical articles
  - Get detailed information from specific URLs for implementation reference
  - Combine with web_search to get comprehensive information about a topic

## 📋 EDITING TOOLS GUIDE
- **github_write_file**: For creating new files or completely replacing existing ones
- **github_edit_file**: For precise edits using Git diff-style search/replace blocks (recommended for most edits)
- **github_replace_string**: For simple string replacements with regex support
- **github_delete_file**: For removing files entirely

## 📋 TODO MANAGEMENT
- **github_create_todo**: Create todo items with unique IDs to track task progress
  - Always provide a descriptive, unique ID (e.g., "setup-database-schema", "implement-user-auth", "add-error-handling")
  - Use clear, actionable titles and detailed descriptions
  - Set appropriate initial status (usually "pending")
- **github_update_todo**: Modify existing todos by their exact ID
  - Update status to "completed" when tasks are finished
  - Modify titles/descriptions as needed for clarity
- **github_delete_todo**: Remove todos that are no longer relevant
- **ID Consistency**: Always use the exact same ID you created for updates/deletes
- **Context Awareness**: Check existing todos above before creating new ones - update existing todos instead of creating duplicates

## 📋 RESPONSE FORMAT
When performing operations:
1. **Acknowledge** the user's request
2. **Plan** your approach (which tools to use)
3. **Execute** operations step by step
4. **Report** results clearly
5. **Suggest** next steps if applicable

## 🚨 SAFETY PROTOCOLS
- Never modify .env files or sensitive configuration
- Always create branches for non-trivial changes
- Respect repository branch protection rules
- Ask for confirmation on destructive operations

═══════════════════════════════════════════════════════════════
SWE AGENT WORKFLOW
═══════════════════════════════════════════════════════════════

**Initial Setup:**
- Confirm repository connection
- Verify user permissions
- Set working branch context

**Task Execution:**
- Break down complex tasks into steps
- Use appropriate tools for each operation
- Provide progress updates
- Handle errors gracefully

**Completion:**
- Summarize changes made
- Suggest follow-up actions
- Offer to create pull requests for changes

Remember: You are working directly on live GitHub repositories. Every action you take is real and permanent. Exercise caution and clarity in all operations.`
}

// GitHub API utility functions
const createOctokitClient = (token: string) => {
  return new Octokit({
    auth: token,
  })
}

const getUserEmail = async (octokit: Octokit) => {
  try {
    const emails = await octokit.users.listEmailsForAuthenticatedUser()
    const primaryEmail = emails.data.find(email => email.primary && email.verified)
    return primaryEmail ? primaryEmail.email : null
  } catch (error) {
    console.error('Failed to get user email:', error)
    return null
  }
}

const parseRepoString = (repoString: string) => {
  const [owner, repo] = repoString.split('/')
  return { owner, repo }
}

// Advanced tool helper functions
const buildSemanticSearchTerms = (query: string): string => {
  const lowerQuery = query.toLowerCase()

  // Map natural language to code patterns
  const semanticMappings: Record<string, string[]> = {
    'react component': ['function.*Component', 'const.*=.*\\(', 'export.*function', 'export.*const'],
    'api endpoint': ['router\\.\\.', 'app\\.\\.', 'Route', '@app\\.\\route', 'def.*api', 'func.*handler'],
    'error handling': ['try.*catch', 'except', 'rescue', 'catch.*Error', 'throw', 'raise'],
    'database model': ['class.*Model', 'interface.*Model', 'type.*Model', 'Schema', 'model\\('],
    'test file': ['describe\\(', 'it\\(', 'test\\(', 'spec', '\\.test\\.', '\\.spec\\.'],
    'configuration': ['config', 'settings', 'env', 'Config', 'Settings'],
    'utility function': ['export.*function', 'export.*const', 'util', 'helper', 'Utils'],
    'hook': ['use[A-Z]', 'useState', 'useEffect', 'useCallback', 'useMemo'],
    'middleware': ['middleware', 'Middleware', 'next\\(', 'req.*res'],
    'validation': ['validate', 'schema', 'zod', 'yup', 'joi', 'Validate']
  }

  const terms = []
  for (const [key, patterns] of Object.entries(semanticMappings)) {
    if (lowerQuery.includes(key)) {
      terms.push(...patterns)
    }
  }

  // Add the original query if no semantic matches
  if (terms.length === 0) {
    terms.push(query)
  }

  return terms.join(' OR ')
}

const detectLanguage = (filePath: string, content: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sh': 'Shell',
    'bash': 'Bash',
    'sql': 'SQL'
  }

  return languageMap[ext || ''] || 'Unknown'
}

const getRelevantExcerpt = (content: string, query: string, lines: number): string => {
  const contentLines = content.split('\\n')
  const lowerQuery = query.toLowerCase()

  // Find lines containing the query
  const matchingLines = contentLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.toLowerCase().includes(lowerQuery))
    .slice(0, lines)

  if (matchingLines.length === 0) {
    // Return first few lines if no matches
    return contentLines.slice(0, lines).join('\\n')
  }

  // Get context around first match
  const matchIndex = matchingLines[0].index
  const start = Math.max(0, matchIndex - Math.floor(lines / 2))
  const end = Math.min(contentLines.length, start + lines)

  return contentLines.slice(start, end).join('\\n')
}

const findSemanticMatches = (content: string, query: string): any[] => {
  const lines = content.split('\\n')
  const matches = []
  const lowerQuery = query.toLowerCase()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().includes(lowerQuery)) {
      matches.push({
        lineNumber: i + 1,
        content: line.trim(),
        type: 'text_match'
      })
    }
  }

  return matches
}

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')
}

// Function to import GitHub repository and store in session memory
const importGithubRepoForSession = async (repoUrl: string, repoKey: string, octokit: any, ref: string = 'HEAD') => {
  console.log(`[RepoAgent] 🚀 Importing GitHub repository for session: ${repoUrl}`)

  try {
    // Parse repo URL to get owner and repo
    const repoUrlMatch = repoUrl.match(/github\\.com\\/([^\\/]+)\\/([^\\/]+)/)
    if (!repoUrlMatch) {
      throw new Error('Invalid GitHub repository URL')
    }
    const [, owner, repo] = repoUrlMatch
    const repoName = `${owner}-${repo}`

    // Download repository archive directly using Octokit (works for private repos)
    console.log(`[RepoAgent] 📦 Downloading repository archive for ${owner}/${repo} at ref ${ref}`)
    const archiveResponse = await octokit.rest.repos.downloadZipballArchive({
      owner,
      repo,
      ref: ref // Use specified ref
    })

    // Handle the binary data correctly - Octokit returns data as Buffer/ArrayBuffer
    // Convert to ArrayBuffer if it's not already, then create proper Blob
    let arrayBuffer: ArrayBuffer

    if (archiveResponse.data instanceof ArrayBuffer) {
      arrayBuffer = archiveResponse.data
    } else if (Buffer.isBuffer(archiveResponse.data)) {
      arrayBuffer = archiveResponse.data.buffer.slice(
        archiveResponse.data.byteOffset,
        archiveResponse.data.byteOffset + archiveResponse.data.byteLength
      )
    } else if (archiveResponse.data instanceof Uint8Array) {
      arrayBuffer = archiveResponse.data.buffer
    } else {
      // Fallback: try to convert from base64 if it's a string
      const dataStr = archiveResponse.data.toString()
      if (typeof dataStr === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(dataStr)) {
        arrayBuffer = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0)).buffer
      } else {
        throw new Error('Unable to convert archive data to ArrayBuffer')
      }
    }

    // Create blob from ArrayBuffer (same as chat-input pattern)
    const zipBlob = new Blob([arrayBuffer], {
      type: 'application/zip'
    })

    const zip = await JSZip.loadAsync(zipBlob)
    const filesToCreate: Array<{ path: string; content: string }> = []

    // Process each file in the zip
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      const entry = zipEntry as any
      if (entry.dir) continue // Skip directories

      // Remove the repo name prefix from path (e.g., "repo-name-main/" -> "")
      const cleanPath = path.replace(`${repoName}-main/`, '').replace(`${repoName}-master/`, '')

      if (!cleanPath || cleanPath.startsWith('.') || cleanPath.includes('/.git/')) continue

      try {
        const content = await entry.async('text')
        filesToCreate.push({
          path: cleanPath,
          content: content
        })
      } catch (error) {
        console.warn(`⚠️ Could not extract text content for ${cleanPath}:`, error)
      }
    }

    // Filter out unwanted files (similar to chat-input.tsx)
    const filterUnwantedFiles = (files: Array<{ path: string; content: string }>) => {
      return files.filter(file => {
        const path = file.path.toLowerCase()
        // Skip images, videos, PDFs, and other binary files
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') ||
            path.endsWith('.gif') || path.endsWith('.bmp') || path.endsWith('.webp') ||
            path.endsWith('.svg') || path.endsWith('.ico') || path.endsWith('.mp4') ||
            path.endsWith('.avi') || path.endsWith('.mov') || path.endsWith('.wmv') ||
            path.endsWith('.pdf') || path.endsWith('.zip') || path.endsWith('.tar') ||
            path.endsWith('.gz') || path.endsWith('.rar') || path.endsWith('.7z')) {
          return false
        }
        // Skip certain folders
        if (path.includes('/.git/') || path.includes('/node_modules/') || path.includes('/.next/') ||
            path.includes('/dist/') || path.includes('/build/') || path.includes('/scripts/') ||
            path.includes('/test') || path.includes('/tests/') || path.includes('/__tests__/') ||
            path.includes('/coverage/')) {
          return false
        }
        return true
      })
    }

    const filteredFiles = filterUnwantedFiles(filesToCreate)
    console.log(`[RepoAgent] 📦 Extracted ${filteredFiles.length} files from ${repoName}`)

    // Convert to session storage format (like chat-v2)
    const sessionFiles = new Map<string, any>()
    const fileTree: string[] = []

    for (const file of filteredFiles) {
      const fileData = {
        path: file.path,
        content: file.content,
        name: file.path.split('/').pop() || file.path,
        fileType: file.path.split('.').pop() || 'text',
        type: file.path.split('.').pop() || 'text',
        size: file.content.length,
        isDirectory: false,
        folderId: undefined,
        metadata: {}
      }
      sessionFiles.set(file.path, fileData)
      fileTree.push(file.path)
    }

    // Store in session memory
    repoSessionStorage.set(repoKey, {
      fileTree,
      files: sessionFiles
    })

    console.log(`[RepoAgent] ✅ Stored ${sessionFiles.size} files in session memory for ${repoKey}`)
    return { success: true, fileCount: sessionFiles.size }

  } catch (error) {
    console.error('[RepoAgent] ❌ Failed to import GitHub repository:', error)
    throw error
  }
}