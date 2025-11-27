import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
    CheckCircle2,
    Users,
    FileText,
    Upload,
    Tags,
    Shield,
    Menu,
    X,
    ArrowRight,
    Sparkles,
    Zap,
    TrendingUp,
    Database,
    Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../utils/cn';

export function LandingPage() {
    const [email, setEmail] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const heroY = useTransform(scrollY, [0, 400], [0, 150]);
    const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

    // Smooth cursor tracking
    const cursorX = useMotionValue(0);
    const cursorY = useMotionValue(0);
    const smoothCursorX = useSpring(cursorX, { stiffness: 100, damping: 20 });
    const smoothCursorY = useSpring(cursorY, { stiffness: 100, damping: 20 });

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Waitlist signup:', email);
        setShowToast(true);
        setEmail('');
        setTimeout(() => setShowToast(false), 4000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-foreground overflow-x-hidden">
            {/* Animated Background Gradient Orbs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-400/30 rounded-full blur-[120px]"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px]"
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 100, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-pink-400/20 rounded-full blur-[130px]"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, -80, 0],
                        scale: [1, 0.9, 1],
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Floating Particles */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-indigo-400/40 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Navbar */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                isScrolled
                    ? "bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-lg shadow-slate-900/5 py-3"
                    : "bg-transparent py-6"
            )}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
                    <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl blur-md opacity-60 animate-pulse" />
                            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-xl">P</span>
                            </div>
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900">
                            PoliCRM
                        </span>
                    </motion.div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">Features</a>
                        <a href="#about" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">About</a>
                        <Link to="/war-room" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">War Room</Link>
                        <Button variant="ghost" className="font-medium" asChild>
                            <a href="/login">Sign In</a>
                        </Button>
                        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300">
                            Get Started
                        </Button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-slate-600 hover:text-indigo-600 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-6 text-lg font-medium">
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors">Features</a>
                            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors">About</a>
                            <a href="/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-indigo-600 transition-colors">Sign In</a>
                            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Get Started</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
                    <motion.div
                        style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
                        className="text-center max-w-5xl mx-auto"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 backdrop-blur-sm border border-indigo-200/50 text-indigo-700 rounded-full text-sm font-semibold mb-8 shadow-lg shadow-indigo-500/10"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Now in Closed Beta
                        </motion.div>

                        {/* Main Heading with Stagger Animation */}
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-tight"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                                The Modern CRM for{' '}
                            </span>
                            <br />
                            <span className="relative inline-block">
                                <motion.span
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-gradient"
                                    animate={{
                                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                >
                                    Australian Politics
                                </motion.span>
                                <motion.div
                                    className="absolute -inset-2 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-2xl -z-10"
                                    animate={{
                                        opacity: [0.5, 0.8, 0.5],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            </span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
                        >
                            Streamline member management, automate AEC verification, and power your campaign with the <span className="text-indigo-600 font-bold">only CRM built for Australian parties</span>.
                        </motion.p>

                        {/* CTA Form */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="max-w-md mx-auto mb-8"
                        >
                            <form onSubmit={handleSubmit} className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500" />
                                <div className="relative flex flex-col sm:flex-row gap-3 p-2 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl shadow-slate-900/10">
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                        className="border-0 bg-transparent focus-visible:ring-0 text-lg h-12 placeholder:text-slate-400"
                                    />
                                    <Button
                                        size="lg"
                                        className="h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/50"
                                    >
                                        Join Waitlist
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </form>
                            <p className="mt-4 text-sm text-slate-500 flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" /> Secure, compliant, and spam-free.
                            </p>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                            className="flex flex-wrap justify-center gap-8 md:gap-12 text-center mb-16"
                        >
                            <div className="group cursor-default">
                                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-1">
                                    <CountUpNumber end={10000} suffix="+" />
                                </div>
                                <div className="text-sm text-slate-600 font-medium">Members Verified</div>
                            </div>
                            <div className="group cursor-default">
                                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-1">
                                    <CountUpNumber end={99} suffix="%" />
                                </div>
                                <div className="text-sm text-slate-600 font-medium">Accuracy Rate</div>
                            </div>
                            <div className="group cursor-default">
                                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-indigo-600 mb-1">
                                    <CountUpNumber end={2} suffix=" hrs" />
                                </div>
                                <div className="text-sm text-slate-600 font-medium">Avg. Time Saved</div>
                            </div>
                        </motion.div>

                        {/* Social Proof */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                            className="pt-10 border-t border-slate-200/60"
                        >
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Trusted by innovative parties</p>
                            <div className="flex justify-center items-center gap-12 opacity-60 hover:opacity-100 transition-opacity duration-500">
                                <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full"></div>
                                    Fusion Party
                                </div>
                                <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full"></div>
                                    TNL
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid - Bento Style */}
            <section id="features" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-sm font-semibold mb-6"
                        >
                            <Zap className="w-4 h-4" />
                            Powerful Features
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-5xl md:text-6xl font-bold text-slate-900 mb-6"
                        >
                            Everything you need to{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">win</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-xl text-slate-600 max-w-2xl mx-auto"
                        >
                            Purpose-built tools designed specifically for the unique challenges of Australian political organizing.
                        </motion.p>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <FeatureCard key={idx} feature={feature} index={idx} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-gradient" style={{ backgroundSize: '200% 200%' }} />
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute top-0 left-0 w-full h-full"
                            style={{
                                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                                backgroundSize: '40px 40px'
                            }}
                        />
                    </div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
                            Ready to transform
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                                your party?
                            </span>
                        </h2>
                        <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Join the beta today and be among the first to experience the future of political organizing in Australia.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button
                                size="lg"
                                className="h-16 px-10 text-lg bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-2xl shadow-black/20 hover:shadow-black/30 hover:scale-105 transition-all duration-300 font-bold"
                            >
                                Get Early Access
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-16 px-10 text-lg border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60 rounded-2xl backdrop-blur-sm font-semibold transition-all duration-300"
                            >
                                View Documentation
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-16">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">P</span>
                                </div>
                                <span className="text-xl font-bold text-white">PoliCRM</span>
                            </div>
                            <p className="max-w-xs leading-relaxed">
                                The modern standard for Australian political party management. Secure, compliant, and powerful.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Product</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Legal</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm">© 2025 PoliCRM. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                            <div className="relative bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-green-500/20">
                                <motion.div
                                    className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                >
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-lg">You're on the list!</h4>
                                    <p className="text-sm text-slate-300">We'll be in touch soon.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Count-up animation component
function CountUpNumber({ end, suffix = '' }: { end: number; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        const duration = 2000;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = (currentTime - startTime) / duration;

            if (progress < 1) {
                setCount(Math.floor(end * progress));
                requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        requestAnimationFrame(animate);
    }, [end]);

    return <>{count}{suffix}</>;
}

// Enhanced Feature Card with 3D effects
function FeatureCard({ feature, index }: { feature: any; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={cn(
                "group relative p-8 rounded-3xl transition-all duration-500 cursor-default",
                feature.size || "md:col-span-1"
            )}
        >
            {/* Glow effect on hover */}
            <motion.div
                className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                animate={{
                    opacity: isHovered ? 0.3 : 0,
                }}
            />

            {/* Card background */}
            <div className="relative bg-white border border-slate-200/60 rounded-3xl p-8 shadow-lg group-hover:shadow-2xl transition-all duration-500 h-full">
                {/* Icon with animated background */}
                <motion.div
                    className="relative mb-6 w-fit"
                    animate={{
                        y: isHovered ? -8 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <div className={cn(
                        "absolute inset-0 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity",
                        feature.colorClass
                    )} />
                    <div className={cn(
                        "relative w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300",
                        feature.colorClass
                    )}>
                        {feature.icon}
                    </div>
                </motion.div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors duration-300">
                    {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                </p>

                {/* Hover indicator */}
                <motion.div
                    className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{
                        x: isHovered ? 5 : 0,
                    }}
                >
                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                </motion.div>
            </div>
        </motion.div>
    );
}

const features = [
    {
        icon: <CheckCircle2 className="w-8 h-8" />,
        title: 'Automated AEC Verification',
        description: 'Verify member enrollments automatically with our direct AEC integration. Ensure compliance without the manual headache.',
        colorClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
        size: 'lg:col-span-2'
    },
    {
        icon: <Users className="w-8 h-8" />,
        title: 'Member Management',
        description: 'Track members, tags, notes, and engagement history all in one beautiful, intuitive dashboard.',
        colorClass: 'bg-gradient-to-br from-purple-500 to-purple-600',
    },
    {
        icon: <FileText className="w-8 h-8" />,
        title: 'Electoral Reporting',
        description: 'Generate VEC/AEC compliant reports with one click. Export ready-to-submit formats.',
        colorClass: 'bg-gradient-to-br from-green-500 to-green-600',
    },
    {
        icon: <Upload className="w-8 h-8" />,
        title: 'Smart CSV Import',
        description: 'Migrate from NationBuilder or any platform effortlessly with intelligent duplicate detection.',
        colorClass: 'bg-gradient-to-br from-orange-500 to-orange-600',
        size: 'lg:col-span-2'
    },
    {
        icon: <Tags className="w-8 h-8" />,
        title: 'Flexible Tagging',
        description: 'Organize members with unlimited tags for targeted campaigns and communications.',
        colorClass: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    },
    {
        icon: <Shield className="w-8 h-8" />,
        title: 'Secure & Compliant',
        description: 'Bank-grade encryption, role-based access control, and full Privacy Act compliance.',
        colorClass: 'bg-gradient-to-br from-violet-500 to-violet-600',
    },
    {
        icon: <TrendingUp className="w-8 h-8" />,
        title: 'Analytics Dashboard',
        description: 'Real-time insights into member growth, verification rates, and engagement metrics.',
        colorClass: 'bg-gradient-to-br from-pink-500 to-pink-600',
    },
    {
        icon: <Database className="w-8 h-8" />,
        title: 'Data Export',
        description: 'Export your data anytime in multiple formats. Your data, always accessible.',
        colorClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    },
    {
        icon: <Lock className="w-8 h-8" />,
        title: 'Role-Based Access',
        description: 'Fine-grained permissions ensure team members only see what they need to see.',
        colorClass: 'bg-gradient-to-br from-slate-600 to-slate-700',
    },
];
