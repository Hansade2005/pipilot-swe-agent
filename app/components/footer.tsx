import Link from "next/link"
import { Github, Twitter, Zap } from "lucide-react"
import { Logo } from "@/app/components/ui/logo"

export function Footer() {
  return (
    <footer className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="mb-4">
              <Logo variant="text" size="md" showSubtitle={false} />
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered software development assistant for GitHub. Transform ideas into code with intelligent automation.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/setup" className="text-gray-400 hover:text-white transition-colors">Get Started</Link></li>
              <li><Link href="#docs" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#docs" className="text-gray-400 hover:text-white transition-colors">API Docs</Link></li>
              <li><Link href="#support" className="text-gray-400 hover:text-white transition-colors">Support</Link></li>
              <li><Link href="#privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://github.com/apps/pipilot-swe-agent" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub App
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 PiPilot SWE Agent. Built with AI for developers, by developers.
          </p>
        </div>
      </div>
    </footer>
  )
}
