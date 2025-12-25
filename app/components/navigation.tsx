"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Menu, X, Github, Zap } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/app/components/ui/logo"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="relative z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
         <Logo variant="text" size="md" showSubtitle={false} />
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/setup" className="text-gray-300 hover:text-white transition-colors">
              Get Started
            </Link>
          </div>

          {/* Auth / CTA */}
          <div className="flex items-center space-x-4">
            <Link href="/setup">
              <Button variant="outline" size="sm" className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white">
                Get Started
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="#features"
                className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/setup"
                className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
