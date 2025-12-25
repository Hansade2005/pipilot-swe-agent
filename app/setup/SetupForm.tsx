'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Check, Loader2 } from "lucide-react"

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Choose Your PiPilot SWE Agent Plan
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Get started with AI-powered software development. Choose the plan that fits your needs.
            </p>
          </div>

          {!user ? (
            <div className="max-w-md mx-auto">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-white">Connect Your GitHub</CardTitle>
                  <CardDescription className="text-gray-300">
                    We need to identify you via GitHub to set up your subscription.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleOAuth}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    Authorize with GitHub
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Pricing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`bg-gray-800/50 border-gray-700/50 backdrop-blur-sm relative cursor-pointer transition-all duration-200 hover:border-purple-500/50 ${
                      selectedPlan === plan.id ? 'ring-2 ring-purple-500 border-purple-500/50' : ''
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-purple-600 text-white px-3 py-1">
                          Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                      <CardDescription className="text-gray-300 text-sm">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-bold text-white">{plan.price}</span>
                        </div>
                      </div>

                      <Button
                        className={`w-full ${selectedPlan === plan.id ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                        variant={selectedPlan === plan.id ? 'default' : 'secondary'}
                      >
                        {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                      </Button>

                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start space-x-3">
                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Subscribe Button */}
              <div className="text-center">
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading ? 'Processing...' : selectedPlan === 'free' ? 'Get Started Free' : 'Subscribe Now'}
                </Button>

                <p className="mt-4 text-sm text-gray-400">
                  Subscribing as <span className="text-white font-medium">{user.login}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}