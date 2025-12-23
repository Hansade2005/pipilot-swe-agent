import jwt from 'jsonwebtoken';

// Generate JWT for GitHub App authentication
function generateJWT(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error('GitHub App credentials not configured');
  }

  const payload = {
    iat: Math.floor(Date.now() / 1000) - 60, // Issued 60 seconds ago
    exp: Math.floor(Date.now() / 1000) + (10 * 60), // Expires in 10 minutes
    iss: appId
  };

  return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });
}

// Get installation access token
export async function getInstallationToken(installationId: number): Promise<string | null> {
  try {
    const jwt = generateJWT();

    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PiPilot-SWE-Agent'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get installation token:', error);
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting installation token:', error);
    return null;
  }
}

// Get repository information
export async function getRepositoryInfo(installationId: number, repo: string): Promise<any | null> {
  try {
    const token = await getInstallationToken(installationId);
    if (!token) return null;

    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-SWE-Agent'
      }
    });

    if (!response.ok) {
      console.error('Failed to get repository info:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting repository info:', error);
    return null;
  }
}