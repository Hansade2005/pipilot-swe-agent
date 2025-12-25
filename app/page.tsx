import { Navigation } from "@/app/components/navigation"
import { Footer } from "@/app/components/footer"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import {
  Zap,
  Github,
  Code,
  Bot,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  Clock,
  Shield,
  Sparkles
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />

      <Navigation />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-16 pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                AI-Powered Software Development
                <span className="block text-purple-400">Made Simple</span>
              </h1>

              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Transform your GitHub issues into production-ready code with PiPilot SWE Agent.
                The intelligent development assistant that understands context, writes code, and deploys automatically.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg" asChild>
                  <Link href="/setup">
                    <Zap className="w-5 h-5 mr-2" />
                    Get Started Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 px-8 py-3 text-lg" asChild>
                  <a href="https://github.com/apps/pipilot-swe-agent" target="_blank" rel="noopener noreferrer">
                    <Github className="w-5 h-5 mr-2" />
                    View on GitHub
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-8 text-sm text-white/60">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  Free tier available
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  GitHub integration
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-gray-900/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Powerful Features for Modern Development
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Everything you need to build, deploy, and maintain software with AI assistance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">AI-Powered Development</CardTitle>
                  <CardDescription className="text-gray-300">
                    Advanced AI models that understand your requirements and generate production-ready code
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Github className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">GitHub Integration</CardTitle>
                  <CardDescription className="text-gray-300">
                    Seamless integration with GitHub issues, pull requests, and project management
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Multi-Language Support</CardTitle>
                  <CardDescription className="text-gray-300">
                    Support for JavaScript, TypeScript, Python, and modern web frameworks
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Usage Monitoring</CardTitle>
                  <CardDescription className="text-gray-300">
                    Track usage, manage limits, and monitor costs with detailed analytics
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Automated Deployment</CardTitle>
                  <CardDescription className="text-gray-300">
                    Automatic deployment to Vercel, Netlify, and other platforms
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Real-time Collaboration</CardTitle>
                  <CardDescription className="text-gray-300">
                    Work with your team in real-time with live updates and notifications
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section id="pricing" className="py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Choose the plan that fits your development needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white text-xl">Free</CardTitle>
                  <CardDescription className="text-gray-300">Perfect for getting started</CardDescription>
                  <div className="text-3xl font-bold text-white mt-4">$0</div>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-2 text-sm text-gray-300 mb-6">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      10 tasks/month
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Basic AI models
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Community support
                    </li>
                  </ul>
                  <Button className="w-full bg-gray-700 hover:bg-gray-600" asChild>
                    <Link href="/setup">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-3 py-1">Popular</Badge>
                </div>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white text-xl">Pro Monthly</CardTitle>
                  <CardDescription className="text-gray-300">Most popular choice</CardDescription>
                  <div className="text-3xl font-bold text-white mt-4">$30<span className="text-lg text-gray-400">/month</span></div>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-2 text-sm text-gray-300 mb-6">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      150 tasks/month
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      All AI models
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Priority support
                    </li>
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/setup">Choose Pro</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white text-xl">Pro Annual</CardTitle>
                  <CardDescription className="text-gray-300">Best value for power users</CardDescription>
                  <div className="text-3xl font-bold text-white mt-4">$288<span className="text-lg text-gray-400">/year</span></div>
                  <div className="text-sm text-green-400">Save 20%</div>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-2 text-sm text-gray-300 mb-6">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      170 tasks/month
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Everything in Pro
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Annual savings
                    </li>
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/setup">Choose Annual</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white text-xl">Extra Credits</CardTitle>
                  <CardDescription className="text-gray-300">Need more tasks?</CardDescription>
                  <div className="text-3xl font-bold text-white mt-4">$30</div>
                  <div className="text-sm text-gray-400">150 additional tasks</div>
                </CardHeader>
                <CardContent className="text-center">
                  <ul className="space-y-2 text-sm text-gray-300 mb-6">
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      150 extra tasks
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      One-time purchase
                    </li>
                    <li className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      No expiration
                    </li>
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/setup">Buy Credits</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-purple-900/50 to-gray-900/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Development Workflow?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are building faster with AI-powered assistance
            </p>
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg" asChild>
              <Link href="/setup">
                <Zap className="w-5 h-5 mr-2" />
                Start Building with PiPilot
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
