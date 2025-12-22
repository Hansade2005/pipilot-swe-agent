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