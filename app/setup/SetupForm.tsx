'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    monthlyTasks: 10,
    supportLevel: 'community',
    features: ['Basic projects', 'Community support'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE || 'price_1SiIwD3G7U0M1bp1FrBOA3KB',
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '$30/month',
    monthlyTasks: 150,
    supportLevel: 'priority',
    features: ['All models', 'Advanced projects', 'Custom templates', 'Premium AI models', 'Priority support'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_1SiIwD3G7U0M1bp1Vc3ndopi',
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: '$288/year',
    monthlyTasks: 170,
    supportLevel: 'priority',
    features: ['All models', 'Advanced projects', 'Custom templates', 'Premium AI models', 'Priority support'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || 'price_1SiIwE3G7U0M1bp1auNQbKID',
  },
  {
    id: 'credits_150',
    name: '150 Extra Credits',
    price: '$30',
    monthlyTasks: 150,
    supportLevel: 'one-time',
    features: ['150 additional tasks', 'One-time purchase', 'No expiration'],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_150 || 'price_1SiIwF3G7U0M1bp1yfI4CgyQ',
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
    <div>
      {!user ? (
        <div className="text-center">
          <p className="mb-4">To subscribe, we need to identify you via GitHub.</p>
          <button
            onClick={handleOAuth}
            className="bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Authorize with GitHub
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer ${
                  selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{plan.name}</h3>
                    <p className="text-2xl font-bold">{plan.price}</p>
                  </div>
                  <input
                    type="radio"
                    checked={selectedPlan === plan.id}
                    onChange={() => setSelectedPlan(plan.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
                <ul className="mt-2 text-sm text-gray-600">
                  {plan.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : selectedPlan === 'free' ? 'Get Started' : 'Subscribe'}
          </button>

          <p className="mt-4 text-sm text-gray-600 text-center">
            Subscribing as {user.login}
          </p>
        </>
      )}
    </div>
  );
}