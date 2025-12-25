import { Navigation } from "@/app/components/navigation"
import { Footer } from "@/app/components/footer"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Logo } from "@/app/components/ui/logo"
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
  Sparkles,
  Rocket,
  Cpu,
  Globe,
  Terminal,
  Layers,
  Play,
  ChevronDown
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Animated Background */}
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

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
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

      <Navigation />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Animated Logo */}
            <div className="mb-8 animate-fade-in-up">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                <div className="relative bg-black/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Logo variant="icon" size="xl" />
                </div>
              </div>
            </div>

            {/* Main Heading */}
            <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-6xl md:text-8xl font-black mb-4">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200">
                  PiPilot
                </span>
                <span className="block text-4xl md:text-6xl font-bold text-gray-400 mt-2">
                  SWE Agent
                </span>
              </h1>

              {/* Animated underline */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Subtitle */}
            <div className="max-w-4xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed mb-4">
                Transform your GitHub issues into production-ready code with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-semibold">
                  {" "}intelligent automation
                </span>
              </p>
              <p className="text-lg text-gray-400">
                The future of software development is here. Let AI handle the heavy lifting while you focus on innovation.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Link href="/setup">
                <Button size="lg" className="group relative bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center">
                    <Rocket className="w-5 h-5 mr-2" />
                    Start Building
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
              </Link>

              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 rounded-xl transition-all duration-300">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                  10K+
                </div>
                <div className="text-gray-400 text-sm">Projects Built</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                  99.9%
                </div>
                <div className="text-gray-400 text-sm">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                  50ms
                </div>
                <div className="text-gray-400 text-sm">Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                  24/7
                </div>
                <div className="text-gray-400 text-sm">AI Availability</div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <ChevronDown className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-2 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Powerful Features
              </Badge>

              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                Unleash the Power of
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                  AI Development
                </span>
              </h2>

              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Everything you need to build, deploy, and maintain software with intelligent automation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">AI Code Generation</CardTitle>
                  <CardDescription className="text-gray-400">
                    Generate production-ready code from natural language descriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Context-aware code suggestions
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Multiple language support
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Best practices built-in
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Github className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">GitHub Integration</CardTitle>
                  <CardDescription className="text-gray-400">
                    Seamlessly integrate with your GitHub workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Issue-to-code conversion
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      PR creation and management
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Code review assistance
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Terminal Commands</CardTitle>
                  <CardDescription className="text-gray-400">
                    Execute complex development tasks automatically
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Build and deployment
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Testing and linting
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Environment setup
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Security First</CardTitle>
                  <CardDescription className="text-gray-400">
                    Enterprise-grade security and compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      SOC 2 compliant
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      End-to-end encryption
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Private repositories
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Multi-Platform</CardTitle>
                  <CardDescription className="text-gray-400">
                    Deploy anywhere with seamless integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Vercel, Netlify, AWS
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Docker containers
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Serverless functions
                    </li>
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/setup">Choose Annual</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-500/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Full Stack</CardTitle>
                  <CardDescription className="text-gray-400">
                    Complete application development lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Frontend & backend
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Database design
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      API development
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                Ready to Transform Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  Development Workflow?
                </span>
              </h2>

              <p className="text-xl text-gray-400 mb-12">
                Join thousands of developers who are already building faster with PiPilot SWE Agent
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/setup">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105">
                    Get Started Free
                  </Button>
                </Link>

                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-xl transition-all duration-300">
                  Schedule Demo
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
