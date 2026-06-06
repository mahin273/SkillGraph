import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Github,
  GraduationCap,
  MailCheck,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const networkNodes = [
  { label: "React", left: "12%", top: "24%", size: "size-20", tone: "border-blue-500/30 bg-blue-950/45 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.12)] backdrop-blur-md" },
  { label: "Python", left: "74%", top: "18%", size: "size-24", tone: "border-emerald-500/30 bg-emerald-950/45 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)] backdrop-blur-md" },
  { label: "APIs", left: "61%", top: "58%", size: "size-18", tone: "border-pink-500/30 bg-pink-950/45 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.12)] backdrop-blur-md" },
  { label: "Docker", left: "22%", top: "69%", size: "size-22", tone: "border-amber-500/30 bg-amber-950/45 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.12)] backdrop-blur-md" },
  { label: "Neo4j", left: "44%", top: "34%", size: "size-28", tone: "border-purple-500/40 bg-purple-950/65 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.22)] backdrop-blur-md border-2" },
];

const outcomes = [
  {
    title: "Skill Graph",
    body: "Understand exactly what your repository commits and project work prove to employers.",
    Icon: Network,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
  },
  {
    title: "Career GPS",
    body: "Visualize the shortest path to target industry roles based on your verified skills gap.",
    Icon: Radar,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
  },
  {
    title: "Team Fit",
    body: "Discover ideal project collaborators and build balanced teams by real technical strengths.",
    Icon: Users,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  },
  {
    title: "Verified Profile",
    body: "Build trust using secure authentication. Link academic email, Google, or GitHub.",
    Icon: ShieldCheck,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
  }
];

const steps = [
  {
    title: "Create a verified profile",
    body: "Sign up with email confirmation, Google, or GitHub. GitHub can be connected later for scanning.",
    Icon: ShieldCheck,
    borderColor: "border-t-blue-500",
    iconColor: "text-blue-500 bg-blue-500/10"
  },
  {
    title: "Map real project evidence",
    body: "Turn code repositories, academic submissions, and endorsements into a readable skill graph.",
    Icon: Network,
    borderColor: "border-t-purple-500",
    iconColor: "text-purple-500 bg-purple-500/10"
  },
  {
    title: "Act on the next move",
    body: "Compare yourself to roles, fill tech gaps with resources, and match with the right teammates.",
    Icon: GraduationCap,
    borderColor: "border-t-emerald-500",
    iconColor: "text-emerald-500 bg-emerald-500/10"
  },
];

const authOptions = [
  { label: "Email Confirmation", Icon: MailCheck, desc: "Instant activation via secure OTP" },
  { label: "Google OAuth", Icon: CheckCircle2, desc: "One-click login for students" },
  { label: "GitHub Linking", Icon: Github, desc: "On-demand repository scan" },
];

