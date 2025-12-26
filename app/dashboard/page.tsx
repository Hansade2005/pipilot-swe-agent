"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Calendar,
  Github,
  Zap,
  Users,
  Code,
  CheckCircle,
  Clock,
  ArrowRight,
  Settings,
  LogOut,
  Bot,
  BookOpen,
  PlayCircle,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface User {
  id: string;
  github_username: string;
  name: string;
  avatar_url?: string;
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id?: string;
  installation_id?: number;
  deployments_this_month: number;
  github_pushes_this_month: number;
  tasks_this_month?: number;
}

interface UsageData {
  tasksUsed: number;
  tasksLimit: number;
  resetDate: string;
  daysUntilReset: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);
  const sampleMention = '@pipilot-swe-agent Generate a user auth API with login and tests';
  const router = useRouter();
  const supabase = createClient();

  // Usage guide data (simplified user flow)
  const usageGuide = [
    {
      icon: Github,
      title: "Install the App",
      description: "Install the PiPilot SWE Agent on GitHub and grant access to the repositories you want it to work on.",
      steps: [
        "Install PiPilot from the GitHub Marketplace , Subscript to a plan",
        "Grant access to the repositories you want PiPilot SWE Agent to monitor"
      ]
    },
    {
      icon: Code,
      title: "Create an Issue or Pull Request",
      description: "Create a clear issue/PR and mention the bot to request work.",
      steps: [
        "Create a new issue or pull request with a clear title and detailed description",
        "Include specific requirements and examples; add labels like 'enhancement' or 'bug'",
        "In the issue or a comment mention: @pipilot-swe-agent followed by your prompt/task"
      ]
    },
    {
      icon: Bot,
      title: "PiPilot SWE Agent Works",
      description: "The agent processes your request and prepares implementation changes.",
      steps: [
        "PiPilot analyzes the issue or comment content",
        "Generates the code and opens a new branch with changes",
        "Creates a pull request containing the proposed implementation"
      ]
    },
    {
      icon: CheckCircle,
      title: "Review & Merge",
      description: "Review, test, and merge the pull request created by PiPilot.",
      steps: [
        "Review the pull request created by PiPilot SWE Agent",
        "Test the generated code if needed",
        "Merge the pull request when satisfied — PiPilot will learn from feedback"
      ]
    }
  ];

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get user from localStorage (GitHub token approach)
      const githubToken = localStorage.getItem('github_token');
      let githubUser = null;

      if (githubToken) {
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${githubToken}` },
          });
          githubUser = await response.json();
        } catch (err) {
          console.warn('Failed to fetch GitHub user:', err);
        }
      }

      if (githubUser) {
        // Try to find user in Supabase by GitHub username
        const { data: dbUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('github_username', githubUser.login)
          .single();

        if (dbUser) {
          setUser(dbUser);
          await loadDashboardData(dbUser);
        } else {
          // Create user in database
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              github_username: githubUser.login,
              name: githubUser.name || githubUser.login,
              avatar_url: githubUser.avatar_url,
              subscription_plan: 'free',
              subscription_status: 'active',
            })
            .select()
            .single();

          if (newUser) {
            setUser(newUser);
            await loadDashboardData(newUser);
          } else {
            setError('Failed to create user account');
          }
        }
      } else {
        // No authentication found
        router.push('/setup');
        return;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (userData: User) => {
    try {
      // Fetch dashboard data from API endpoint (includes server-side filtered repositories)
      const githubToken = localStorage.getItem('github_token');
      const response = await fetch(`/api/dashboard?username=${encodeURIComponent(userData.github_username)}`, {
        headers: githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {}
      });
      
      if (!response.ok) {
        console.error('Failed to fetch dashboard data:', response.status);
        throw new Error('Failed to load dashboard data');
      }

      const dashData = await response.json();
      
      // Fetch installations from API endpoint
      const installationsResponse = await fetch(`/api/installations?username=${encodeURIComponent(userData.github_username)}`, {
        headers: githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {}
      });

      let installations = [];
      if (installationsResponse.ok) {
        const installationsData = await installationsResponse.json();
        installations = installationsData.installations || [];
        console.log(`Loaded ${installations.length} installations for user`);
      } else {
        console.warn('Failed to fetch installations:', installationsResponse.status);
      }
      
      // Update all state from API response
      setUser(userData);
      setUsage(dashData.usage);
      setRepositories(dashData.repositories);
      setRecentActivity(dashData.recentActivity);
      setDashboardData({
        ...dashData,
        installations
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getUsagePercentage = () => {
    if (!dashboardData?.usage) return 0;
    return Math.round((dashboardData.usage.tasksUsed / dashboardData.usage.tasksLimit) * 100);
  };

  const getDaysUntilReset = () => {
    return dashboardData?.usage?.daysUntilReset || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="PiPilot" className="w-8 h-8" />
                <span className="font-bold text-xl">PiPilot</span>
              </Link>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                <span>Welcome back,</span>
                <span className="text-white font-medium">{dashboardData?.user?.name || user?.name || user?.github_username}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/settings" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Manage your SWE Agent development workflow</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">{dashboardData?.user?.plan || 'Free'}</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{dashboardData?.usage?.tasksUsed || 0}/{dashboardData?.usage?.tasksLimit || 10}</h3>
            <p className="text-gray-400 text-sm">Tasks used this month</p>
            {dashboardData?.usage?.tasksRemaining !== undefined && (
              <p className="text-xs text-cyan-400 mt-1">{dashboardData.usage.tasksRemaining} remaining</p>
            )}
            <div className="mt-3 bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getUsagePercentage()}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-sm text-gray-400">Next Reset</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{getDaysUntilReset()}</h3>
            <p className="text-gray-400 text-sm">Days until reset</p>
            <p className="text-xs text-gray-500 mt-2">{dashboardData?.usage?.resetDate}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Github className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Installations</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{dashboardData?.installations?.length || 0}</h3>
            <p className="text-gray-400 text-sm">Connected installations</p>
            <Link href="https://github.com/settings/installations" className="text-cyan-400 text-sm hover:text-cyan-300 mt-2 inline-block">
              Manage →
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         

          {/* How to Use PiPilot */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              How to Use PiPilot SWE Agent
            </h2>

            <div className="space-y-6">
              {usageGuide.map((guide, index) => (
                <div key={index} className="border-l-2 border-purple-500/30 pl-4">
                  <div className="flex items-center gap-3 mb-2">
                    <guide.icon className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold">{guide.title}</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{guide.description}</p>
                  <ol className="text-sm text-gray-300 space-y-1">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <span className="text-purple-400 font-mono text-xs mt-0.5">{stepIndex + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-purple-400">Quick Start</span>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                Watch our 30 seconds simulation tutorial   in homepage to get started with PiPilot SWE Agent
              </p>

              {/* Sample mention helper */}
              <div className="mt-4 bg-black/40 p-3 rounded-md border border-white/6 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <div className="font-medium text-white">Example mention</div>
                  <div className="text-xs text-gray-400">{sampleMention}</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(sampleMention);
                      setSampleCopied(true);
                      setTimeout(() => setSampleCopied(false), 2000);
                    } catch (e) {
                      console.error('Copy failed', e);
                    }
                  }}
                  className="ml-4 px-3 py-2 bg-white/6 hover:bg-white/10 rounded-md text-sm text-white transition-all"
                >
                  {sampleCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <a href="/"> 
                <button className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                  <PlayCircle className="w-4 h-4" />
                  Watch Tutorial
                  <ExternalLink className="w-3 h-3" />
                </button>
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Connected Repositories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Github className="w-5 h-5" />
            Connected Repositories
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.installations && dashboardData.installations.length > 0 ? (
              dashboardData.installations.map((installation, index) => (
                <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium truncate">{installation.account?.login || 'Unknown'}</h3>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {installation.target_type === 'User' ? 'Personal' : 'Organization'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{installation.repository_selection === 'all' ? 'All repositories' : 'Selected repositories'}</p>
                  <p className="text-xs text-gray-500">Installation ID: {installation.installation_id}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400">
                <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No repositories connected yet</p>
                <p className="text-sm">Install PiPilot on GitHub to get started</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-medium transition-all duration-200">
              Manage Repositories
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}