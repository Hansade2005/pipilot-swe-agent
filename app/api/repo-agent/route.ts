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

export async function POST(req: Request) {
  let requestId = crypto.randomUUID()
  let startTime = Date.now()
  let installationId: number | null = null

  // Declare variables at function scope for error handling access
  let modelId: string | undefined
  let messages: any[] | undefined
  let currentRepo: string | undefined
  let currentBranch: string = 'main'
  let githubToken: string | undefined

  console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🚀 Incoming POST request at ${new Date().toISOString()}`)

  try {
    // ===========================================================================
    // GITHUB APP AUTHENTICATION - Verify webhook and get installation token
    // ===========================================================================
    const headers = req.headers
    const signature = headers.get('x-hub-signature-256')
    const event = headers.get('x-github-event')
    const delivery = headers.get('x-github-delivery')

    // For GitHub App webhooks, we need to verify the signature
    if (signature && event) {
      // This is a webhook request - verify signature
      const body = await req.text()
      const isValidSignature = await verifyWebhookSignature(body, signature)

      if (!isValidSignature) {
        console.error('[RepoAgent] ❌ Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // Parse webhook payload
      const payload = JSON.parse(body)

      // For installation events, we might need to handle installation setup
      if (event === 'installation' || event === 'installation_repositories') {
        installationId = payload.installation.id
        console.log(`[RepoAgent] 📦 Webhook event: ${event}, Installation ID: ${installationId}`)
      }

      // For issue_comment or pull_request events, extract installation ID
      if (payload.installation) {
        installationId = payload.installation.id
      }

      // Reconstruct request for further processing
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: body
      })
    } else {
      // This is a direct API call - extract installation ID from request body
      const body = await req.json()
      installationId = body.installationId

      // Reconstruct request
      req = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body)
      })
    }

    if (!installationId) {
      console.error('[RepoAgent] ❌ No installation ID provided')
      return NextResponse.json({ error: 'Installation ID required' }, { status: 400 })
    }

    // Get installation access token
    const installationToken = await getInstallationToken(installationId)
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Got installation token for installation ${installationId}`)

    // Parse request body
    const body = await req.json()
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📝 Request body received:`, {
      messages: body.messages?.length || 0,
      repo: body.repo,
      branch: body.branch || 'main',
      modelId: body.modelId || 'claude-3-5-sonnet-20241022',
      lastMessagePreview: body.messages?.[body.messages.length - 1]?.content?.substring(0, 100) || 'N/A'
    })

    // Extract parameters
    ;({
      messages,
      modelId,
      repo: currentRepo,
      branch: currentBranch = 'main',
      githubToken
    } = body)

    // Use installation token if no specific token provided
    if (!githubToken) {
      githubToken = installationToken
    }

    // Extract todos from request body
    let todos = body.todos || []

    if (!messages || !Array.isArray(messages)) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: Messages array is required`)
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    if (!currentRepo) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: Repository is required`)
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 })
    }

    if (!githubToken) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: GitHub token is required`)
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 })
    }

    // Ensure todos is properly typed
    const activeTodos = Array.isArray(todos) ? todos : []
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📋 Active todos: ${activeTodos.length}`)

    console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Request validation passed - Repo: ${currentRepo}, Branch: ${currentBranch}, Model: ${modelId}`)

    // Initialize Octokit client
    const octokit = createOctokitClient(githubToken)

    // Get authenticated user's email for commits (will be the GitHub App)
    const userEmail = await getUserEmail(octokit)

    // Verify repository access
    try {
      const { owner, repo } = parseRepoString(currentRepo)
      await octokit.rest.repos.get({ owner, repo })
    } catch (error) {
      console.error('[RepoAgent] Repository access verification failed:', error)
      return NextResponse.json({
        error: 'Cannot access the specified repository. Please check your permissions and repository name.'
      }, { status: 403 })
    }

    // Initialize request-scoped staging storage
    const requestStagedChanges = new Map<string, any>()

    // Get optimized context
    const { owner, repo } = parseRepoString(currentRepo)
    const repoContext = await getOptimizedFileContext(octokit, owner, repo, currentBranch)

    // Get AI model
    const model = getAIModel(modelId)
    const baseSystemPrompt = getRepoAgentSystemPrompt(modelId || 'claude-3-5-sonnet-20241022')

    // Enhanced System Prompt
    const systemPrompt = `${baseSystemPrompt}\n\n═══════════════════════════════════════════════════════════════\nCONTEXT & STATE\n═══════════════════════════════════════════════════════════════\nCurrent Repository: ${currentRepo}\nCurrent Branch: ${currentBranch}\n\n${repoContext}\n\n═══════════════════════════════════════════════════════════════\nACTIVE TODO ITEMS\n═══════════════════════════════════════════════════════════════\n${activeTodos.length > 0 ? activeTodos.map((todo: any) =>
      `• [${todo.status.toUpperCase()}] ${todo.id}: ${todo.title}${todo.description ? ` - ${todo.description}` : ''}`
    ).join('\\n') : 'No active todos'}\n\n═══════════════════════════════════════════════════════════════\nSTAGING & COMMIT WORKFLOW (MANDATORY)\n═══════════════════════════════════════════════════════════════\nYou MUST use the Staging Workflow for ALL code changes:\n\n1. **STAGE**: Use \\`github_stage_change\\` to record changes in memory.\n   - You can stage multiple files in sequence or parallel.\n   - NO changes are applied to GitHub yet.\n\n2. **COMMIT**: Use \\`github_commit_changes\\` to apply ALL staged changes.\n   - This performs the Git Tree operations (Blobs -> Tree -> Commit -> Ref).\n   - Require a SINGLE clear commit message (Conventional Commits format preferred).\n\nDO NOT use \\`github_write_file\\` or \\`github_delete_file\\` for code changes anymore. \nUse them ONLY if specifically asked for direct operations, but prefer Staging.\n\nExample:\nUser: \"Update auth.ts and user.ts\"\nAssistant:\n- github_stage_change(auth.ts, ...)\n- github_stage_change(user.ts, ...)\n- github_commit_changes(\"feat: update auth and user models\")\n`

    // Define GitHub repository tools
    const tools = {
      // --- Staging & Commits ---
      github_stage_change: tool({
        description: 'Stage a file change (create, update, or delete) in memory. Supports both full rewrites and incremental edits. DOES NOT apply to GitHub immediately.',
        inputSchema: z.object({
          path: z.string().describe('File path'),
          content: z.string().optional().describe('New content (required for create/update in rewrite mode)'),
          operation: z.enum(['create', 'update', 'delete']).describe('Type of operation'),
          edit_mode: z.enum(['rewrite', 'incremental']).default('rewrite').describe('How to apply changes: rewrite (provide full content) or incremental (apply specific edits)'),
          edit_operations: z.array(z.object({
            old_string: z.string().describe('Text to replace (must be unique within context)'),
            new_string: z.string().describe('Replacement text'),
            context_lines: z.number().optional().default(3).describe('Lines of context before/after for uniqueness (3-5 recommended)')
          })).optional().describe('Incremental edits to apply (only used in incremental mode)'),
          description: z.string().optional().describe('Brief description of change')
        }),
        execute: async ({ path, content, operation, edit_mode = 'rewrite', edit_operations }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📝 Staging change: ${operation} ${path} (${edit_mode} mode)`)

          try {
            if (operation === 'delete') {
              // For delete operations, we don't need content
              requestStagedChanges.set(path, {
                operation: 'delete',
                path,
                description: edit_operations?.[0]?.description || 'File deletion'
              })
              return { success: true, message: `Staged deletion of ${path}` }
            }

            if (edit_mode === 'incremental' && edit_operations) {
              // Handle incremental edits
              const currentContent = await getFileContent(octokit, owner, repo, path, currentBranch)
              let newContent = currentContent

              for (const edit of edit_operations) {
                const { old_string, new_string, context_lines = 3 } = edit
                const contextPattern = escapeRegExp(old_string)
                const regex = new RegExp(contextPattern, 'g')

                if (!regex.test(newContent)) {
                  throw new Error(`Could not find exact match for: ${old_string.substring(0, 100)}...`)
                }

                newContent = newContent.replace(regex, new_string)
              }

              requestStagedChanges.set(path, {
                operation: 'update',
                path,
                content: newContent,
                description: edit_operations[0]?.description || 'Incremental file update'
              })
              return { success: true, message: `Staged incremental update of ${path}` }
            } else {
              // Full rewrite mode
              if (!content) {
                throw new Error('Content is required for create/update operations in rewrite mode')
              }

              requestStagedChanges.set(path, {
                operation: operation === 'create' ? 'create' : 'update',
                path,
                content,
                description: 'Full file rewrite'
              })
              return { success: true, message: `Staged ${operation} of ${path}` }
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Staging error for ${path}:`, error)
            throw error
          }
        }
      }),

      github_commit_changes: tool({
        description: 'Commit all staged changes to the repository using Git Tree API. Creates a new commit with all staged changes.',
        inputSchema: z.object({
          message: z.string().describe('Commit message (Conventional Commits format preferred)'),
          branch: z.string().optional().describe('Branch to commit to (defaults to current)')
        }),
        execute: async ({ message, branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 💾 Committing ${requestStagedChanges.size} staged changes to ${branch}`)

          try {
            if (requestStagedChanges.size === 0) {
              return { success: false, message: 'No staged changes to commit' }
            }

            // Get the current commit SHA
            const refResponse = await octokit.rest.git.getRef({
              owner,
              repo,
              ref: `heads/${branch}`
            })
            const currentCommitSha = refResponse.data.object.sha

            // Get the current tree
            const commitResponse = await octokit.rest.git.getCommit({
              owner,
              repo,
              commit_sha: currentCommitSha
            })
            const currentTreeSha = commitResponse.data.tree.sha

            // Create blobs for new/updated files
            const newTreeItems: any[] = []

            for (const [path, change] of requestStagedChanges) {
              if (change.operation === 'delete') {
                // For deletions, we don't add anything to the tree
                continue
              }

              const blobResponse = await octokit.rest.git.createBlob({
                owner,
                repo,
                content: Buffer.from(change.content).toString('base64'),
                encoding: 'base64'
              })

              newTreeItems.push({
                path,
                mode: '100644', // Regular file
                type: 'blob',
                sha: blobResponse.data.sha
              })
            }

            // Create new tree
            const treeResponse = await octokit.rest.git.createTree({
              owner,
              repo,
              base_tree: currentTreeSha,
              tree: newTreeItems
            })

            // Create commit
            const newCommitResponse = await octokit.rest.git.createCommit({
              owner,
              repo,
              message,
              tree: treeResponse.data.sha,
              parents: [currentCommitSha],
              author: {
                name: 'PiPilot SWE Agent',
                email: userEmail || 'pipilot-swe-agent@github.com'
              }
            })

            // Update branch reference
            await octokit.rest.git.updateRef({
              owner,
              repo,
              ref: `heads/${branch}`,
              sha: newCommitResponse.data.sha
            })

            // Clear staged changes
            requestStagedChanges.clear()

            console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Committed changes to ${branch}: ${newCommitResponse.data.sha}`)
            return {
              success: true,
              message: `Successfully committed ${newTreeItems.length} changes to ${branch}`,
              commitSha: newCommitResponse.data.sha
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Commit error:`, error)
            throw error
          }
        }
      }),

      // --- File Operations ---
      github_read_file: tool({
        description: 'Read the contents of a file from the repository',
        inputSchema: z.object({
          path: z.string().describe('File path in repository'),
          branch: z.string().optional().describe('Branch name, defaults to current')
        }),
        execute: async ({ path, branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📖 Reading file: ${path}`)

          try {
            const content = await getFileContent(octokit, owner, repo, path, branch)
            return {
              success: true,
              path,
              content,
              size: content.length,
              language: detectLanguage(path, content)
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Read error for ${path}:`, error)
            throw error
          }
        }
      }),

      github_write_file: tool({
        description: 'Create or update a file in the repository (direct operation - use staging for changes)',
        inputSchema: z.object({
          path: z.string().describe('File path'),
          content: z.string().describe('File content'),
          message: z.string().describe('Commit message'),
          branch: z.string().optional().describe('Branch name')
        }),
        execute: async ({ path, content, message, branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✏️ Writing file: ${path}`)

          try {
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path,
              message,
              content: Buffer.from(content).toString('base64'),
              branch,
              author: {
                name: 'PiPilot SWE Agent',
                email: userEmail || 'pipilot-swe-agent@github.com'
              }
            })

            return { success: true, message: `File ${path} created/updated successfully` }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Write error for ${path}:`, error)
            throw error
          }
        }
      }),

      github_delete_file: tool({
        description: 'Delete a file from the repository (direct operation - use staging for changes)',
        inputSchema: z.object({
          path: z.string().describe('File path'),
          message: z.string().describe('Commit message'),
          branch: z.string().optional().describe('Branch name')
        }),
        execute: async ({ path, message, branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🗑️ Deleting file: ${path}`)

          try {
            // Get current file SHA
            const fileResponse = await octokit.rest.repos.getContent({
              owner,
              repo,
              path,
              ref: branch
            })

            await octokit.rest.repos.deleteFile({
              owner,
              repo,
              path,
              message,
              sha: (fileResponse.data as any).sha,
              branch,
              author: {
                name: 'PiPilot SWE Agent',
                email: userEmail || 'pipilot-swe-agent@github.com'
              }
            })

            return { success: true, message: `File ${path} deleted successfully` }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Delete error for ${path}:`, error)
            throw error
          }
        }
      }),

      github_list_files: tool({
        description: 'Browse repository directory structure',
        inputSchema: z.object({
          path: z.string().optional().describe('Directory path, empty for root'),
          branch: z.string().optional().describe('Branch name')
        }),
        execute: async ({ path = '', branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📁 Listing files in: ${path || 'root'}`)

          try {
            const response = await octokit.rest.repos.getContent({
              owner,
              repo,
              path,
              ref: branch
            })

            const items = Array.isArray(response.data) ? response.data : [response.data]
            const files = items.map((item: any) => ({
              name: item.name,
              path: item.path,
              type: item.type,
              size: item.size,
              download_url: item.download_url
            }))

            return {
              success: true,
              path: path || '/',
              files,
              count: files.length
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ List error for ${path}:`, error)
            throw error
          }
        }
      }),

      // --- Repository Operations ---
      github_create_branch: tool({
        description: 'Create a new branch in the repository',
        inputSchema: z.object({
          branch: z.string().describe('New branch name'),
          source_branch: z.string().optional().describe('Source branch, defaults to current')
        }),
        execute: async ({ branch, source_branch = currentBranch }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🌿 Creating branch: ${branch} from ${source_branch}`)

          try {
            // Get source branch SHA
            const refResponse = await octokit.rest.git.getRef({
              owner,
              repo,
              ref: `heads/${source_branch}`
            })

            await octokit.rest.git.createRef({
              owner,
              repo,
              ref: `refs/heads/${branch}`,
              sha: refResponse.data.object.sha
            })

            return { success: true, message: `Branch ${branch} created successfully` }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Branch creation error:`, error)
            throw error
          }
        }
      }),

      github_create_pull_request: tool({
        description: 'Create a pull request between branches',
        inputSchema: z.object({
          title: z.string().describe('Pull request title'),
          head: z.string().describe('Head branch (source)'),
          base: z.string().describe('Base branch (target)'),
          body: z.string().optional().describe('Pull request description'),
          draft: z.boolean().optional().describe('Create as draft PR')
        }),
        execute: async ({ title, head, base, body, draft = false }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔄 Creating PR: ${head} -> ${base}`)

          try {
            const prResponse = await octokit.rest.pulls.create({
              owner,
              repo,
              title,
              head,
              base,
              body,
              draft
            })

            return {
              success: true,
              message: `Pull request #${prResponse.data.number} created successfully`,
              prNumber: prResponse.data.number,
              url: prResponse.data.html_url
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ PR creation error:`, error)
            throw error
          }
        }
      }),

      // --- Search Operations ---
      github_search_code: tool({
        description: 'Search for code patterns in the repository',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
          path: z.string().optional().describe('Limit search to specific path'),
          extension: z.string().optional().describe('File extension filter')
        }),
        execute: async ({ query, path, extension }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔍 Searching code for: ${query}`)

          try {
            const searchQuery = `repo:${owner}/${repo} ${query}${path ? ` path:${path}` : ''}${extension ? ` extension:${extension}` : ''}`

            const response = await octokit.rest.search.code({
              q: searchQuery,
              per_page: 10
            })

            const results = response.data.items.map((item: any) => ({
              name: item.name,
              path: item.path,
              html_url: item.html_url,
              repository: item.repository.full_name
            }))

            return {
              success: true,
              query,
              results,
              count: results.length
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Search error:`, error)
            throw error
          }
        }
      }),

      github_grep_search: tool({
        description: 'Advanced grep-style search in repository files',
        inputSchema: z.object({
          query: z.string().describe('Search pattern'),
          path: z.string().optional().describe('Limit to path'),
          case_insensitive: z.boolean().optional().default(false).describe('Case insensitive search')
        }),
        execute: async ({ query, path, case_insensitive = false }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔍 Grep searching for: ${query}`)

          try {
            // Use GitHub's code search API with regex-like patterns
            const searchQuery = `repo:${owner}/${repo} ${query}${path ? ` path:${path}` : ''}`

            const response = await octokit.rest.search.code({
              q: searchQuery,
              per_page: 20
            })

            const results = response.data.items.map((item: any) => ({
              path: item.path,
              matches: [{
                line: 1, // GitHub doesn't provide line numbers in search
                content: item.text_matches?.[0]?.fragment || 'Match found'
              }]
            }))

            return {
              success: true,
              query,
              results,
              count: results.length
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Grep search error:`, error)
            throw error
          }
        }
      }),

      // --- Web Search ---
      web_search: tool({
        description: 'Search the web for documentation and current information',
        inputSchema: z.object({
          query: z.string().describe('Search query')
        }),
        execute: async ({ query }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🌐 Web search for: ${query}`)

          try {
            const result = await searchWeb(query)
            return result
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Web search error:`, error)
            throw error
          }
        }
      }),

      // --- Todo Management ---
      github_create_todo: tool({
        description: 'Create a new todo item to track progress on tasks',
        inputSchema: z.object({
          id: z.string().describe('Unique identifier'),
          title: z.string().describe('Todo title/summary'),
          description: z.string().optional().describe('Detailed description'),
          status: z.enum(['pending', 'completed']).default('pending').describe('Initial status')
        }),
        execute: async ({ id, title, description, status = 'pending' }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📝 Creating todo: ${id}`)

          const newTodo = {
            id,
            title,
            description: description || '',
            status,
            created_at: new Date().toISOString()
          }

          activeTodos.push(newTodo)

          return {
            success: true,
            message: `Todo "${title}" created with ID: ${id}`,
            todo: newTodo
          }
        }
      }),

      github_update_todo: tool({
        description: 'Update an existing todo item',
        inputSchema: z.object({
          id: z.string().describe('Todo ID to update'),
          title: z.string().optional().describe('New title'),
          description: z.string().optional().describe('New description'),
          status: z.enum(['pending', 'completed']).optional().describe('New status')
        }),
        execute: async ({ id, title, description, status }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📝 Updating todo: ${id}`)

          const todoIndex = activeTodos.findIndex((t: any) => t.id === id)
          if (todoIndex === -1) {
            throw new Error(`Todo with ID ${id} not found`)
          }

          if (title !== undefined) activeTodos[todoIndex].title = title
          if (description !== undefined) activeTodos[todoIndex].description = description
          if (status !== undefined) activeTodos[todoIndex].status = status

          return {
            success: true,
            message: `Todo ${id} updated successfully`,
            todo: activeTodos[todoIndex]
          }
        }
      }),

      github_delete_todo: tool({
        description: 'Delete a todo item',
        inputSchema: z.object({
          id: z.string().describe('Todo ID to delete')
        }),
        execute: async ({ id }) => {
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🗑️ Deleting todo: ${id}`)

          const initialLength = activeTodos.length
          activeTodos = activeTodos.filter((t: any) => t.id !== id)

          if (activeTodos.length === initialLength) {
            throw new Error(`Todo with ID ${id} not found`)
          }

          return {
            success: true,
            message: `Todo ${id} deleted successfully`
          }
        }
      })
    }

    // Stream the response
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🤖 Starting streamText with ${messages.length} messages`)
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(60),
      onFinish: async (result) => {
        const responseTime = Date.now() - startTime
        console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Stream finished in ${responseTime}ms - Total tokens: ${result.usage.totalTokens}`)
      }
    })

    // Stream the response using newline-delimited JSON format (matching chat-v2 pattern)
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          try {
            // Stream the text and tool calls
            for await (const part of result.fullStream) {
              // Log tool calls and deltas
              if (part.type === 'tool-call') {
                console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔨 Tool call initiated:`, {
                  toolName: (part as any).toolName,
                  toolCallId: (part as any).toolCallId
                })
              } else if (part.type === 'tool-result') {
                console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🎯 Tool result received:`, {
                  toolName: (part as any).toolName,
                  toolCallId: (part as any).toolCallId,
                  resultPreview: JSON.stringify((part as any).result)?.substring(0, 100) || 'N/A'
                })
              } else if (part.type === 'text-delta') {
                // Text deltas are frequent, just count them silently
              }
              // Send each part as newline-delimited JSON (no SSE "data:" prefix)
              controller.enqueue(encoder.encode(JSON.stringify(part) + '\n'))
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Stream error:`, error)
          } finally {
            controller.close()
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    )

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Error in POST handler (${responseTime}ms):`, {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      repo: currentRepo,
      branch: currentBranch
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}