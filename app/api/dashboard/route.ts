import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch repositories
    const { data: repositories, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('installation_id', user.installation_id || 0);

    if (repoError) {
      console.error('Error fetching repositories:', repoError);
    }

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
      repositories: repositories || [],
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