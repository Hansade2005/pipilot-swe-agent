'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Check, Loader2, Sparkles, Github, Crown, Zap, Shield } from "lucide-react"
import { motion } from 'framer-motion';
import { STRIPE_PRICES } from "@/lib/stripe"

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    monthlyTasks: 10,
    supportLevel: 'community',
    features: ['Basic projects', 'Community support', '10 tasks/month'],
    stripePriceId: STRIPE_PRICES.FREE,
    description: 'Perfect for getting started',
    isPopular: false,
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '$30/month',
    monthlyTasks: 150,
    supportLevel: 'priority',
    features: ['All models', 'Advanced projects', 'Custom templates', 'Premium AI models', 'Priority support', '150 tasks/month'],
    stripePriceId: STRIPE_PRICES.PRO_MONTHLY,
    description: 'Most popular choice',
    isPopular: true,
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: '$288/year',
    monthlyTasks: 170,
    supportLevel: 'priority',
    features: ['All models', 'Advanced projects', 'Custom templates', 'Premium AI models', 'Priority support', '170 tasks/month', 'Save 20% annually'],
    stripePriceId: STRIPE_PRICES.PRO_ANNUAL,
    description: 'Best value for power users',
    isPopular: false,
  },
  {
    id: 'credits_150',
    name: '150 Extra Credits',
    price: '$30',
    monthlyTasks: 150,
    supportLevel: 'one-time',
    features: ['150 additional tasks', 'One-time purchase', 'No expiration', 'Instant activation'],
    stripePriceId: STRIPE_PRICES.CREDITS_150,
    description: 'Need more tasks?',
    isPopular: false,
  },
];

export default function SetupForm() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');

  const [selectedPlan, setSelectedPlan] = useState('free');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // If OAuth is enabled, get user info from token
  useEffect(() => {
    // Check if token came from OAuth callback in URL
    const tokenFromUrl = searchParams.get('github_token');
    if (tokenFromUrl) {
      // Store token in localStorage for persistence
      localStorage.setItem('github_token', tokenFromUrl);
      // Set user from URL params
      const userId = searchParams.get('user_id');
      if (userId) {
        setUser({ login: userId });
      }
      // Fetch full user info from GitHub API
      fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${tokenFromUrl}` },
      })
        .then(res => res.json())
        .then(setUser)
        .catch(console.error);
    } else {
      // Check localStorage for existing token
      const token = localStorage.getItem('github_token');
      if (token) {
        // Fetch user info from GitHub API
        fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${token}` },
        })
          .then(res => res.json())
          .then(setUser)
          .catch(console.error);
      }
    }
  }, [searchParams]);

  const handleOAuth = () => {
    const state = btoa(JSON.stringify({ installation_id: installationId, setup_action: setupAction }));
    const clientId = process.env.GITHUB_CLIENT_ID;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv23lis7OreTbIdP6zzJ&scope=user%20user:email&state=${state}`;
  };

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      // Just redirect to success or dashboard
      window.location.href = '/success?plan=free';
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: PLANS.find(p => p.id === selectedPlan)?.stripePriceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href,
          planType: selectedPlan,
          github_username: user?.login,
          installation_id: installationId,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {!user ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600/20 to-cyan-600/20 rounded-2xl mb-6 border border-purple-500/30"
            >
              <Github className="w-10 h-10 text-purple-400" />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-3"
            >
              Connect Your GitHub
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-base max-w-md mx-auto leading-relaxed"
            >
              Link your GitHub account to unlock AI-powered code generation and seamless project management.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl blur-lg opacity-30 animate-pulse" />
            <Button
              onClick={handleOAuth}
              className="relative w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white border border-gray-600/50 hover:border-purple-500/70 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 py-4 text-lg font-semibold group"
            >
              <Github className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
              <span>Authorize with GitHub</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                layoutId="buttonGlow"
              />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500"
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Secure OAuth</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Read-only access</span>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <>
          {/* Enhanced Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full px-6 py-3 mb-6"
            >
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Connected as @{user.login}</span>
              <Check className="w-4 h-4 text-green-400" />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-3"
            >
              Choose Your Plan
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed"
            >
              Select the perfect plan to supercharge your development workflow with AI
            </motion.p>
          </motion.div>

          {/* Enhanced Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                className={`relative p-8 rounded-2xl border cursor-pointer transition-all duration-500 group ${
                  selectedPlan === plan.id
                    ? 'bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-cyan-900/40 border-purple-500/60 shadow-2xl shadow-purple-500/20 scale-105'
                    : 'bg-gray-800/40 border-gray-700/50 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-102'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {/* Animated background glow */}
                <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 ${
                  selectedPlan === plan.id
                    ? 'bg-gradient-to-br from-purple-600/10 via-pink-600/5 to-cyan-600/10 opacity-100'
                    : 'opacity-0 group-hover:opacity-50'
                }`} />

                {/* Popular badge */}
                {plan.isPopular && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <Badge className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                      <Crown className="w-4 h-4 mr-2" />
                      Most Popular
                    </Badge>
                  </motion.div>
                )}

                <div className="relative z-10">
                  {/* Plan header */}
                  <div className="text-center mb-6">
                    <motion.div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                        plan.id === 'free' ? 'bg-gray-700/50' :
                        plan.id.includes('pro') ? 'bg-gradient-to-r from-purple-600 to-cyan-600' :
                        'bg-gradient-to-r from-orange-600 to-yellow-600'
                      }`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {plan.id === 'free' ? <Sparkles className="w-6 h-6 text-gray-300" /> :
                       plan.id.includes('pro') ? <Zap className="w-6 h-6 text-white" /> :
                       <Shield className="w-6 h-6 text-white" />}
                    </motion.div>

                    <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200 mb-1">
                      {plan.price}
                    </div>
                    {plan.id.includes('annual') && (
                      <div className="text-sm text-green-400 font-medium">Save 20% annually</div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * featureIndex }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Selection button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      className={`w-full py-3 text-base font-semibold transition-all duration-300 ${
                        selectedPlan === plan.id
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border border-gray-600/50 hover:border-purple-500/50 hover:shadow-md hover:shadow-purple-500/20'
                      }`}
                      variant={selectedPlan === plan.id ? 'default' : 'outline'}
                    >
                      {selectedPlan === plan.id ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Selected
                        </motion.div>
                      ) : (
                        'Select Plan'
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Subscribe Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center pt-6"
          >
            <div className="relative mb-4">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl blur-xl opacity-20 animate-pulse" />
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="relative w-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-700 hover:via-pink-700 hover:to-cyan-700 text-white py-4 text-xl font-bold shadow-2xl shadow-purple-500/30 hover:shadow-3xl hover:shadow-purple-500/50 transition-all duration-300 group"
                size="lg"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Processing Payment...
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Sparkles className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                    {selectedPlan === 'free' ? 'Get Started Free' : 'Subscribe Now'}
                  </motion.div>
                )}
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center space-x-4 text-sm text-gray-500"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Secure payment via Stripe</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  );
}