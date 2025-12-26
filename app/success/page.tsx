"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Github, ArrowRight, Home, Zap } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Try to get user info from localStorage
    const githubToken = localStorage.getItem('github_token');
    if (githubToken) {
      fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${githubToken}` },
      })
        .then(res => res.json())
        .then(setUser)
        .catch(console.error);
    }
  }, []);

  const getPlanDisplay = (planType: string) => {
    switch (planType) {
      case 'free': return 'Free Plan';
      case 'pro_monthly': return 'Pro Monthly';
      case 'pro_annual': return 'Pro Annual';
      case 'credits_150': return '150 Extra Credits';
      default: return 'Plan';
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20 animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen">
        <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl mb-6 border border-green-500/30">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-white mb-4"
              >
                Setup Complete! 🎉
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-block mb-6"
              >
                <span className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-full text-sm font-medium">
                  {getPlanDisplay(plan)} Activated
                </span>
              </motion.div>
            </motion.div>

            {/* Welcome Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mb-8"
            >
              {user && (
                <p className="text-xl text-gray-300 mb-2">
                  Welcome, <span className="text-white font-semibold">@{user.login}</span>!
                </p>
              )}
              <p className="text-gray-400 text-lg leading-relaxed">
                Your PiPilot SWE Agent is now ready to transform your development workflow with AI-powered code generation.
              </p>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6 mb-8"
            >
              <h3 className="text-xl font-semibold text-white text-center">What's Next?</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <Github className="w-4 h-4 text-purple-400" />
                    </div>
                    <h4 className="font-medium text-white">Install on GitHub</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Add PiPilot to your repositories to start automating code tasks.
                  </p>
                  <a
                    href="https://github.com/apps/pipilot-swe-agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Install App →
                  </a>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h4 className="font-medium text-white">View Dashboard</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Monitor your usage and manage your subscription.
                  </p>
                  <Link
                    href="/dashboard"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Go to Dashboard →
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25"
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </Link>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 hover:border-gray-500/50 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                <Github className="w-5 h-5" />
                Visit GitHub
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Footer Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-8 pt-6 border-t border-gray-700/50"
            >
              <p className="text-sm text-gray-500">
                Need help? Check out our{' '}
                <a href="/docs" className="text-purple-400 hover:text-purple-300 transition-colors">
                  documentation
                </a>{' '}
                or{' '}
                <a href="mailto:support@pipilot.dev" className="text-purple-400 hover:text-purple-300 transition-colors">
                  contact support
                </a>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}