export function Landing() {
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!pageRef.current) return;

    const context = gsap.context(() => {
      // 1. Initial page load transitions
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from("[data-gsap='nav']", { y: -16, opacity: 0, duration: 0.5 })
        .from("[data-gsap='hero-copy'] > *", { y: 28, opacity: 0, duration: 0.7, stagger: 0.08 }, "-=0.1")
        .from("[data-gsap='outcome']", { y: 18, opacity: 0, duration: 0.5, stagger: 0.05 }, "-=0.3")
        .from("[data-gsap='section-item']", { y: 22, opacity: 0, duration: 0.55, stagger: 0.06 }, "-=0.1");

      // 2. Slow background radar rotation
      gsap.to("[data-gsap='radar']", {
        rotate: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      // 3. Active scanning sweeping beam rotation (8s per full scan)
      gsap.to("[data-gsap='beam-container']", {
        rotate: 360,
        duration: 8,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      // 4. Skills "Discovery" Loop (triggered in sync with the sweeping beam rotation)
      const discoveryTimeline = gsap.timeline({ repeat: -1 });

      // Reset all nodes and lines at start of cycle
      discoveryTimeline.set(".hero-node-react, .hero-node-python, .hero-node-apis, .hero-node-docker, .hero-node-neo4j", { scale: 0, opacity: 0 });
      discoveryTimeline.set(".line-react, .line-python, .line-apis, .line-docker, .line-neo4j", { opacity: 0.05, strokeWidth: 1 });

      // Python (top-right, ~45°): sweep passes it at ~1.0s
      discoveryTimeline.to(".line-python", { opacity: 0.9, strokeWidth: 2.5, duration: 0.4 }, 0.8)
                       .to(".hero-node-python", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 1.1)
                       .to(".line-python", { opacity: 0.3, strokeWidth: 1.5, duration: 0.3 }, 1.3);

      // APIs (bottom-right, ~135°): sweep passes it at ~3.0s
      discoveryTimeline.to(".line-apis", { opacity: 0.9, strokeWidth: 2.5, duration: 0.4 }, 2.8)
                       .to(".hero-node-apis", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 3.1)
                       .to(".line-apis", { opacity: 0.3, strokeWidth: 1.5, duration: 0.3 }, 3.3);

      // Docker (bottom-left, ~225°): sweep passes it at ~5.0s
      discoveryTimeline.to(".line-docker", { opacity: 0.9, strokeWidth: 2.5, duration: 0.4 }, 4.8)
                       .to(".hero-node-docker", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 5.1)
                       .to(".line-docker", { opacity: 0.3, strokeWidth: 1.5, duration: 0.3 }, 5.3);

      // React (top-left, ~315°): sweep passes it at ~7.0s
      discoveryTimeline.to(".line-react", { opacity: 0.9, strokeWidth: 2.5, duration: 0.4 }, 6.8)
                       .to(".hero-node-react", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 7.1)
                       .to(".line-react", { opacity: 0.3, strokeWidth: 1.5, duration: 0.3 }, 7.3);

      // Center Neo4j node appears when all surrounding skills are discovered
      discoveryTimeline.to(".line-neo4j", { opacity: 0.9, strokeWidth: 2.5, duration: 0.4 }, 7.5)
                       .to(".hero-node-neo4j", { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.5)" }, 7.8)
                       .to(".line-neo4j", { opacity: 0.3, strokeWidth: 1.5, duration: 0.3 }, 8.1);

      // Highlight/pulse all nodes once fully discovered, hold for 3 seconds, then reset/fade out
      discoveryTimeline.to(".hero-node-react, .hero-node-python, .hero-node-apis, .hero-node-docker, .hero-node-neo4j", { 
                         borderColor: "rgba(255,255,255,0.45)",
                         boxShadow: "0 0 25px rgba(59,130,246,0.3)",
                         duration: 0.6, 
                         yoyo: true, 
                         repeat: 3, 
                         ease: "sine.inOut" 
                       }, 8.3)
                       .to(".hero-node-react, .hero-node-python, .hero-node-apis, .hero-node-docker, .hero-node-neo4j", { opacity: 0, scale: 0, duration: 0.8, stagger: 0.1 }, 12.0)
                       .to(".line-react, .line-python, .line-apis, .line-docker, .line-neo4j", { opacity: 0.05, strokeWidth: 1, duration: 0.8 }, 12.3);

    }, pageRef);

    return () => context.revert();
  }, []);

  return (
    <main ref={pageRef} className="min-h-screen bg-[#f6f7f9] text-[#17202a] font-sans antialiased">
      {/* Navigation Header */}
      <nav data-gsap="nav" className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold text-white tracking-wide font-outfit">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Network className="size-4.5" />
            </span>
            SkillGraph
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#auth" className="hover:text-white transition-colors">Access</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost-white" className="font-medium">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="white" className="font-semibold px-5 shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all">Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden bg-[#07111f] pt-16 text-white">
        {/* Ambient background glows */}
        <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute right-1/4 top-1/3 size-[400px] rounded-full bg-purple-500/10 blur-[110px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f6f7f9] to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1600px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-gsap="hero-copy" className="max-w-3xl z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur shadow-sm">
              <Sparkles className="size-3.5 text-blue-400" />
              Career intelligence for project-based learning
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl font-outfit bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400 leading-[1.1]">
              Make every course, project, and skill count toward your next role.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              SkillGraph turns student work into a verified skill profile, career roadmap, and collaboration signal without forcing GitHub at signup.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold sm:w-auto">
                  Create Account
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline-white" className="w-full hover:scale-[1.02] active:scale-[0.98] transition-all sm:w-auto">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Graph Display */}
          <div className="relative min-h-[580px] w-full flex items-center justify-center">
            {/* Center Radar Rings */}
            <div data-gsap="radar" className="absolute size-[540px] rounded-full border border-white/5 bg-gradient-to-tr from-white/2 to-transparent pointer-events-none" />
            <div className="absolute size-[380px] rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute size-[220px] rounded-full border border-white/5 pointer-events-none" />

            {/* Radar Sweeping Beam */}
            <div data-gsap="beam-container" className="absolute inset-0 size-full pointer-events-none flex items-center justify-center">
              <div className="size-[540px] rounded-full bg-[conic-gradient(from_0deg,transparent_60%,rgba(59,130,246,0.06)_100%)]" />
            </div>

            {/* Glowing Core */}
            <div className="absolute grid size-32 place-items-center rounded-[32px] border border-white/10 bg-[#0c192d]/90 text-white shadow-[0_0_50px_rgba(59,130,246,0.15)] z-20">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-sm" />
              <Radar className="size-12 text-blue-400 relative animate-pulse" />
            </div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true">
              {networkNodes.map((node) => (
                <line key={node.label} className={`line-${node.label.toLowerCase()}`} x1="50%" y1="50%" x2={node.left} y2={node.top} stroke="url(#lineGrad)" strokeWidth="1.5" />
              ))}
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Floating Glassmorphism Nodes */}
            {networkNodes.map((node) => (
              <div
                className={`absolute grid ${node.size} place-items-center rounded-2xl border text-sm font-semibold select-none transition-all duration-300 hover:scale-110 hover:border-white/30 z-30 cursor-pointer ${node.tone} hero-node-${node.label.toLowerCase()}`}
                key={node.label}
                style={{ left: node.left, top: node.top }}
              >
                {node.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features / Outcomes Section */}
      <section id="platform" className="relative mx-auto -mt-16 grid w-full max-w-[1600px] gap-6 px-5 sm:px-8 lg:grid-cols-4 z-20">
        {outcomes.map(({ title, body, Icon, color }) => (
          <article data-gsap="outcome" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group" key={title}>
            <div className={`grid size-12 place-items-center rounded-xl border ${color} transition-transform group-hover:scale-110 duration-300`}>
              <Icon className="size-5" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900 font-outfit">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">{body}</p>
          </article>
        ))}
      </section>

      {/* Organized Workflow Section */}
      <section id="workflow" className="mx-auto grid w-full max-w-[1600px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.76fr_1.24fr] items-center">
        <div data-gsap="section-item" className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600 font-outfit">Organized Workflow</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl font-outfit leading-[1.15]">
            A cleaner path from signup to career signal.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-500">
            The platform supports students who do not want to connect GitHub immediately, while still keeping repository scanning as a powerful upgrade available directly from their settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ title, body, Icon, borderColor, iconColor }, idx) => (
            <article data-gsap="section-item" className={`relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border-t-4 ${borderColor}`} key={title}>
              <div className="absolute top-6 right-6 text-xs font-bold text-slate-300 font-outfit">
                0{idx + 1}
              </div>
              <div className={`grid size-11 place-items-center rounded-xl ${iconColor}`}>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-base font-bold text-slate-900 font-outfit">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Flexible Access Card Section */}
      <section id="auth" className="mx-5 mb-16 rounded-[2rem] bg-gradient-to-tr from-[#050c18] to-[#0d1f3d] border border-white/5 p-8 sm:p-12 text-white sm:mx-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-32 -bottom-32 size-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />
        
        <div className="relative mx-auto grid w-full max-w-[1536px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-300 font-outfit">Flexible Access</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight font-outfit sm:text-5xl leading-[1.15]">
              Start with email.<br />Connect GitHub when you are ready.
            </h2>
            <p className="mt-6 text-slate-350 max-w-lg leading-7">
              We make onboarding frictionless. Create an account instantly and build your credentials at your own pace.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-1">
            {authOptions.map(({ label, Icon, desc }) => (
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors duration-300" key={label}>
                <div className="grid size-12 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15 shrink-0">
                  <Icon className="size-5.5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white font-outfit">{label}</h4>
                  <p className="mt-1 text-sm text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
