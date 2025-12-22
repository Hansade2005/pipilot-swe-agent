# PiPilot SWE Agent - GitHub App

An autonomous software engineering agent that operates as a GitHub App, capable of reading, writing, and managing repository code through natural language commands.

## Features

- 🤖 **Autonomous Code Operations**: Read, create, edit, and delete files
- 🔍 **Advanced Code Search**: Text, semantic, and regex search capabilities
- 🌐 **Web Research**: Search documentation and external resources
- 📝 **Pull Request Management**: Create branches, commits, and PRs safely
- 🔧 **CI/CD Awareness**: Monitor workflows and fix build failures
- 💬 **Natural Language Interface**: Respond to @mentions in issues and PRs
- 🛡️ **Safety First**: Never touches protected branches or sensitive files

## Quick Setup

### 1. Create GitHub App

1. Go to [GitHub Settings > Developer settings > GitHub Apps](https://github.com/settings/apps)
2. Click "New GitHub App"
3. Use the `github-app-manifest.json` file in this repository as a template
4. **Important**: Update the webhook URL to point to your deployed instance

### 2. Configure Environment Variables

Copy the values from your GitHub App settings:

```bash
# Required environment variables
GITHUB_APP_ID=your_app_id_here
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nyour_private_key_here\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

### 3. Install the App

Install the app on repositories where you want the agent to operate.

## Usage

Mention the bot in issues, PR comments, or PR descriptions:

```
@pipilot-swe-agent explain this function
@pipilot-swe-agent fix this bug
@pipilot-swe-agent search for authentication code
@pipilot-swe-agent create a new API endpoint for users
```

## Architecture

- **GitHub App Integration**: JWT-based authentication with installation tokens
- **Webhook-Driven**: Responds to GitHub events (issues, PRs, CI failures)
- **Safe Operations**: All changes go through PRs, never direct pushes to main
- **Extensible LLM**: Claude-powered agent with comprehensive tool suite

## API Endpoints

- `POST /api/webhooks/github` - Webhook handler for GitHub events
- `POST /api/repo-agent` - Direct agent API (requires installation ID)

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Security

- ✅ Webhook signature verification
- ✅ Installation-scoped access tokens
- ✅ No direct access to sensitive files (.env, secrets)
- ✅ Branch protection respected
- ✅ All changes require PR approval

---

# Original Template Documentation

A production-grade Next.js starter template designed for building scalable enterprise applications. Combines modern development practices with battle-tested tooling and utilities.