'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useEffect, useState, useRef, MouseEvent } from 'react';
import SetupForm from './SetupForm';
import { Logo } from '@/app/components/ui/logo';
import { Badge } from '@/app/components/ui/badge';
import { Sparkles, Shield, Zap, Rocket, Star, CheckCircle, Github, Terminal, Bot, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// --- Sub-Components for consistent design ---

// 1. Custom Cursor Component
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const addHoverListeners = () => setIsHovered(true);
    const removeHoverListeners = () => setIsHovered(false);

    document.addEventListener('mousemove', handleMouseMove as any);

    const clickables = document.querySelectorAll('a, button, .tilt-card');
    clickables.forEach(el => {
      el.addEventListener('mouseenter', addHoverListeners);
      el.addEventListener('mouseleave', removeHoverListeners);
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      clickables.forEach(el => {
        el.removeEventListener('mouseenter', addHoverListeners);
        el.removeEventListener('mouseleave', removeHoverListeners);
      });
    };
  }, []);

  return (
    <>
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-cyan-400 rounded-full pointer-events-none z-[9999] mix-blend-difference"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border border-purple-500/50 rounded-full pointer-events-none z-[9999]"
        animate={{
          x: position.x - 20,
          y: position.y - 20,
          scale: isHovered ? 1.5 : 1,
          backgroundColor: isHovered ? "rgba(124, 58, 237, 0.1)" : "transparent"
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.5 }}
      />
    </>
  );
};

// 2. Neural Background Canvas
const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles: any[] = [];
    const particleCount = Math.min(window.innerWidth / 10, 60);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        this.color = Math.random() > 0.5 ? 'rgba(124, 58, 237,' : 'rgba(6, 182, 212,';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = this.color + '0.5)';
        ctx!.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      ctx!.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(255, 255, 255, ${0.05 - distance/3000})`;
            ctx!.lineWidth = 0.5;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[-1] opacity-40" />;
};

// 3. Reveal Animation Wrapper
const Reveal = ({ children, delay = 0, width = "100%" }: { children: React.ReactNode, delay?: number, width?: string }) => {
  return (
    <div style={{ position: "relative", width, overflow: "hidden" }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 }
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden selection:bg-purple-500 selection:text-white font-sans">
      <CustomCursor />
      <NeuralBackground />

      {/* Background Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-grid opacity-20"
           style={{backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '40px 40px'}}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 py-6 backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
 <img src="/logo.png" alt="PiPilot Logo" className=" w-6 h-6" />            <span className="font-display font-bold text-xl tracking-tight text-white">PiPilot</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Home</Link>
            <Link href="#plans" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Plans</Link>
            <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="https://pipilot.dev/docs" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Docs</Link>
          </div>

          <Link href="/">
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 backdrop-blur-md px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all flex items-center gap-2 group">
              <span>Back to Home</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </nav>
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

      {/* Main Content */}
      <main>
        <div className="relative z-10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen pt-32">
          <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
            {/* Enhanced Logo Section */}
            <div className="text-center mb-12">
              <Reveal>
                <div className="flex items-center justify-center mb-8">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                    <div className="relative bg-black/50 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                      <Logo variant="icon" size="xl" />
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="inline-block mb-6">
                  <Badge className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-500/30 px-6 py-3 text-sm font-medium backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Setup Your Account
                  </Badge>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <h2 className="text-5xl md:text-7xl font-black mb-6">
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200">
                    Choose Your Plan
                  </span>
                  <span className="block text-3xl md:text-4xl font-bold text-gray-400 mt-2">
                    Start Building with AI
                  </span>
                </h2>
              </Reveal>

              {/* Animated underline */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full animate-pulse" />
              </div>

              <Reveal delay={0.3}>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Select the perfect plan for your development needs. All plans include access to our advanced AI SWE Agent with different usage limits.
                </p>
              </Reveal>
            </div>

            {/* Features Grid */}
            <Reveal delay={0.4}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
            </Reveal>

            {/* Setup Form Container */}
            <Reveal delay={0.5}>
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
            </Reveal>

            {/* Enhanced Security Notice */}
            <Reveal delay={0.6}>
              <div className="mt-8 text-center">
                <div className="inline-flex items-center space-x-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-full px-6 py-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300 text-sm font-medium">Bank-level security & 256-bit encryption</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
 <img src="/logo.png" alt="PiPilot Logo" className=" w-6 h-6" />                <span className="font-display font-bold text-xl tracking-tight text-white">PiPilot</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The autonomous AI agent that writes, tests, and deploys production-ready code.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
                <li><Link href="#plans" className="hover:text-cyan-400 transition-colors">Plans</Link></li>
                <li><Link href="https://pipilot.dev/features/integrations" className="hover:text-cyan-400 transition-colors">Integrations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="https://pipilot.dev/docs" className="hover:text-cyan-400 transition-colors">Documentation</Link></li>
                <li><Link href="https://pipilot.dev/blog" className="hover:text-cyan-400 transition-colors">Blog</Link></li>
              </ul>
            </div>


          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">© 2025 PiPilot Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Terminal className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}