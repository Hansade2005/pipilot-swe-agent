"use client";
import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import Link from 'next/link';
import { 
  Rocket, CheckCircle, Bot, Code, Shield, Github, 
  Layers, Sparkles, ArrowRight, Terminal, Bug, Brain, ChevronRight 
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// --- Sub-Components for better organization ---

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

// 3. Typing Effect Hook
const useTypingEffect = (phrases: string[], speed = 100, delay = 2000) => {
  const [displayText, setDisplayText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    
    const timeout = setTimeout(() => {
      if (paused) {
        setPaused(false);
        return;
      }

      if (!isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        if (displayText.length === currentPhrase.length) {
          setPaused(true);
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, phrases, speed, delay, paused]);

  return displayText;
};

// 4. 3D Tilt Card Component
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateXVal = ((y - centerY) / centerY) * -5;
    const rotateYVal = ((x - centerX) / centerX) * 5;

    setRotateX(rotateXVal);
    setRotateY(rotateYVal);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div 
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: "transform 0.1s ease-out"
      }}
    >
      {children}
    </div>
  );
};

// 5. Reveal Animation Wrapper
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

// --- Main Page Component ---
export default function Home() {
  const typedText = useTypingEffect([
    "Transforming GitHub issues into deployable code...",
    "Refactoring legacy systems in seconds...",
    "Running tests in parallel environments...",
    "Deploying to edge networks automatically..."
  ]);

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
          <Link href="#" className="flex items-center gap-2 group">
             <img src="/logo.png" alt="PiPilot Logo" className=" w-6 h-6" />
            <span className="font-display font-bold text-xl tracking-tight text-white">PiPilot</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#workflow" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Workflow</Link>
            <Link href="#showcase" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Showcase</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</Link>
          </div>

          <Link href="/setup">
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 backdrop-blur-md px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all flex items-center gap-2 group">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Decorative Glows */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1.5s'}} />

          <div className="container mx-auto px-6 relative z-10 text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="text-sm font-medium text-purple-200">v2.0 is now live: 4D Engine Included</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter mb-6 leading-[0.9]">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">Autonomous</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mt-2">SWE Agent</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="h-8 mb-8">
                <p className="text-xl md:text-2xl text-gray-400 font-mono inline-block border-r-2 border-cyan-500 pr-2">
                  {typedText}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
                <Link href="/setup">
                  <button className="relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform duration-300 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative group-hover:text-white flex items-center gap-2">
                      Start Building Free <Rocket className="w-5 h-5" />
                    </span>
                  </button>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="relative max-w-5xl mx-auto">
                <TiltCard className="bg-white/5 p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl animate-float">
                  <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-white/5 relative aspect-[16/9] md:aspect-[21/9]">
                    {/* GitHub Header Mockup */}
                    <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/20">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                          <Github className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">PiPilot</span>
                          <span className="text-gray-400 text-xs">/</span>
                          <span className="text-white font-semibold text-sm">swe-agent</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-400">PiPilot Active</span>
                      </div>
                    </div>

                    {/* GitHub Issue/PR Content */}
                    <div className="p-6">
                      {/* Issue Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                              <Bug className="w-3 h-3 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Implement user authentication system</h3>
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-500/30">#402</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">Add secure login functionality with JWT tokens and password hashing</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Opened by <span className="text-blue-400">johndoe</span></span>
                            <span>2 hours ago</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                              enhancement
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PiPilot Bot Activity */}
                      <div className="bg-[#161b22] rounded-lg border border-white/10 p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold text-sm">PiPilot</span>
                              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">Bot</span>
                            </div>
                            <span className="text-gray-400 text-xs">started working on this 5 minutes ago</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-gray-300">Analyzing codebase structure...</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">Found authentication patterns in existing code</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-gray-300">Generating JWT authentication middleware...</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Implementation Progress</span>
                            <span>75%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-gradient-to-r from-purple-600 to-cyan-600 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                          </div>
                        </div>
                      </div>

                      {/* Code Preview */}
                      <div className="bg-[#0d1117] rounded-lg border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            <span className="text-xs text-gray-400 ml-2 font-mono">auth.js</span>
                          </div>
                          <span className="text-xs text-gray-500">Generated by PiPilot</span>
                        </div>
                        <div className="p-4 font-mono text-sm">
                          <div className="flex gap-2 text-pink-400">
                            <span>const</span>
                            <span className="text-blue-400">jwt</span>
                            <span>=</span>
                            <span className="text-yellow-300">require</span>
                            <span className="text-green-400">('jsonwebtoken')</span>;
                          </div>
                          <br />
                          <div className="flex gap-2 text-pink-400">
                            <span>const</span>
                            <span className="text-blue-400">authenticateToken</span>
                            <span>=</span>
                            <span className="text-yellow-300">async</span>
                            <span className="text-green-400">(req, res, next)</span>
                            <span>{'=>'}</span>
                            <span className="text-white">{'{'}</span>
                          </div>
                          <div className="ml-4 text-gray-400">
                            // PiPilot: JWT middleware for secure authentication
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur border border-cyan-500/30 px-4 py-2 rounded-full flex items-center gap-3 shadow-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold">PiPilot Active</span>
                    </div>
                  </div>
                </TiltCard>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-10 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: "10k+", label: "Repos Connected" },
                { val: "99.9%", label: "Accuracy" },
                { val: "0.4s", label: "Latency" },
                { val: "24/7", label: "Uptime" }
              ].map((stat, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{stat.val}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-widest">{stat.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-32 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">From Prompt to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Production</span></h2>
                <p className="text-gray-400 max-w-2xl mx-auto">PiPilot doesn't just write code. It understands context, manages dependencies, and deploys to your cloud provider.</p>
              </div>
            </Reveal>

            <div className="relative max-w-4xl mx-auto">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-purple-600 via-cyan-500 to-transparent transform md:-translate-x-1/2"></div>

              {[
                { icon: Bug, title: "1. Issue Detection", desc: "AI monitors your GitHub issues or listens to a natural language prompt.", color: "border-purple-500 text-purple-500" },
                { icon: Brain, title: "2. Architecture Planning", desc: "It analyzes your existing codebase to propose a structural plan that fits your style.", color: "border-cyan-500 text-cyan-500" },
                { icon: Rocket, title: "3. Execution & Deploy", desc: "Writes the code, runs tests, fixes bugs, and opens a Pull Request automatically.", color: "border-pink-500 text-pink-500" }
              ].map((step, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row items-center justify-between mb-24 group ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                  <Reveal width="45%" delay={i * 0.2}>
                    <div className={`text-left md:${i % 2 !== 0 ? 'text-left pl-12' : 'text-right pr-12'}`}>
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{step.title}</h3>
                      <p className="text-gray-400">{step.desc}</p>
                    </div>
                  </Reveal>
                  <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-black border-2 border-current rounded-full transform -translate-x-1/2 shadow-lg z-10" style={{ color: step.color.split(' ')[1].replace('text-', '') }}>
                     <div className={`absolute inset-0 rounded-full animate-ping opacity-75 bg-${step.color.split('-')[1]}-400`} style={{ backgroundColor: 'currentColor' }}></div>
                  </div>
                  <Reveal width="45%" delay={i * 0.2 + 0.1}>
                    <div className={`md:${i % 2 !== 0 ? 'pr-12' : 'pl-12'} flex justify-${i % 2 !== 0 ? 'start' : 'end'} pl-20 md:pl-0`}>
                      <div className={`bg-white/5 p-4 rounded-xl border-l-4 ${i % 2 !== 0 ? 'border-l-0 border-r-4' : ''} ${step.color} inline-flex items-center gap-3`}>
                        <step.icon className="w-8 h-8" />
                      </div>
                    </div>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid (3D Tilt) */}
        <section id="features" className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                <div className="max-w-2xl">
                  <h2 className="text-4xl md:text-6xl font-display font-bold mb-4">Engineered for <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Performance</span></h2>
                </div>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Code, title: "Context Aware", text: "It reads your entire repo. It understands your specific coding conventions, file structure, and dependencies.", color: "text-purple-500", glow: "bg-purple-600/20" },
                { icon: Shield, title: "Security First", text: "Automated security scanning on every generated line. Detects vulnerabilities before they reach production.", color: "text-cyan-500", glow: "bg-cyan-600/20" },
                { icon: Layers, title: "Self-Healing", text: "If a build fails, PiPilot analyzes the logs, fixes the error, and retries automatically.", color: "text-pink-500", glow: "bg-pink-600/20" }
              ].map((feature, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <TiltCard className="h-full group relative overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-colors p-8 rounded-3xl">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${feature.glow} blur-[50px] group-hover:opacity-100 transition-all`} />
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{feature.text}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section id="showcase" className="py-32 bg-black/50 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 block">Visual Evidence</span>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white">See it in Action</h2>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { src: "/screenshot1.png", title: "GitHub Issue Analysis", desc: "PiPilot analyzing and understanding issue requirements" },
                { src: "/screenshot2.png", title: "Code Generation", desc: "AI generating production-ready code solutions" },
                { src: "/screenshot3.png", title: "Pull Request Creation", desc: "Automated PR creation with complete implementation" }
              ].map((screenshot, index) => (
                <Reveal key={index} delay={index * 0.1}>
                  <div className="group relative rounded-2xl overflow-hidden cursor-pointer">
                    <img
                      src={screenshot.src}
                      alt={screenshot.title}
                      className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <h4 className="text-white font-bold translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{screenshot.title}</h4>
                      <p className="text-gray-300 text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{screenshot.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 block">Simple Pricing</span>
                <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">Choose Your Plan</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">Start free and scale as you grow. All plans include full access to our AI SWE Agent.</p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "forever",
                  description: "Perfect for getting started",
                  features: ["10 tasks/month", "Basic AI models", "Community support", "GitHub integration"],
                  cta: "Get Started Free",
                  popular: false
                },
                {
                  name: "Pro",
                  price: "$30",
                  period: "per month",
                  description: "Most popular for teams",
                  features: ["150 tasks/month", "Premium AI models", "Priority support", "Advanced integrations", "Custom templates", "API access"],
                  cta: "Start Pro Trial",
                  popular: true
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "pricing",
                  description: "For large organizations",
                  features: ["Unlimited tasks", "Dedicated support", "Custom integrations", "SLA guarantee", "On-premise deployment", "Advanced security"],
                  cta: "Contact Sales",
                  popular: false
                }
              ].map((plan, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <TiltCard className={`relative h-full p-8 rounded-3xl border transition-all duration-300 group ${
                    plan.popular 
                      ? 'bg-gradient-to-b from-purple-900/20 to-cyan-900/20 border-purple-500/50 shadow-2xl shadow-purple-500/10' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        <span className="text-gray-400">{plan.period}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{plan.description}</p>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/setup" className="block w-full">
                      <button className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                          : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                      }`}>
                        {plan.cta}
                      </button>
                    </Link>
                  </TiltCard>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.4}>
              <div className="text-center mt-12">
                <Link href="/setup" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
                  View detailed pricing and plans →
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent"></div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <Reveal>
              <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 tracking-tighter">Ready to <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Deploy 10x Faster?</span></h2>
              <p className="text-xl text-gray-400 mb-10">Join the revolution of autonomous software engineering.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/setup">
                  <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                    Get Started for Free
                  </button>
                </Link>
                <Link href="mailto:sales@pipilot.ai">
                  <button className="px-8 py-4 bg-white/5 text-white font-medium rounded-full hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm">
                    Contact Sales
                  </button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
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
                <li><Link href="#" className="hover:text-cyan-400 transition-colors">Features</Link></li>
                <li><Link href="https://pipilot.dev/features/integrations" className="hover:text-cyan-400 transition-colors">Integrations</Link></li>
                <li><Link href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link></li>
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
  );
}
