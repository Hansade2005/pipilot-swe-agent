import Link from "next/link"
import { Github, Twitter, Zap } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PiPilot SWE Agent</span>
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
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-4">
              <Logo variant="icon" size="sm" />
              <span className="text-gray-400 text-sm">EN</span>
            </div>
            
            <div className="flex items-center">
              <a href="https://www.producthunt.com/products/pipilot?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-pipilot" target="_blank" rel="noopener noreferrer">
                <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1040549&theme=light&t=1763663329258" alt="PiPilot - Build full apps and websites just by chatting with AI. | Product Hunt" style={{width: '250px', height: '54px'}} width="250" height="54" />
              </a>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2025 PiPilot. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
