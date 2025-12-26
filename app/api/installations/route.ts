import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

// Generate JWT for GitHub App authentication
function generateGitHubJWT(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GitHub App credentials not configured');
  }

  const payload = {
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + (10 * 60),
    iss: appId
  };

  return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });
}

export async function GET(request: NextRequest) {
  try {
    // Get GitHub token from Authorization header
    const authHeader = request.headers.get('authorization');
    const githubToken = authHeader?.replace('Bearer ', '');
    
    // Get username from query parameter
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!githubToken || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate GitHub App JWT to fetch installations
    const appJwt = generateGitHubJWT();

    // Fetch ALL installations for this GitHub App from GitHub API
    const installationsResponse = await fetch('https://api.github.com/app/installations', {
      headers: {
        'Authorization': `Bearer ${appJwt}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-SWE-Agent'
      }
    });

    if (!installationsResponse.ok) {
      console.error('Failed to fetch installations from GitHub:', await installationsResponse.text());
      return NextResponse.json({ error: 'Failed to fetch installations' }, { status: 500 });
    }

    const allInstallations = await installationsResponse.json();

    // Filter installations to only those owned by the authenticated GitHub user
    const userInstallations = allInstallations.filter((installation: any) => {
      return installation.account.login === username;
    });

    console.log(`Found ${userInstallations.length} installations for user ${username} out of ${allInstallations.length} total`);

    return NextResponse.json({
      installations: userInstallations,
      user: {
        login: username,
        id: null
      }
    });

  } catch (error) {
    console.error('Installations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installations' },
      { status: 500 }
    );
  }
}
