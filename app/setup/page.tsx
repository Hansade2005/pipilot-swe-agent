import { Suspense } from 'react';
import SetupForm from './SetupForm';
import { Logo } from '@/app/components/ui/logo';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles, Shield, Zap, Rocket, Star, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        {/* Primary gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20 animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />

        {/* Enhanced Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen">
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
          {/* Enhanced Logo Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-8 animate-fade-in-up">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                <div className="relative bg-black/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Logo variant="icon" size="xl" />
                </div>
              </div>
            </div>

            <div className="inline-block mb-6">
              <Badge className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-500/30 px-6 py-3 text-sm font-medium backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Setup Your Account
              </Badge>
            </div>

            <h2 className="text-5xl md:text-7xl font-black mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200">
                Choose Your Plan
              </span>
              <span className="block text-3xl md:text-4xl font-bold text-gray-400 mt-2">
                Start Building with AI
              </span>
            </h2>

            {/* Animated underline */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full animate-pulse" />
            </div>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              Select the perfect plan for your development needs. All plans include access to our advanced AI SWE Agent with different usage limits.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Generate code in seconds, not hours</p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-400 text-sm">Bank-level encryption and compliance</p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Production Ready</h3>
              <p className="text-gray-400 text-sm">Deploy with confidence to any platform</p>
            </div>
          </div>

          {/* Setup Form Container */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <div className="relative">
              {/* Enhanced Glowing Border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl blur-xl opacity-20 animate-pulse" />

              <div className="relative bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-lg" />
                    </div>
                  </div>
                }>
                  <SetupForm />
                </Suspense>
              </div>
            </div>

            {/* Enhanced Security Notice */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-full px-6 py-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm font-medium">Bank-level security & 256-bit encryption</span>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}