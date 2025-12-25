'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Check, Loader2, Sparkles } from "lucide-react"

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    monthlyTasks: 10,
    supportLevel: 'community',
    features: ['Basic projects', 'Community support', '10 tasks/month'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE || 'price_1SiIwD3G7U0M1bp1FrBOA3KB',
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_1SiIwD3G7U0M1bp1Vc3ndopi',
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || 'price_1SiIwE3G7U0M1bp1auNQbKID',
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_150 || 'price_1SiIwF3G7U0M1bp1yfI4CgyQ',
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
    const token = localStorage.getItem('github_token');
    if (token) {
      // Fetch user info from GitHub API
      fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      })
        .then(res => res.json())
        .then(setUser)
        .catch(console.error);
    } else if (searchParams.get('user_id')) {
      // User identified via OAuth callback
      setUser({ login: searchParams.get('user_id') });
    }
  }, [searchParams]);

  const handleOAuth = () => {
    const state = btoa(JSON.stringify({ installation_id: installationId, setup_action: setupAction }));
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user&state=${state}`;
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
    <div className="space-y-6">
      {!user ? (
        <div className="text-center">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Connect Your GitHub</h3>
            <p className="text-gray-400 text-sm">
              We need to identify you via GitHub to set up your subscription.
            </p>
          </div>

          <Button
            onClick={handleOAuth}
            className="w-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border border-gray-600/50 transition-all duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Authorize with GitHub
          </Button>
        </div>
      ) : (
        <>
          {/* Welcome Message */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Connected as {user.login}</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Choose Your Plan</h3>
            <p className="text-gray-400 text-sm">
              Select the plan that fits your development needs
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-6 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedPlan === plan.id
                    ? 'bg-gradient-to-br from-purple-900/40 to-cyan-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'bg-gray-800/40 border-gray-700/50 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/10'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.isPopular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-3 py-1 text-xs font-medium">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-white mb-1">{plan.name}</h4>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                    {plan.price}
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full transition-all duration-200 ${
                    selectedPlan === plan.id
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 border border-gray-600/50 hover:border-purple-500/30'
                  }`}
                  variant={selectedPlan === plan.id ? 'default' : 'outline'}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            ))}
          </div>

          {/* Subscribe Button */}
          <div className="text-center pt-4">
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white py-3 text-lg font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-200"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {loading ? 'Processing...' : selectedPlan === 'free' ? 'Get Started Free' : 'Subscribe Now'}
            </Button>

            <p className="mt-3 text-xs text-gray-500">
              Secure payment powered by Stripe
            </p>
          </div>
        </>
      )}
    </div>
  );
}