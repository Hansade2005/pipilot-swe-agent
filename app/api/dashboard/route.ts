import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

// Get installation access token
async function getInstallationToken(installationId: number): Promise<string | null> {
  try {
    const jwtToken = generateGitHubJWT();

    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
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

// Get repositories from GitHub filtered by authenticated user
async function getRepositoriesFromGitHub(installationId: number, authenticatedUsername: string): Promise<any[]> {
  try {
    const token = await getInstallationToken(installationId);
    if (!token) return [];

    const response = await fetch(
      `https://api.github.com/installation/repositories`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PiPilot-SWE-Agent'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch repositories:', await response.text());
      return [];
    }

    const data = await response.json();
    const allRepositories = data.repositories || [];

    // SECURITY: Filter to only return repositories owned by the authenticated user
    // This prevents exposing repositories from other users in the same installation
    const userRepositories = allRepositories.filter((repo: any) => {
      return repo.owner.login === authenticatedUsername;
    });

    console.log(`Filtered ${allRepositories.length} total repos to ${userRepositories.length} repos for user ${authenticatedUsername}`);
    return userRepositories;
  } catch (error) {
    console.error('Error fetching repositories from GitHub:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data from our users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('github_username', authUser.user_metadata?.user_name || authUser.user_metadata?.name)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Fetch repositories from GitHub using installation token (filtered by authenticated user)
    const repositories = user.installation_id 
      ? await getRepositoriesFromGitHub(user.installation_id, user.github_username)
      : [];

    // Format repositories for dashboard
    const formattedRepositories = repositories.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      language: repo.language,
      stars: repo.stargazers_count,
      updated_at: repo.updated_at
    }));

    // Fetch recent usage logs
    const { data: usageLogs, error: usageError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (usageError) {
      console.error('Error fetching usage logs:', usageError);
    }

    // Calculate usage for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: monthlyUsage, error: monthlyError } = await supabase
      .from('usage_logs')
      .select('input_tokens, output_tokens')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (monthlyError) {
      console.error('Error fetching monthly usage:', monthlyError);
    }

    const totalTokensUsed = monthlyUsage?.reduce((sum: number, log: any) =>
      sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0) || 0;

    // Get plan limits
    const planLimits = {
      free: 10,
      pro_monthly: 150,
      pro_annual: 170,
      credits_150: 150
    };

    const currentPlan = user.subscription_plan || 'free';
    const monthlyLimit = planLimits[currentPlan as keyof typeof planLimits] || 10;

    // Calculate days until reset
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    function getActivityDescriptionLocal(requestType: string): string {
      switch (requestType) {
        case 'chat':
          return 'AI chat interaction';
        case 'code_analysis':
          return 'Code analysis performed';
        case 'pr_review':
          return 'Pull request reviewed';
        default:
          return 'Activity performed';
      }
    }

    const dashboardData = {
      user: {
        id: user.id,
        name: user.name || user.github_username,
        githubUsername: user.github_username,
        plan: currentPlan,
        avatarUrl: user.avatar_url,
        subscriptionStatus: user.subscription_status,
        stripeCustomerId: user.stripe_customer_id
      },
      usage: {
        tasksUsed: Math.floor(totalTokensUsed / 100), // Rough estimate: 100 tokens = 1 task
        tasksLimit: monthlyLimit,
        resetDate: nextReset.toISOString().split('T')[0],
        daysUntilReset
      },
      repositories: formattedRepositories,
      recentActivity: usageLogs?.map((log: any) => ({
        type: log.request_type,
        repo: repositories?.find((r: any) => r.id === log.repo_id)?.name || 'Unknown',
        description: getActivityDescriptionLocal(log.request_type),
        time: new Date(log.created_at).toLocaleDateString()
      })) || []
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function getActivityDescription(requestType: string): string {
  switch (requestType) {
    case 'chat':
      return 'AI chat interaction';
    case 'code_analysis':
      return 'Code analysis performed';
    case 'pr_review':
      return 'Pull request reviewed';
    default:
      return 'Activity performed';
  }
}