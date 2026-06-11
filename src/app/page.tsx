'use client';

import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { useToast, toast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
// socket.io-client imported dynamically in useEffect to avoid SSR issues
import {
  Search, MapPin, Calendar, Clock, Star, Shield, MessageSquare,
  BarChart3, ClipboardList, CreditCard, User, Users, Bell, Settings,
  CheckCircle, AlertTriangle, Home as HomeIcon, Wrench, Briefcase,
  Building2, Timer, Zap, Wallet, Lock, LogOut, Menu, X,
  RefreshCw, Check, Scale, ScrollText, Inbox, HardHat,
  CalendarDays, ShieldCheck, Hourglass, CircleCheck, Send, Filter,
  Sparkles, Eye, EyeOff, ChevronRight, ArrowLeftRight, CircleX, XCircle, ArrowLeft, Download,
  Trash2, Paperclip, FileText, Image as ImageIcon, CheckCircle2, Loader2, Landmark
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type View = 'landing' | 'dashboard';

export default function Home() {
  const { isAuthenticated, user, token, login, logout } = useAuthStore();
  const [view, setView] = useState<View>('landing');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [authKey, setAuthKey] = useState(0);

  // Check if user is authenticated on mount (use getState for reliable hydration)
  useEffect(() => {
    const { token: storedToken, isAuthenticated: isAuth } = useAuthStore.getState();
    if (storedToken && isAuth) {
      setView('dashboard');
      // Verify token is still valid — only logout on auth errors, not network errors
      api.getMe().catch((err: any) => {
        const msg = err?.message || '';
        if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('Token')) {
          logout();
          setView('landing');
        }
      });
    }
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await api.login(email, password);
      login(result.token, result.user);
      setShowAuthDialog(false);
      setView('dashboard');
    } catch (err: any) {
      throw new Error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [login]);

  const handleRegister = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const result = await api.register(data);
      login(result.token, result.user);
      setShowAuthDialog(false);
      setView('dashboard');
    } catch (err: any) {
      throw new Error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    setView('landing');
  }, [logout]);

  const openAuth = useCallback((mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthKey((k) => k + 1);
    setShowAuthDialog(true);
  }, []);

  if (view === 'dashboard' && isAuthenticated && user) {
    return (
      <DashboardView
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LandingView
      onOpenAuth={openAuth}
      showAuthDialog={showAuthDialog}
      authMode={authMode}
      onCloseAuth={() => setShowAuthDialog(false)}
      onSwitchAuthMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
      onLogin={handleLogin}
      onRegister={handleRegister}
      loading={loading}
    />
  );
}

// ==================== LANDING PAGE ====================
function LandingView({
  onOpenAuth,
  showAuthDialog,
  authMode,
  onCloseAuth,
  onSwitchAuthMode,
  onLogin,
  onRegister,
  loading,
}: {
  onOpenAuth: (mode: 'login' | 'register') => void;
  showAuthDialog: boolean;
  authMode: 'login' | 'register';
  onCloseAuth: () => void;
  onSwitchAuthMode: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: any) => Promise<void>;
  loading: boolean;
}) {
  const services = [
    { name: 'Cleaning', desc: 'Professional home & office cleaning' },
    { name: 'Cooking', desc: 'Expert chefs for your meals & events' },
    { name: 'Caregiving', desc: 'Trusted childcare & elderly care' },
    { name: 'Plumbing', desc: 'Fast plumbing repairs & installation' },
    { name: 'Electrical', desc: 'Certified electrical work' },
    { name: 'Engineering', desc: 'Structural, civil & mechanical engineering' },
    { name: 'Carpentry', desc: 'Custom woodwork & furniture' },
    { name: 'Painting', desc: 'Interior & exterior painting' },
    { name: 'Gardening', desc: 'Landscape & garden maintenance' },
    { name: 'Security', desc: 'Professional security services' },
    { name: 'Driving', desc: 'Chauffeur & delivery services' },
    { name: 'Hairstyling', desc: 'Professional hair styling & braids' },
    { name: 'Barbing', desc: 'Expert haircuts & grooming' },
    { name: 'Tutoring', desc: 'Academic & skill tutoring' },
    { name: 'HVAC', desc: 'Air conditioning & ventilation' },
    { name: 'Pest Control', desc: 'Fumigation & pest removal' },
    { name: 'Moving', desc: 'Packing & relocation services' },
    { name: 'Laundry', desc: 'Wash, dry & fold services' },
    { name: 'Maintenance', desc: 'General home repairs & fixes' },
  ];

  const features = [
    { icon: <Zap className="w-6 h-6 text-orange-600" />, title: 'Smart Matching', desc: 'Our intelligent algorithm matches you with the perfect service provider based on skills, location, and ratings.' },
    { icon: <Lock className="w-6 h-6 text-orange-600" />, title: 'Secure Payments', desc: 'Pay securely via Paystack only after your service is completed. No upfront charges — you only pay for work done.' },
    { icon: <ShieldCheck className="w-6 h-6 text-orange-600" />, title: 'Verified Providers', desc: 'All service providers go through a thorough verification process to ensure quality and reliability.' },
    { icon: <MessageSquare className="w-6 h-6 text-orange-600" />, title: 'Real-time Chat', desc: 'Communicate directly with your service provider through our integrated messaging system.' },
    { icon: <BarChart3 className="w-6 h-6 text-orange-600" />, title: 'Transparent Reviews', desc: 'Honest ratings and reviews help you make informed decisions about service providers.' },
    { icon: <CalendarDays className="w-6 h-6 text-orange-600" />, title: 'Easy Scheduling', desc: 'Book services at your convenience with our flexible scheduling system.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HE</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Home Ease</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Trusted by thousands of households
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Find Trusted Domestic{' '}
              <span className="text-orange-600">Service Providers</span>{' '}
              Near You
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Connect with verified, rated professionals for cleaning, cooking, plumbing, caregiving, and more. Secure payments, smart matching, and real-time communication.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onOpenAuth('register')}
                className="px-8 py-3.5 text-base font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300"
              >
                Book a Service
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-8 py-3.5 text-base font-semibold text-orange-700 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all border border-orange-200"
              >
                Become a Provider
              </button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-orange-500 font-bold text-lg">4.8</span>
                <span>Average Rating</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-orange-500 font-bold text-lg">500+</span>
                <span>Verified Providers</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-orange-500 font-bold text-lg">10K+</span>
                <span>Services Completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Services We Offer</h2>
            <p className="mt-4 text-lg text-gray-600">From daily household tasks to specialized maintenance</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {services.map((service) => (
              <div
                key={service.name}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all cursor-pointer bg-white"
              >
                <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why Choose Home Ease?</h2>
            <p className="mt-4 text-lg text-gray-600">Built for trust, transparency, and convenience</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Simple steps to get your domestic service done</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Search a Service', desc: "Search for the domestic service you need, and we'll suggest matching options" },
              { step: '02', title: 'Get Matched', desc: 'We find the best artisan based on their skills, ratings, and your location' },
              { step: '03', title: 'Pay Securely', desc: 'Pay via Paystack only after the service is completed' },
              { step: '04', title: 'Rate & Review', desc: 'Leave feedback to help others and improve matching' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 text-orange-700 font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-orange-100">Join thousands of happy clients and service providers today</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-3.5 text-base font-semibold text-orange-700 bg-white rounded-xl hover:bg-orange-50 transition-all"
            >
              Sign Up as Client
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all"
            >
              Join as Provider
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HE</span>
              </div>
              <span className="font-bold text-lg text-white">Home Ease</span>
            </div>
            <p className="text-sm">© 2026 Home Ease. Virtual Space for Domestic Services.</p>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      {showAuthDialog && (
        <AuthDialog
          key={authKey}
          mode={authMode}
          onClose={onCloseAuth}
          onLogin={onLogin}
          onRegister={onRegister}
          onSwitchMode={onSwitchAuthMode}
          loading={loading}
        />
      )}
    </div>
  );
}

// ==================== AUTH DIALOG ====================
function AuthDialog({
  mode,
  onClose,
  onLogin,
  onRegister,
  onSwitchMode,
  loading,
}: {
  mode: 'login' | 'register';
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: any) => Promise<void>;
  onSwitchMode: () => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !selectedSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === 'Backspace' && !skillInput && selectedSkills.length > 0) {
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && role === 'PROVIDER' && selectedSkills.length === 0) {
      setError('Please add at least one service you offer');
      return;
    }
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister({
          name, email, phone, password, role,
          ...(role === 'PROVIDER' ? { skills: selectedSkills.join(','), hourlyRate: parseFloat(hourlyRate) || 0, location, bio, bankName, accountNumber, accountName } : {}),
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('CLIENT')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        role === 'CLIENT'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <HomeIcon className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">Service Seeker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('PROVIDER')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        role === 'PROVIDER'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Wrench className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">Service Provider</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {mode === 'register' && role === 'PROVIDER' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services You Offer *</label>
                  <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 min-h-[42px]">
                    {selectedSkills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="text-orange-500 hover:text-orange-700 text-sm leading-none">&times;</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      className="flex-1 min-w-[80px] outline-none text-sm border-none p-0 focus:ring-0"
                      placeholder={selectedSkills.length === 0 ? 'Type a service and press Enter e.g., Plumbing, AC Repair...' : 'Add more...'}
                      autoComplete="off"
                    />
                  </div>
                  {selectedSkills.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">{selectedSkills.length} service{selectedSkills.length !== 1 ? 's' : ''} registered</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₦/hr)</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  />
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4" />
                    <label className="text-sm font-medium text-gray-700">Bank Account for Payout</label>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Where you'll receive payments after completing jobs</p>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm bg-white"
                    >
                      <option value="">Bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="GTBank">GTBank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="UBA">UBA</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Kuda Bank">Kuda</option>
                      <option value="Opay">Opay</option>
                      <option value="Moniepoint">Moniepoint</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                      placeholder="Account No."
                      maxLength={10}
                    />
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                      placeholder="Account Name"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button onClick={onSwitchMode} className="text-orange-600 font-medium hover:underline">
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={onSwitchMode} className="text-orange-600 font-medium hover:underline">
                  Sign In
                </button>
              </>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}

// ==================== PROVIDER RESTRICTED VIEW (Pending/Rejected) ====================
function ProviderRestrictedView({ user, verificationStatus, onLogout }: { user: any; verificationStatus: string; onLogout: () => void }) {
  const authToken = useAuthStore((s) => s.token);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRejected = verificationStatus === 'REJECTED';

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const fetchMessages = useCallback(async () => {
    if (!authToken) return;
    try {
      setChatError('');
      const res = await fetch('/api/support/messages', { headers: headers() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err: any) {
      console.error('[SupportChat] Fetch error:', err);
      setChatError(err.message || 'Failed to load messages');
    }
  }, [authToken]);

  useEffect(() => {
    setChatLoading(true);
    fetchMessages().finally(() => setChatLoading(false));
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setChatError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }
      const data = await res.json();
      setAttachment({ url: data.url, name: data.name, type: data.type });
    } catch (err: any) {
      setChatError(err.message || 'Failed to upload file');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  async function sendMessage() {
    if ((!newMessage.trim() && !attachment) || sending) return;
    setSending(true);
    setChatError('');
    try {
      const body: any = { content: newMessage };
      if (attachment) {
        body.attachmentUrl = attachment.url;
        body.attachmentName = attachment.name;
        body.attachmentType = attachment.type;
      }
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Send failed (${res.status})`);
      }
      setNewMessage('');
      setAttachment(null);
      await fetchMessages();
    } catch (err: any) {
      console.error('[SupportChat] Send error:', err);
      setChatError(err.message || 'Failed to send message');
    }
    setSending(false);
  }

  const isImage = (type?: string) => type?.startsWith('image/');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">HE</span>
          </div>
          <span className="font-bold text-lg text-gray-900">Home Ease</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm">
              {user.name?.charAt(0) || '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Status Card */}
        <div className="max-w-lg w-full mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white border-2 border-gray-100 shadow-sm">
            {isRejected ? <XCircle className="w-8 h-8 text-red-500" /> : <Hourglass className="w-8 h-8 text-amber-500" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isRejected ? 'Application Declined' : 'Verification Pending'}
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            {isRejected
              ? 'Your provider application was not approved. Use the chat below to contact admin for clarification.'
              : 'Your account is under review. You will get full access once verified. You can chat with admin below.'}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {isRejected ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <Hourglass className="w-3.5 h-3.5 text-amber-500" />}
            {isRejected ? 'Declined' : 'Pending Review'}
          </div>
          {isRejected && (
            <button
              onClick={() => chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Support
            </button>
          )}
        </div>

        {/* Chat Box */}
        <div ref={chatSectionRef} className="max-w-lg w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Chat with Admin</span>
          </div>

          {/* Error banner */}
          {chatError && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs flex items-center justify-between">
              <span>{chatError}</span>
              <button onClick={() => setChatError('')} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {chatLoading && messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">Loading messages...</p>
            )}
            {!chatLoading && messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello to the admin!</p>
            )}
            {messages.map((msg: any) => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                    {!isMe && (
                      <p className="text-xs font-medium text-gray-500 mb-1 ml-1">
                        {msg.sender?.name || 'Admin'}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                      isMe
                        ? 'bg-orange-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachmentUrl && (
                        <div className="mt-1">
                          {isImage(msg.attachmentType) ? (
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || 'Attachment'}
                              className="max-w-full max-h-48 rounded-md cursor-pointer hover:opacity-90"
                              onClick={() => window.open(msg.attachmentUrl, '_blank')}
                            />
                          ) : (
                            <a
                              href={msg.attachmentUrl}
                              download={msg.attachmentName || 'file'}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="underline">{msg.attachmentName || 'File'}</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment preview */}
          {attachment && (
            <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 flex items-center gap-2">
              {isImage(attachment.type) ? (
                <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
              ) : (
                <FileText className="w-5 h-5 text-orange-600" />
              )}
              <span className="text-xs text-orange-800 truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-orange-400 hover:text-orange-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100">
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={handleFileSelect} />
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="px-2 py-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                title="Attach file (max 5MB)"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && !attachment)}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ user, onLogout }: { user: any; onLogout: () => void }) {
  const authToken = useAuthStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<string>(user.role === 'PROVIDER' ? 'job-offers' : 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ notifications: any[]; unreadCount: number }>({ notifications: [], unreadCount: 0 });
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [supportChatUser, setSupportChatUser] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportUnread, setSupportUnread] = useState(0);

  useEffect(() => {
    api.getNotifications().then(setNotifs).catch(() => {});
  }, []);

  // Poll support chat unread count for admin
  useEffect(() => {
    if (user.role !== 'ADMIN' || !authToken) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/support/messages', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.unreadCounts) {
          const total = Object.values(data.unreadCounts).reduce((sum: number, n: any) => sum + (n || 0), 0);
          setSupportUnread(total);
        }
      } catch (err) {
        console.error('[Dashboard] Support unread poll error:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [user.role, authToken]);

  const verificationStatus = user.role === 'PROVIDER' ? (user.provider?.verificationStatus || 'PENDING') : null;

  // Blocked screen for unverified/rejected providers with support chat
  if (user.role === 'PROVIDER' && verificationStatus !== 'VERIFIED') {
    return <ProviderRestrictedView user={user} verificationStatus={verificationStatus} onLogout={onLogout} />;
  }

  const navItems = user.role === 'CLIENT'
    ? [
        { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'find-artisans', label: 'Find Artisans', icon: <Search className="w-4 h-4" /> },
        { id: 'my-requests', label: 'My Requests', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
      ]
    : user.role === 'PROVIDER'
    ? [
        { id: 'job-offers', label: 'Job Offers', icon: <Inbox className="w-4 h-4" /> },
        { id: 'my-jobs', label: 'My Jobs', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'earnings', label: 'Earnings', icon: <Wallet className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
      ]
    : [
        { id: 'overview', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'verifications', label: 'Verifications', icon: <CircleCheck className="w-4 h-4" /> },
        { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { id: 'support-chat', label: 'Support Chat', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4" /> },
        { id: 'requests', label: 'All Requests', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'disputes', label: 'Disputes', icon: <Scale className="w-4 h-4" /> },
        { id: 'logs', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" /> },
      ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-100">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HE</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Home Ease</span>
          </div>
          
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="relative">{item.icon}
                  {item.id === 'support-chat' && supportUnread > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {supportUnread > 9 ? '9+' : supportUnread}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold">
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={async () => {
                  if (!showNotifPanel) {
                    const n = await api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 }));
                    setNotifs(n);
                  }
                  setShowNotifPanel(!showNotifPanel);
                }}
                className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <Bell className="w-5 h-5" />
                {notifs.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifs.unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
                    <button
                      onClick={async () => {
                        await api.markNotificationsRead(undefined, true);
                        setNotifs(prev => ({ ...prev, unreadCount: 0, notifications: prev.notifications.map((n: any) => ({ ...n, read: true })) }));
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.notifications.length ? (
                      notifs.notifications.map((notif: any) => (
                        <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-orange-50/50' : ''}`}>
                          <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 sm:p-6">
          {user.role === 'CLIENT' && <ClientContent tab={activeTab} user={user} onNavigate={(t) => setActiveTab(t)} />}
          {user.role === 'PROVIDER' && <ProviderContent tab={activeTab} user={user} onNavigate={(t) => setActiveTab(t)} />}
          {user.role === 'ADMIN' && <AdminContent tab={activeTab} user={user} />}
        </div>
      </main>

      {/* Overlay for mobile sidebar + close notif panel */}
      {(sidebarOpen || showNotifPanel) && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => { setSidebarOpen(false); setShowNotifPanel(false); }} />
      )}
      {showNotifPanel && (
        <div className="fixed inset-0 z-30 hidden lg:block" onClick={() => setShowNotifPanel(false)} />
      )}
    </div>
  );
}

// ==================== CLIENT DASHBOARD CONTENT ====================
function ClientContent({ tab, user, onNavigate }: { tab: string; user: any; onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'my-requests') {
        const [s, r] = await Promise.all([
          api.getStats().catch(() => ({
            totalRequests: 0, pendingRequests: 0, activeRequests: 0, completedRequests: 0,
            totalSpent: 0, totalInEscrow: 0, recentRequests: [], feedbacks: [], platformFeeRate: 0.05,
          })),
          api.getServices().catch(() => ({ requests: [], total: 0, page: 1, limit: 10 })),
        ]);
        setStats(s);
        setRequests(r.requests.map((req: any) => {
          // Auto-fix: if paymentStatus is HELD_IN_ESCROW or RELEASED but status is still AWAITING_PAYMENT,
          // display as COMPLETED (the backend should fix this too, but this handles stale data)
          if (req.status === 'AWAITING_PAYMENT' && (req.paymentStatus === 'HELD_IN_ESCROW' || req.paymentStatus === 'RELEASED')) {
            return { ...req, status: 'COMPLETED' };
          }
          return req;
        }));
      }
      if (tab === 'payments') {
        const p = await api.getPayments().catch(() => ({
          transactions: [],
          summary: { totalInEscrow: 0, totalReleased: 0, totalRefunded: 0, platformFeeRate: 0.05 },
        }));
        setPayments(p.transactions);
        setPaymentSummary(p.summary);
      }
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30 seconds when on overview or my-requests to pick up check-in/checkout changes
  useEffect(() => {
    if (tab !== 'overview' && tab !== 'my-requests') return;
    const hasActiveRequests = requests.some((r: any) => ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(r.status));
    if (!hasActiveRequests) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [tab, requests, loadData]);

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  if (tab === 'overview') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={stats?.totalRequests || 0} icon={<ClipboardList className="w-5 h-5" />} color="orange" />
          <StatCard label="Pending" value={stats?.pendingRequests || 0} icon={<Hourglass className="w-5 h-5" />} color="amber" />
          <StatCard label="Active" value={stats?.activeRequests || 0} icon={<RefreshCw className="w-5 h-5" />} color="blue" />
          <StatCard label="Total Spent" value={`₦${(stats?.totalSpent || 0).toLocaleString()}`} icon={<CreditCard className="w-5 h-5" />} color="purple" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
            {stats?.recentRequests?.length > 0 && (
              <button onClick={() => onNavigate('my-requests')} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                View all
              </button>
            )}
          </div>
          {stats?.recentRequests?.length ? (
            <div className="grid gap-3">
              {stats.recentRequests.map((req: any) => (
                <RequestCard key={req.id} request={req} onRefresh={loadData} />
              ))}
            </div>
          ) : (
            <EmptyState message="No requests yet. Create your first service request!" />
          )}
        </div>
      </div>
    );
  }

  if (tab === 'find-artisans') {
    return <FindArtisansView user={user} onSuccess={loadData} />;
  }

  if (tab === 'my-requests') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">My Service Requests</h3>
            <p className="text-sm text-gray-500 mt-0.5">{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
          </div>
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {requests.length ? (
          <div className="grid gap-3">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} showActions onNavigate={onNavigate} onRefresh={loadData} />
            ))}
          </div>
        ) : (
          <EmptyState message="No service requests yet" />
        )}
      </div>
    );
  }

  if (tab === 'payments') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleCheck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-900">₦{(paymentSummary?.totalReleased || 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Payments for completed services</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hourglass className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Pending Payment</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">₦{(paymentSummary?.totalInEscrow || 0).toLocaleString()}</p>
            <p className="text-xs text-orange-600 mt-1">Awaiting your payment</p>
          </div>
        </div>

        {/* Transaction List */}
        {payments.length ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artisan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.serviceRequest?.serviceType || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tx.serviceRequest?.provider?.user?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">₦{(tx.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No payments yet" />
        )}
      </div>
    );
  }

  if (tab === 'messages') {
    return <MessagesView user={user} />;
  }

  if (tab === 'profile') {
    return <ProfileEditor user={user} />;
  }

  return null;
}

// ==================== PROVIDER DASHBOARD CONTENT ====================
function ProviderContent({ tab, user, onNavigate }: { tab: string; user: any; onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const s = await api.getStats();
      setStats(s);
      setRetryCount(0); // Reset retry count on success
      if (tab === 'earnings') {
        const p = await api.getPayments();
        setPayments(p.transactions);
        setPaymentSummary(p.summary);
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message || 'Failed to load data');
      // Set safe defaults so the UI still renders
      setStats({
        totalAssignments: 0, activeJobs: 0, completedJobs: 0,
        totalEarnings: 0, pendingEarnings: 0, totalPlatformFees: 0,
        rating: user.provider?.rating || 0, totalReviews: user.provider?.totalReviews || 0,
        verificationStatus: user.provider?.verificationStatus || 'PENDING',
        jobOffers: [], hasBankDetails: !!(user.provider?.bankName && user.provider?.accountNumber && user.provider?.accountName),
        bankName: user.provider?.bankName || null, accountNumber: user.provider?.accountNumber || null,
        accountName: user.provider?.accountName || null,
        platformFeeRate: 0.05,
      });
    } finally {
      setLoading(false);
    }
  }, [tab, user.provider]);

  // Auto-retry with exponential backoff (max 3 retries)
  useEffect(() => {
    if (error && retryCount < 3) {
      const delay = Math.min(2000 * Math.pow(2, retryCount), 10000);
      retryTimerRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadData();
      }, delay);
    }
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [error, retryCount, loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  // Provider overview redirects to job-offers since we simplified the dashboard
  if (tab === 'overview') {
    return null;
  }

  if (tab === 'job-offers') {
    const jobOffers = stats?.jobOffers || [];
    const isVerified = user.provider?.verificationStatus === 'VERIFIED';
    return (
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Connection Error</p>
              <p className="text-sm text-red-600">{error}</p>
              {retryCount < 3 && (
                <p className="text-xs text-red-400 mt-1">Auto-retrying… (attempt {retryCount + 1}/3)</p>
              )}
            </div>
            <button
              onClick={() => { setRetryCount(0); loadData(); }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Retry Now
            </button>
          </div>
        )}
        {/* Verification Banner */}
        {!isVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Hourglass className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800">Verification Pending</p>
              <p className="text-sm text-amber-600">Your profile is awaiting admin verification. You&apos;ll be notified once approved.</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Job Offers" value={jobOffers.length} icon={<Inbox className="w-5 h-5" />} color="orange" />
          <StatCard label="Active Jobs" value={stats?.activeJobs || 0} icon={<RefreshCw className="w-5 h-5" />} color="blue" />
          <StatCard label="Completed" value={stats?.completedJobs || 0} icon={<CircleCheck className="w-5 h-5" />} color="amber" />
          <StatCard label="Rating" value={stats?.rating ? `${stats.rating}` : 'N/A'} icon={<Star className="w-5 h-5" />} color="purple" />
        </div>

        {/* Job Offers */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Incoming Job Offers</h3>
          <p className="text-sm text-gray-500 mt-1">Clients who want to book your services — accept to start chatting</p>
        </div>
        {jobOffers.length ? (
          <div className="space-y-3">
            {jobOffers.map((req: any) => (
              <div key={req.id} className="bg-white rounded-xl border border-orange-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={req.status} />
                      <span className="text-sm font-medium text-gray-500">{req.serviceType}</span>
                    </div>
                    {req.description && <p className="text-sm text-gray-600 mt-1">{req.description}</p>}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <span><MapPin className="w-3.5 h-3.5 inline mr-0.5" /> {req.location}</span>
                      <span><Calendar className="w-3.5 h-3.5 inline mr-0.5" /> {new Date(req.requestedDate).toLocaleDateString()}</span>
                      <span><Clock className="w-3.5 h-3.5 inline mr-0.5" /> {req.requestedTime}</span>
                      <span><Wallet className="w-3.5 h-3.5 inline mr-0.5" /> ₦{(req.amount || 0).toLocaleString()}</span>
                    </div>
                    {req.provider && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-blue-700">
                          You&apos;ll be paid per hour (₦{req.provider.hourlyRate?.toLocaleString() || '0'}/hr) after service
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Client: {req.client?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await api.serviceAction(req.id, 'accept');
                            loadData();
                          } catch (err: any) {
                            console.error('Accept error:', err);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.serviceAction(req.id, 'decline');
                            loadData();
                          } catch (err: any) {
                            console.error('Decline error:', err);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Decline
                      </button>
                    </div>
                    <p className="text-xs text-orange-500">Accept → Chat unlocked</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-3">No job offers right now</p>
            <p className="text-sm text-gray-400 mt-1">When clients book your services, their offers will appear here.<br/>Accept an offer to unlock in-app chat with the client.</p>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'my-jobs') {
    return <ProviderJobsView user={user} onRefresh={loadData} onNavigate={onNavigate} />;
  }

  if (tab === 'earnings') {
    return <WalletDashboard user={user} />;
  }

  if (tab === 'messages') {
    return <MessagesView user={user} />;
  }

  if (tab === 'profile') {
    return <ProfileEditor user={user} />;
  }

  return null;
}

// ==================== ADMIN DASHBOARD CONTENT ====================
function AdminContent({ tab, user }: { tab: string; user: any }) {
  const [summary, setSummary] = useState<any>(null);
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const s = await api.getAdminData();
        setSummary(s);
      }
      if (tab === 'verifications') {
        const p = await api.getAdminData('pending-verifications');
        setPendingProviders(p);
      }
      if (tab === 'users') {
        const u = await api.getAdminData('all-users');
        setAllUsers(u);
      }
      if (tab === 'requests') {
        const r = await api.getAdminData('all-requests');
        setAllRequests(r);
      }
      if (tab === 'disputes') {
        const d = await api.getAdminData('disputes');
        setDisputes(d);
      }
      if (tab === 'logs') {
        const l = await api.getAdminData('logs');
        setLogs(l);
      }
      if (tab === 'payouts') {
        const payoutData = await api.getPayouts();
        setPayouts(payoutData.transactions || []);
        setPayoutSummary(payoutData.summary || null);
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !summary && tab === 'overview') {
    return <LoadingSkeleton />;
  }

  if (tab === 'overview') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={summary?.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="orange" />
          <StatCard label="Service Providers" value={summary?.totalProviders || 0} icon={<Wrench className="w-5 h-5" />} color="blue" />
          <StatCard label="Total Requests" value={summary?.totalRequests || 0} icon={<ClipboardList className="w-5 h-5" />} color="amber" />
          <StatCard label="Revenue" value={`₦${(summary?.totalRevenue || 0).toLocaleString()}`} icon={<Wallet className="w-5 h-5" />} color="purple" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Requests</h3>
            <p className="text-3xl font-bold text-amber-600">{summary?.pendingRequests || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Awaiting provider match</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-orange-600">{summary?.completedRequests || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Successfully delivered</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Verifications</h3>
            <p className="text-3xl font-bold text-red-600">{summary?.pendingVerifications || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Providers to verify</p>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'verifications') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pending Verifications</h3>
        {pendingProviders.length ? (
          <div className="space-y-3">
            {pendingProviders.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{p.user?.name}</h4>
                    <p className="text-sm text-gray-500">{p.user?.email} • {p.user?.phone}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.skills?.split(',').map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2"><MapPin className="w-3.5 h-3.5 inline" /> {p.location} • ₦{p.hourlyRate.toLocaleString()}/hr</p>
                    {p.bio && <p className="text-sm text-gray-600 mt-1">{p.bio}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await api.adminAction('verify-provider', p.id); loadData(); }}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                    >
                      Verify
                    </button>
                    <button
                      onClick={async () => { await api.adminAction('reject-provider', p.id); loadData(); }}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No pending verifications" />
        )}
      </div>
    );
  }

  if (tab === 'users') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{u.role}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={async () => { await api.adminAction('suspend-user', u.id); loadData(); }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={async () => { await api.adminAction('activate-user', u.id); loadData(); }}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                        >
                          Activate
                        </button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="text-xs p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-red-100 hover:text-red-700 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{deletingUser?.name}</span> ({deletingUser?.email})? This action cannot be undone. All of the user's data including service requests, messages, and transaction history will be permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await api.adminAction('delete-user', deletingUser.id);
                                  loadData();
                                } catch (err: any) {
                                  alert(err.message || 'Failed to delete user');
                                }
                              }}
                              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === 'payouts') {
    const handlePayProvider = async (txId: string, providerName: string) => {
      if (!confirm(`Send payout to ${providerName}? This will transfer funds to their bank account via Paystack.`)) return;
      try {
        await api.initiatePayout(txId);
        loadData();
      } catch (err: any) {
        alert('Payout failed: ' + (err.message || 'Please try again'));
      }
    };

    const getTransferBadge = (status: string | null) => {
      if (!status) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Not Sent</span>;
      const map: Record<string, { bg: string; text: string; label: string }> = {
        PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Processing' },
        PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Transit' },
        SUCCESS: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
        FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
        REVERSED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Reversed' },
      };
      const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
      return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.bg} ${s.text}`}>{s.label}</span>;
    };

    // Filter to only show transactions that have been paid (COMPLETED or ESCROW)
    const payableTransactions = payouts.filter((tx: any) =>
      ['COMPLETED', 'ESCROW'].includes(tx.status) || tx.transferStatus
    );

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Provider Payouts</h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hourglass className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Pending Payout</span>
            </div>
            <p className="text-xl font-bold text-amber-900">₦{(payoutSummary?.pendingPayout || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">Awaiting transfer</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">In Transit</span>
            </div>
            <p className="text-xl font-bold text-blue-900">₦{(payoutSummary?.inTransit || 0).toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">Processing transfers</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleCheck className="w-3.5 h-3.5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Paid</span>
            </div>
            <p className="text-xl font-bold text-green-900">₦{(payoutSummary?.totalPaid || 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Successfully delivered</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleX className="w-3.5 h-3.5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Failed</span>
            </div>
            <p className="text-xl font-bold text-red-900">₦{(payoutSummary?.totalFailed || 0).toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-1">Needs attention</p>
          </div>
        </div>

        {/* Transactions Table */}
        {payableTransactions.length ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payableTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{tx.serviceRequest?.serviceType || 'N/A'}</div>
                        <div className="text-xs text-gray-400">#{tx.requestId?.slice(-6)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{tx.provider?.user?.name || 'N/A'}</div>
                        {tx.provider?.bankName && (
                          <div className="text-xs text-gray-500">{tx.provider.bankName} ••••{tx.provider.accountNumber?.slice(-4)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{tx.serviceRequest?.client?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">₦{(tx.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">₦{(tx.providerPayout || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3">
                        {getTransferBadge(tx.transferStatus)}
                        {tx.transferRef && (
                          <div className="text-xs text-gray-400 mt-0.5">Ref: {tx.transferRef.slice(-8)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {tx.paidOutAt
                          ? new Date(tx.paidOutAt).toLocaleDateString()
                          : new Date(tx.createdAt).toLocaleDateString()
                        }
                      </td>
                      <td className="px-4 py-3">
                        {!tx.transferStatus && ['COMPLETED', 'ESCROW'].includes(tx.status) && tx.provider?.bankName && (
                          <button
                            onClick={() => handlePayProvider(tx.id, tx.provider?.user?.name || 'Provider')}
                            className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                          >
                            Pay Provider
                          </button>
                        )}
                        {!tx.transferStatus && ['COMPLETED', 'ESCROW'].includes(tx.status) && !tx.provider?.bankName && (
                          <span className="text-xs text-red-500">No bank details</span>
                        )}
                        {tx.transferStatus === 'FAILED' && (
                          <button
                            onClick={() => handlePayProvider(tx.id, tx.provider?.user?.name || 'Provider')}
                            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                          >
                            Retry
                          </button>
                        )}
                        {tx.transferStatus === 'SUCCESS' && (
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        )}
                        {['PENDING', 'PROCESSING'].includes(tx.transferStatus || '') && (
                          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message="No transactions available for payout" />
        )}
      </div>
    );
  }

  if (tab === 'requests') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">All Service Requests</h3>
        {allRequests.length ? (
          <div className="space-y-3">
            {allRequests.map((req: any) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        ) : (
          <EmptyState message="No requests found" />
        )}
      </div>
    );
  }

  if (tab === 'disputes') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Disputes & Cancellations</h3>
        {disputes.length ? (
          <div className="space-y-3">
            {disputes.map((req: any) => (
              <div key={req.id} className="bg-white rounded-xl border border-red-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={req.status} />
                  <span className="text-sm font-medium">{req.serviceType}</span>
                </div>
                <p className="text-sm text-gray-600">{req.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Client: {req.client?.name}</span>
                  <span>Provider: {req.provider?.user?.name || 'Unassigned'}</span>
                  <span>Amount: ₦{(req.amount || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No disputes found" />
        )}
      </div>
    );
  }

  if (tab === 'logs') {
    // Compute stats from logs data
    const actionCounts: Record<string, number> = {};
    const adminCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    const last7Days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days.push(key);
      dailyCounts[key] = 0;
    }

    logs.forEach((log: any) => {
      // Action distribution
      const action = log.action || 'Unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;

      // Admin distribution
      const admin = log.admin?.name || 'Unknown';
      adminCounts[admin] = (adminCounts[admin] || 0) + 1;

      // Daily distribution
      const day = new Date(log.createdAt).toISOString().split('T')[0];
      if (day in dailyCounts) {
        dailyCounts[day]++;
      }
    });

    const sortedActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
    const sortedAdmins = Object.entries(adminCounts).sort((a, b) => b[1] - a[1]);
    const maxDaily = Math.max(...Object.values(dailyCounts), 1);
    const thisWeekCount = Object.values(dailyCounts).reduce((a, b) => a + b, 0);

    const handleExportCSV = () => {
      if (logs.length === 0) return;
      const headers = ['Admin', 'Action', 'Details', 'Date'];
      const rows = logs.map((log: any) => [
        log.admin?.name || '',
        log.action || '',
        (log.details || '').replace(/,/g, ';'),
        new Date(log.createdAt).toLocaleString(),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-6">
        {/* Header with export */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            <p className="text-sm text-gray-500 mt-0.5">{logs.length} total records</p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">This Week</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{thisWeekCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Action Types</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(actionCounts).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Active Admins</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(adminCounts).length}</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity chart - last 7 days */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Activity (Last 7 Days)</h4>
            {logs.length > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {last7Days.map((day) => {
                  const count = dailyCounts[day] || 0;
                  const height = Math.max(4, (count / maxDaily) * 100);
                  const dayLabel = new Date(day + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
                  const isToday = day === new Date().toISOString().split('T')[0];
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">{count}</span>
                      <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                        <div
                          className={`w-full max-w-[40px] rounded-t-md transition-all ${isToday ? 'bg-orange-500' : 'bg-orange-200'}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className={`text-[11px] ${isToday ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data to display</div>
            )}
          </div>

          {/* Action breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Action Breakdown</h4>
            {sortedActions.length > 0 ? (
              <div className="space-y-3">
                {sortedActions.slice(0, 6).map(([action, count]) => {
                  const pct = Math.round((count / logs.length) * 100);
                  return (
                    <div key={action}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 capitalize">{action.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data to display</div>
            )}
          </div>
        </div>

        {/* Admin activity */}
        {sortedAdmins.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Admin Activity</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {sortedAdmins.slice(0, 8).map(([name, count]) => (
                <div key={name} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-semibold flex-shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400">{count} action{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs table */}
        {logs.length ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">All Logs</h4>
              <button onClick={handleExportCSV} className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-400 uppercase">Admin</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-400 uppercase">Action</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-400 uppercase">Details</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{log.admin?.name || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
                          {(log.action || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{log.details}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message="No audit logs yet" />
        )}
      </div>
    );
  }

  if (tab === 'support-chat') {
    return <AdminSupportChat user={user} />;
  }

  return null;
}

// ==================== ADMIN SUPPORT CHAT ====================
function AdminSupportChat({ user }: { user: any }) {
  const authToken = useAuthStore((s) => s.token);
  const [conversations, setConversations] = useState<any[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [reApproving, setReApproving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const headers = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  };

  const selectedConversation = conversations.find((c: any) => c.id === selectedUser);
  const isDeclinedProvider = selectedConversation?.role === 'PROVIDER' && selectedConversation?.provider?.verificationStatus === 'REJECTED';

  const loadConversations = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/support/messages', { headers: headers() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[AdminChat] Load conversations error:', res.status, errData);
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        setLastMessages(data.lastMessages || {});
        setUnreadCounts(data.unreadCounts || {});
      }
    } catch (err: any) {
      console.error('[AdminChat] Load conversations failed:', err);
      setChatError(err.message || 'Failed to load conversations');
    }
  }, [authToken]);

  const loadChat = useCallback(async (userId: string) => {
    if (!authToken) return;
    try {
      setChatError('');
      const res = await fetch(`/api/support/messages?userId=${userId}`, { headers: headers() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[AdminChat] Load chat error:', res.status, errData);
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err: any) {
      console.error('[AdminChat] Load chat failed:', err);
      setChatError(err.message || 'Failed to load messages');
    }
  }, [authToken]);

  // Initial load
  useEffect(() => {
    if (!authToken) return;
    setChatLoading(true);
    setChatError('');
    loadConversations().finally(() => setChatLoading(false));
  }, [authToken]);

  // When a user is selected, load their chat + polling
  useEffect(() => {
    if (!selectedUser) return;
    let mounted = true;
    setMessages([]);
    (async () => { if (mounted) await loadChat(selectedUser); })();
    const interval = setInterval(() => {
      if (mounted) { loadConversations(); loadChat(selectedUser); }
    }, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedUser, loadChat, loadConversations]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setChatError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }
      const data = await res.json();
      setAttachment({ url: data.url, name: data.name, type: data.type });
    } catch (err: any) {
      setChatError(err.message || 'Failed to upload file');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => setAttachment(null);

  async function sendMessage() {
    if ((!newMessage.trim() && !attachment) || !selectedUser || sending) return;
    setSending(true);
    setChatError('');
    try {
      const body: any = { receiverId: selectedUser, content: newMessage };
      if (attachment) {
        body.attachmentUrl = attachment.url;
        body.attachmentName = attachment.name;
        body.attachmentType = attachment.type;
      }
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Send failed (${res.status})`);
      }
      setNewMessage('');
      setAttachment(null);
      await loadChat(selectedUser);
      await loadConversations();
    } catch (err: any) {
      console.error('[AdminChat] Send failed:', err);
      setChatError(err.message || 'Failed to send message');
    }
    setSending(false);
  }

  async function handleReApprove() {
    if (!selectedUser || !selectedConversation?.provider?.id || reApproving) return;
    setReApproving(true);
    try {
      await api.adminAction('verify-provider', selectedConversation.provider.id, 'Re-approved via support chat');
      toast({
        title: 'Provider Approved',
        description: `${selectedConversation.name} has been re-approved and will have full access.`,
      });
      await loadConversations();
      setChatError('');
    } catch (err: any) {
      setChatError(err.message || 'Failed to re-approve provider');
      toast({
        title: 'Approval Failed',
        description: err.message || 'Could not re-approve provider.',
        variant: 'destructive',
      });
    }
    setReApproving(false);
  }

  const isImage = (type?: string) => type?.startsWith('image/');

  return (
    <div className="max-w-5xl mx-auto flex bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Conversations list */}
      <div className={`w-56 border-r border-gray-100 flex flex-col ${selectedUser ? 'hidden lg:flex' : ''}`}>
        <div className="px-3 py-2.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Support Chats</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        {chatError && (
          <div className="px-2 py-1.5 bg-red-50 border-b border-red-100 text-red-600 text-[10px] flex items-center justify-between">
            <span className="truncate mr-1">{chatError}</span>
            <button onClick={() => setChatError('')} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {chatLoading && conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8 px-4">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8 px-4">No support conversations yet</p>
          ) : (
            conversations.map((c: any) => {
              const lastMsg = lastMessages[c.id];
              const unread = unreadCounts[c.id] || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelectedUser(c.id); setAttachment(null); }}
                  className={`w-full text-left px-3 py-2 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedUser === c.id ? 'bg-orange-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-xs flex-shrink-0">
                      {c.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-900 truncate">{c.name}</p>
                        {unread > 0 && (
                          <span className="ml-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{unread > 9 ? '9+' : unread}</span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {lastMsg.attachmentName ? `📎 ${lastMsg.attachmentName}` : lastMsg.content}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {c.role === 'PROVIDER' ? `Provider • ${c.provider?.verificationStatus || 'PENDING'}` : c.role}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header with re-approve button */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedUser(null)} className="lg:hidden text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-xs">
                  {selectedConversation?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">{selectedConversation?.name}</p>
                  <p className="text-[11px] text-gray-500">{selectedConversation?.role}{isDeclinedProvider ? ' • Declined' : ''}</p>
                </div>
              </div>
              {isDeclinedProvider && (
                <button
                  onClick={handleReApprove}
                  disabled={reApproving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {reApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  {reApproving ? 'Approving...' : 'Re-approve Provider'}
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">No messages in this conversation</p>
              )}
              {messages.map((msg: any) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      {!isMe && (
                        <p className="text-[11px] font-medium text-gray-500 mb-0.5 ml-1">{msg.sender?.name}</p>
                      )}
                      <div className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-pre-wrap ${
                        isMe ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.content && <p>{msg.content}</p>}
                        {msg.attachmentUrl && (
                          <div className="mt-1">
                            {isImage(msg.attachmentType) ? (
                              <img
                                src={msg.attachmentUrl}
                                alt={msg.attachmentName || 'Attachment'}
                                className="max-w-full max-h-48 rounded-md cursor-pointer hover:opacity-90"
                                onClick={() => window.open(msg.attachmentUrl, '_blank')}
                              />
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                download={msg.attachmentName || 'file'}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="underline">{msg.attachmentName || 'File'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <p className={`text-[9px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Send error */}
            {chatError && selectedUser && (
              <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 text-red-600 text-[10px] flex items-center justify-between">
                <span className="truncate mr-1">{chatError}</span>
                <button onClick={() => setChatError('')} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Attachment preview */}
            {attachment && (
              <div className="px-3 py-1.5 bg-orange-50 border-t border-orange-100 flex items-center gap-2">
                {isImage(attachment.type) ? (
                  <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <FileText className="w-5 h-5 text-orange-600" />
                )}
                <span className="text-[11px] text-orange-800 truncate flex-1">{attachment.name}</span>
                <button onClick={removeAttachment} className="text-orange-400 hover:text-orange-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Input area */}
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={handleFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  className="px-2 py-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Attach file (max 5MB)"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || (!newMessage.trim() && !attachment)}
                  className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorMap[color] || colorMap.orange}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== LIVE TIMER COMPONENT ====================
function LiveTimer({ checkInTime, checkOutTime }: { checkInTime: string; checkOutTime?: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const start = new Date(checkInTime).getTime();

    const update = () => {
      // Always use fresh Date.now() for live counting
      const now = checkOutTime ? new Date(checkOutTime).getTime() : Date.now();
      const diff = Math.max(0, now - start);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    update();
    if (!checkOutTime) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [checkInTime, checkOutTime]);

  return (
    <span className="font-mono text-lg font-bold text-orange-600">
      {elapsed}
    </span>
  );
}

// ==================== STATUS BADGE ====================
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    MATCHED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Matched' },
    ACCEPTED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Accepted' },
    IN_PROGRESS: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'In Progress' },
    AWAITING_PAYMENT: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Awaiting Payment' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    ESCROW: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Escrow' },
    ACTIVE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Active' },
    SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' },
    VERIFIED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Verified' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    HELD_IN_ESCROW: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Secured' },
    RELEASED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
    REFUNDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refunded' },
    FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  };
  const s = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function RequestCard({ request, showActions, onNavigate, onRefresh }: { request: any; showActions?: boolean; onNavigate?: (tab: string) => void; onRefresh?: () => void }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [payingNow, setPayingNow] = useState(false);
  const { toast } = useToast();

  const handlePayNow = async () => {
    setPayingNow(true);
    try {
      const paystackKey = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY : '';

      if (paystackKey && request.amount > 0) {
        // Single call to initialize Paystack (creates ONE checkout session)
        const payResult: any = await api.initializePaystackPayment(request.id);

        // If payment was already recorded in DB, just refresh
        if (payResult.alreadyPaid) {
          setPayingNow(false);
          if (onRefresh) onRefresh();
          else window.location.reload();
          return;
        }

        // Load Paystack SDK if not already loaded
        if (!(window as any).PaystackPop) {
          await new Promise<void>((resolve, reject) => {
            if (document.querySelector('script[src*="paystack"]')) {
              const check = setInterval(() => {
                if ((window as any).PaystackPop) { clearInterval(check); resolve(); }
              }, 100);
              setTimeout(() => { clearInterval(check); reject(new Error('SDK load timeout')); }, 15000);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Paystack payment form. Please check your internet connection.'));
            document.head.appendChild(script);
          });
        }

        // Open Paystack payment overlay — stays on the page as a popup
        await new Promise<void>((resolve, reject) => {
          const handler = (window as any).PaystackPop.setup({
            key: paystackKey,
            email: payResult.email,
            amount: request.amount * 100, // amount in kobo
            reference: payResult.reference,
            access_code: payResult.accessCode,
            metadata: {
              custom_fields: [
                { display_name: 'Service', variable_name: 'service_type', value: request.serviceType },
                { display_name: 'Request ID', variable_name: 'request_id', value: request.id },
              ]
            },
            onClose: () => {
              setPayingNow(false);
              reject(new Error('closed'));
            },
            callback: async () => {
              // Payment successful! Confirm in background (no page redirect)
              try {
                const confirmResult: any = await api.confirmPaystackPayment(payResult.reference);
                if (confirmResult.txStatus === 'COMPLETED') {
                  toast({
                    title: 'Payment Confirmed & Artisan Paid! ✅',
                    description: `₦${request.amount.toLocaleString()} paid. ₦${confirmResult.providerPayout.toLocaleString()} credited to artisan's wallet.`,
                  });
                } else if (confirmResult.transferStatus === 'FAILED') {
                  toast({
                    title: 'Payment Successfully Received! ✅',
                    description: 'Payment received, but cannot process real payment to artisan because we are on test mode.',
                    variant: 'success',
                  });
                } else {
                  toast({
                    title: 'Payment Confirmed! ✅',
                    description: `₦${request.amount.toLocaleString()} secured in escrow. The artisan will receive ₦${confirmResult.providerPayout?.toLocaleString()} once bank details are verified.`,
                  });
                }
              } catch (confirmErr: any) {
                console.error('Payment confirmed by Paystack but DB confirmation failed:', confirmErr);
                toast({
                  title: 'Payment Received — Please Refresh',
                  description: 'Paystack confirmed your payment but we had trouble updating our records. Try refreshing the page.',
                  variant: 'destructive',
                });
              }
              // Refresh the page data to show updated payment status
              setPayingNow(false);
              if (onRefresh) onRefresh();
              resolve();
            },
          });
          handler.openIframe();
        });
      } else {
        // No Paystack key configured — use direct mock payment
        await api.createPayment(request.id, 'CARD');
        setPayingNow(false);
        if (onRefresh) onRefresh();
        else window.location.reload();
      }
    } catch (err: any) {
      const msg = err.message || 'Please try again';
      // Don't alert on close — user intentionally closed the popup
      if (!msg.includes('closed')) {
        alert('Payment failed: ' + msg);
      }
      setPayingNow(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Header row */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{request.serviceType}</p>
            <p className="text-xs text-gray-400">#{request.id?.slice(-6)}</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Details */}
      <div className="px-5 pb-4 border-t border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Date</p>
            <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {new Date(request.requestedDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Time</p>
            <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {request.requestedTime}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Location</p>
            <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {request.location}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Amount</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">₦{(request.amount || 0).toLocaleString()}</p>
          </div>
        </div>

        {request.description && (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{request.description}</p>
        )}

        {/* Provider info */}
        {request.provider && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-gray-50 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-xs font-semibold">
              {request.provider.user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{request.provider.user?.name}</p>
              <p className="text-xs text-gray-400">{request.provider.totalReviews || 0} {request.provider.totalReviews === 1 ? 'job' : 'jobs'} completed</p>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-gray-700">{request.provider.rating}</span>
            </div>
          </div>
        )}

        {/* Live timer */}
        {request.checkInTime && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg">
            <Timer className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              <LiveTimer checkInTime={request.checkInTime} checkOutTime={request.checkOutTime || undefined} />
            </span>
            {!request.checkOutTime && (
              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">LIVE</span>
            )}
            {request.totalHours && (
              <span className="text-xs text-gray-400">{request.totalHours} hour{request.totalHours > 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center gap-2 flex-wrap">
          {request.status === 'AWAITING_PAYMENT' && request.paymentStatus === 'PENDING' && (
            <button
              onClick={handlePayNow}
              disabled={payingNow}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {payingNow ? 'Processing...' : `Pay ₦${(request.amount || 0).toLocaleString()}`}
            </button>
          )}
          {request.status === 'COMPLETED' && !request.feedback && (
            <button
              onClick={() => setShowFeedback(true)}
              className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Leave Review
            </button>
          )}
          {(request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS') && (
            <button
              onClick={() => onNavigate?.('messages')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Message
            </button>
          )}
          {request.status === 'PENDING' && (
            <button
              onClick={async () => {
                await api.serviceAction(request.id, 'cancel');
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <div className="ml-auto">
            <span className="text-xs text-gray-400">Payment: <StatusBadge status={request.paymentStatus} /></span>
          </div>
        </div>
      )}

      {/* Feedback form */}
      {showFeedback && (
        <div className="px-5 py-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rate this service</h4>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFeedbackRating(star)}
                className={`${star <= feedbackRating ? 'text-amber-400' : 'text-gray-300'}`}
              >
                <Star className={`w-7 h-7 ${star <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Write a comment (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={async () => {
                await api.submitFeedback(request.id, feedbackRating, feedbackComment);
                setShowFeedback(false);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              Submit Review
            </button>
            <button
              onClick={() => setShowFeedback(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FIND ARTISANS VIEW (Browse & Book) ====================
function FindArtisansView({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedService, setSelectedService] = useState('');

  // Filter state
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinRate, setFilterMinRate] = useState('');
  const [filterMaxRate, setFilterMaxRate] = useState('');
  const [filterMinRating, setFilterMinRating] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [artisans, setArtisans] = useState<any[]>([]);
  const [filterMeta, setFilterMeta] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Booking modal state
  const [bookingArtisan, setBookingArtisan] = useState<any>(null);
  const [bookingDescription, setBookingDescription] = useState('');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('CARD');

  // Service data for per-word matching
  const serviceData = [
    { value: 'CLEANING', label: 'Cleaning', keywords: ['clean', 'wash', 'sweep', 'mop', 'dust', 'sanitize', 'tidy', 'scrub', 'vacuum', 'housekeeping', 'maid', 'janitor'] },
    { value: 'COOKING', label: 'Cooking', keywords: ['cook', 'chef', 'meal', 'food', 'kitchen', 'catering', 'recipe', 'dinner', 'lunch', 'breakfast', 'private chef'] },
    { value: 'CAREGIVING', label: 'Caregiving', keywords: ['care', 'caregiver', 'nanny', 'babysitter', 'elderly', 'senior', 'childcare', 'nurse', 'companion', 'sitter', 'home care'] },
    { value: 'PLUMBING', label: 'Plumbing', keywords: ['plumb', 'plumber', 'pipe', 'leak', 'drain', 'toilet', 'faucet', 'tap', 'water', 'sink', 'bathroom', 'shower'] },
    { value: 'LAUNDRY', label: 'Laundry', keywords: ['laundry', 'dry clean', 'iron', 'press', 'fold', 'clothes', 'dry cleaning', 'fabric care'] },
    { value: 'MAINTENANCE', label: 'Maintenance', keywords: ['maintain', 'repair', 'fix', 'handyman', 'renovation', 'restore', 'general repair', 'home repair', 'door', 'window', 'furniture'] },
    { value: 'ELECTRICAL', label: 'Electrical', keywords: ['electric', 'wiring', 'wire', 'light', 'power', 'switch', 'outlet', 'socket', 'circuit', 'generator', 'fan', 'ac', 'bulb', 'appliance'] },
    { value: 'PAINTING', label: 'Painting', keywords: ['paint', 'painter', 'decorate', 'wall', 'interior', 'exterior', 'color', 'varnish', 'stain'] },
    { value: 'GARDENING', label: 'Gardening', keywords: ['garden', 'lawn', 'mow', 'landscape', 'plant', 'flower', 'grass', 'weed', 'trim', 'hedge', 'tree', 'yard'] },
    { value: 'ENGINEERING', label: 'Engineering', keywords: ['engineer', 'engineering', 'structural', 'civil', 'mechanical', 'construction', 'building', 'site engineer', 'project engineer'] },
    { value: 'CARPENTRY', label: 'Carpentry', keywords: ['carpenter', 'carpentry', 'wood', 'woodwork', 'furniture', 'cabinet', 'shelf', 'joinery', 'wooden'] },
    { value: 'SECURITY', label: 'Security', keywords: ['security', 'guard', 'security guard', 'watchman', 'protection', 'safety', 'surveillance', 'cctv', 'bodyguard'] },
    { value: 'DRIVING', label: 'Driving', keywords: ['driver', 'driving', 'chauffeur', 'uber', 'taxi', 'delivery', 'transport', 'ride', 'logistics', 'courier'] },
    { value: 'TUTORING', label: 'Tutoring', keywords: ['tutor', 'tutoring', 'teacher', 'lesson', 'learn', 'study', 'academic', 'math', 'english', 'science', 'training', 'instructor'] },
    { value: 'HAIRSTYLING', label: 'Hairstyling', keywords: ['hair', 'hairstyle', 'stylist', 'styling', 'braids', 'weave', 'wig', 'salon', 'cornrow', 'dreadlock'] },
    { value: 'BARBING', label: 'Barbing', keywords: ['barber', 'barbing', 'haircut', 'trim', 'shave', 'grooming', 'beard', 'fade', 'clippers', 'barbershop'] },
    { value: 'HVAC', label: 'HVAC', keywords: ['hvac', 'air conditioning', 'ac', 'refrigeration', 'cooling', 'heating', 'ventilation', 'compressor', 'thermostat'] },
    { value: 'MOVING', label: 'Moving', keywords: ['moving', 'mover', 'pack', 'packing', 'relocate', 'relocation', 'furniture moving', 'loading', 'haul', 'transport'] },
    { value: 'PEST_CONTROL', label: 'Pest Control', keywords: ['pest', 'pest control', 'fumigation', 'insect', 'rodent', 'rat', 'cockroach', 'termite', 'exterminator', 'bug'] },
    { value: 'OTHER', label: 'Other', keywords: ['other', 'custom', 'special'] },
  ];

  const availLabels: Record<string, string> = { WEEKDAYS: 'Weekdays', WEEKENDS: 'Weekends', ALL_WEEK: 'All Week', CUSTOM: 'Custom' };

  // Per-word matching for suggestions
  const getSuggestions = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return serviceData.map(s => ({ ...s, matchScore: 0, matchedKeywords: [] as string[] }));
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    const scored = serviceData.map(service => {
      const labelLower = service.label.toLowerCase();
      const valueLower = service.value.toLowerCase();
      let matchScore = 0;
      const matchedKeywords: string[] = [];
      for (const word of queryWords) {
        if (labelLower === word) matchScore += 100;
        else if (labelLower.startsWith(word)) matchScore += 80;
        else if (labelLower.includes(word)) matchScore += 60;
        else if (valueLower.startsWith(word)) matchScore += 70;
        else if (valueLower.includes(word)) matchScore += 50;
        else {
          const keywordMatch = service.keywords.find(kw => kw === word || kw.startsWith(word) || kw.includes(word));
          if (keywordMatch) {
            if (keywordMatch === word) matchScore += 40;
            else if (keywordMatch.startsWith(word)) matchScore += 30;
            else matchScore += 20;
            if (!matchedKeywords.includes(keywordMatch)) matchedKeywords.push(keywordMatch);
          }
        }
      }
      return { ...service, matchScore, matchedKeywords };
    });
    return scored.filter(s => s.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
  };

  const suggestions = getSuggestions();
  const hasQuery = searchQuery.trim().length > 0;

  // Search artisans
  const doSearch = useCallback(async () => {
    setSearchLoading(true);
    try {
      const params: any = {};
      if (selectedService) params.service = selectedService;
      else if (searchQuery.trim()) params.q = searchQuery.trim();
      if (filterLocation) params.location = filterLocation;
      if (filterMinRate) params.minRate = Number(filterMinRate);
      if (filterMaxRate) params.maxRate = Number(filterMaxRate);
      if (filterMinRating) params.minRating = Number(filterMinRating);
      if (filterAvailability) params.availability = filterAvailability;
      params.sort = sortBy;
      const result = await api.searchArtisans(params);
      setArtisans(result.artisans);
      setFilterMeta(result.filters);
      setHasSearched(true);
    } catch (err: any) {
      console.error('Search error:', err);
      setHasSearched(true);
      toast({ title: 'Search failed', description: err.message || 'Could not load artisans. Please try again.', variant: 'destructive' });
    } finally {
      setSearchLoading(false);
    }
  }, [selectedService, searchQuery, filterLocation, filterMinRate, filterMaxRate, filterMinRating, filterAvailability, sortBy]);

  // Debounce auto-search when query or filters change
  useEffect(() => {
    if (!selectedService && !searchQuery.trim() && !filterLocation && !filterMinRate && !filterMaxRate && !filterMinRating && !filterAvailability) return;
    const timer = setTimeout(() => {
      doSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedService, searchQuery, filterLocation, filterMinRate, filterMaxRate, filterMinRating, filterAvailability, sortBy]);

  // Load all providers on mount (show artisans even without search)
  useEffect(() => {
    (async () => {
      try {
        const result = await api.searchArtisans({});
        setArtisans(result.artisans);
        setFilterMeta(result.filters);
        setHasSearched(true);
      } catch (err: any) {
        console.error('Initial artisans load error:', err);
        setHasSearched(true);
        toast({ title: 'Could not load artisans', description: err.message || 'Please refresh and try again.', variant: 'destructive' });
      }
    })();
  }, []);

  const handleSelectService = (value: string) => {
    setSelectedService(value);
    setSearchQuery('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleClearService = () => {
    setSelectedService('');
    setSearchQuery('');
    setHighlightedIndex(-1);
    setArtisans([]);
    setHasSearched(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If a suggestion is highlighted, select it; otherwise search the typed text
      if (showSuggestions && highlightedIndex >= 0) {
        const visibleItems = hasQuery ? suggestions : serviceData;
        if (highlightedIndex < visibleItems.length) {
          handleSelectService(visibleItems[highlightedIndex].value);
          return;
        }
      }
      if (searchQuery.trim()) {
        setShowSuggestions(false);
        doSearch();
      }
      return;
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }
    if (!showSuggestions) return;
    const visibleItems = hasQuery ? suggestions : serviceData;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, visibleItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleBookArtisan = (artisan: any) => {
    setBookingArtisan(artisan);
    setBookingAmount(String(Math.round(artisan.hourlyRate)));
    setBookingError('');
    setBookingSuccess(false);

    // Auto-detect service type from artisan's skills so user doesn't need to select one
    if (artisan.skills && artisan.skills.length > 0 && !selectedService) {
      const firstSkill = artisan.skills[0].toLowerCase();
      // Try to find a matching service type using keywords
      let matched = false;
      for (const service of serviceData) {
        const labelLower = service.label.toLowerCase();
        const valueLower = service.value.toLowerCase();
        if (labelLower === firstSkill || valueLower === firstSkill || labelLower.startsWith(firstSkill) || firstSkill.startsWith(labelLower)) {
          setSelectedService(service.value);
          matched = true;
          break;
        }
        for (const kw of service.keywords) {
          if (kw === firstSkill || firstSkill.startsWith(kw) || kw.startsWith(firstSkill)) {
            setSelectedService(service.value);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      // If no exact match, set the first skill as the service type
      if (!matched) {
        setSelectedService(firstSkill.toUpperCase());
      }
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      setBookingError('Unable to determine service type. Please select a service from the search bar first.');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    try {
      // Create the booking — no payment upfront
      await api.createService({
        serviceType: selectedService,
        description: bookingDescription,
        location: bookingLocation,
        requestedDate: bookingDate,
        requestedTime: bookingTime,
        providerId: bookingArtisan.id,
      });

      setBookingSuccess(true);
      onSuccess();
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const closeBookingModal = () => {
    if (bookingSuccess) {
      setBookingArtisan(null);
      setBookingDescription('');
      setBookingLocation('');
      setBookingDate('');
      setBookingTime('');
      setBookingAmount('');
      setBookingSuccess(false);
    }
    if (!bookingLoading) {
      setBookingArtisan(null);
      setBookingError('');
    }
  };

  const activeFilterCount = [
    filterLocation,
    filterMinRate,
    filterMaxRate,
    filterMinRating,
    filterAvailability,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterLocation('');
    setFilterMinRate('');
    setFilterMaxRate('');
    setFilterMinRating('');
    setFilterAvailability('');
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Find Available Artisans</h3>

        {/* Search + Service Selector */}
        <div className="relative">
          {selectedService ? (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border-2 border-orange-500 rounded-lg">
              <span className="text-sm font-medium text-orange-700">{serviceData.find(s => s.value === selectedService)?.label}</span>
              <button
                type="button"
                onClick={handleClearService}
                className="ml-auto text-orange-500 hover:text-orange-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setSelectedService('');
                      setHighlightedIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Search by service... e.g., clean, fix, chef, leak, wash"
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={() => doSearch()}
                  disabled={searchLoading}
                  className="px-5 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  {searchLoading ? '...' : 'Search'}
                </button>
              </div>
              {showSuggestions && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {hasQuery ? (
                    <>
                      {suggestions.length > 0 ? (
                        suggestions.map((st, idx) => (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => handleSelectService(st.value)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                              highlightedIndex === idx
                                ? 'bg-orange-50 text-orange-700'
                                : 'hover:bg-orange-50 hover:text-orange-700'
                            }`}
                          >
                            <span className="font-medium">{st.label}</span>
                            {st.matchedKeywords && st.matchedKeywords.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-gray-400">matched:</span>
                                {st.matchedKeywords.slice(0, 3).map((kw) => (
                                  <span key={kw} className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <p>No services match &quot;{searchQuery}&quot;</p>
                          <p className="mt-1 text-xs text-gray-400">Try different words</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">All Services</div>
                      {serviceData.map((st, idx) => (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => handleSelectService(st.value)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                            highlightedIndex === idx
                              ? 'bg-orange-50 text-orange-700'
                              : 'hover:bg-orange-50 hover:text-orange-700'
                          }`}
                        >
                          <span className="font-medium">{st.label}</span>
                          <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                            {st.keywords.slice(0, 4).map((kw, ki) => (
                              <span key={kw} className="text-xs text-gray-400">{kw}{ki < Math.min(st.keywords.length, 4) - 1 ? ' ·' : ''}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {showSuggestions && (
            <div className="fixed inset-0 z-10" onClick={() => { setShowSuggestions(false); setHighlightedIndex(-1); }} />
          )}
        </div>

        {/* Filters Toggle */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-orange-300 bg-orange-50 text-orange-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-orange-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-orange-600 underline"
            >
              Clear all filters
            </button>
          )}

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            >
              <option value="rating">Top Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="jobs">Most Jobs</option>
              <option value="reviews">Most Reviews</option>
            </select>
          </div>
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                {filterMeta?.locations?.length ? (
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                  >
                    <option value="">All Locations</option>
                    {filterMeta.locations.map((loc: string) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="e.g., Ikeja"
                  />
                )}
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Rate (₦/hr)</label>
                <input
                  type="number"
                  value={filterMinRate}
                  onChange={(e) => setFilterMinRate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder={filterMeta?.rateRange ? `From ₦${filterMeta.rateRange.min}` : '0'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Rate (₦/hr)</label>
                <input
                  type="number"
                  value={filterMaxRate}
                  onChange={(e) => setFilterMaxRate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder={filterMeta?.rateRange ? `Up to ₦${filterMeta.rateRange.max}` : 'Any'}
                />
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Rating</label>
                <select
                  value={filterMinRating}
                  onChange={(e) => setFilterMinRating(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Availability Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Availability</label>
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                >
                  <option value="">Any</option>
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="WEEKENDS">Weekends</option>
                  <option value="ALL_WEEK">All Week</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {searchLoading && !artisans.length ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
          <span className="ml-3 text-gray-500">Finding artisans...</span>
        </div>
      ) : hasSearched ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {artisans.length} artisan{artisans.length !== 1 ? 's' : ''} found
              {selectedService && <span className="text-orange-600 font-medium"> for {serviceData.find(s => s.value === selectedService)?.label}</span>}
            </p>
          </div>

          {artisans.length > 0 ? (
            <div className="grid gap-4">
              {artisans.map((artisan) => (
                <div
                  key={artisan.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xl shrink-0">
                      {artisan.name?.charAt(0) || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-lg">{artisan.name}</h4>
                        {artisan.rating > 0 && (
                          <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> <span className="text-sm text-amber-600 font-medium">{artisan.rating.toFixed(1)}</span></span>
                        )}
                        <span className="text-xs text-gray-400">({artisan.totalReviews} reviews)</span>
                        {artisan.verificationStatus && artisan.verificationStatus !== 'VERIFIED' && (
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            artisan.verificationStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : artisan.verificationStatus === 'DECLINED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {artisan.verificationStatus === 'PENDING' ? '⏳ Pending Verification' : artisan.verificationStatus === 'DECLINED' ? '⚠️ Declined' : artisan.verificationStatus}
                          </span>
                        )}
                        {artisan.verificationStatus === 'VERIFIED' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            ✓ Verified
                          </span>
                        )}
                      </div>

                      {artisan.bio && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{artisan.bio}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3.5 h-3.5 inline" /> {artisan.location || 'Not specified'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-orange-700">
                          ₦{artisan.hourlyRate.toLocaleString()}/hr
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3.5 h-3.5 inline" /> {availLabels[artisan.availability] || artisan.availability}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5 inline text-green-600" /> {artisan.completedJobs} jobs done
                        </span>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {artisan.skills.map((skill: string) => (
                          <span
                            key={skill}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              skill === selectedService
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Recent Reviews */}
                      {artisan.recentReviews && artisan.recentReviews.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400 mb-1.5">Recent reviews</p>
                          {artisan.recentReviews.slice(0, 2).map((review: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600 mb-1">
                              <span className="text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                              {' '}<span className="text-gray-400">{review.clientName}:</span> {review.comment || 'No comment'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Book Button */}
                    <div className="shrink-0">
                      <button
                        onClick={() => handleBookArtisan(artisan)}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Search className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-600 mt-3 font-medium">No artisans found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Initial state - prompt to search */
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <HardHat className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900 mt-4">Search for an Artisan</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Type a service keyword or select a service category above to find verified artisans with their prices, locations, and reviews.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {serviceData.slice(0, 6).map((s) => (
              <button
                key={s.value}
                onClick={() => handleSelectService(s.value)}
                className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-full hover:bg-orange-100 transition-colors border border-orange-200"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingArtisan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Book {bookingArtisan.name}</h2>
                <button onClick={closeBookingModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {bookingSuccess ? (
                <div className="text-center py-8">
                  <CircleCheck className="w-12 h-12 text-green-500 mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900 mt-4">Booking Confirmed!</h3>
                  <p className="text-gray-600 mt-2">
                    {bookingArtisan.name} has been notified and will accept your booking. You&apos;ll pay after the service is completed.
                  </p>

                  <button
                    onClick={closeBookingModal}
                    className="mt-6 px-6 py-2.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Artisan Summary */}
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold text-lg">
                      {bookingArtisan.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-orange-800">{bookingArtisan.name}</p>
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <span>₦{bookingArtisan.hourlyRate.toLocaleString()}/hr</span>
                        <span>•</span>
                        <span>{bookingArtisan.location}</span>
                        {bookingArtisan.rating > 0 && (
                          <>
                            <span>•</span>
                            <span><Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" /> {bookingArtisan.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {bookingError}
                    </div>
                  )}

                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                        {serviceData.find(s => s.value === selectedService)?.label || 'Not selected'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={bookingDescription}
                        onChange={(e) => setBookingDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                        placeholder="Describe what you need..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Location *</label>
                      <input
                        type="text"
                        value={bookingLocation}
                        onChange={(e) => setBookingLocation(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        placeholder="e.g., Victoria Island, Lagos"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                        <input
                          type="time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                          required
                        />
                      </div>
                    </div>

                    {/* Pay After Service Info */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5" />
                        <h4 className="text-sm font-semibold text-green-800">Pay After Service</h4>
                      </div>
                      <p className="text-xs text-green-700 leading-relaxed">
                        No upfront payment required. You&apos;ll be billed after the service is completed based on hours worked.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderJobsView({ user, onRefresh, onNavigate }: { user: any; onRefresh: () => void; onNavigate: (tab: string) => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const result = await api.getServices();
      setJobs(result.requests.map((req: any) => {
        if (req.status === 'AWAITING_PAYMENT' && (req.paymentStatus === 'HELD_IN_ESCROW' || req.paymentStatus === 'RELEASED')) {
          return { ...req, status: 'COMPLETED' };
        }
        return req;
      }));
    } catch (err) {
      console.error('Jobs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 30 seconds for live timer data
  useEffect(() => {
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const handleAction = async (jobId: string, action: string) => {
    setActionLoading(jobId);
    try {
      await api.serviceAction(jobId, action);
      await loadJobs();
      onRefresh();
    } catch (err: any) {
      console.error('Action error:', err);
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  const myJobs = jobs.filter((j: any) => j.providerId && j.status !== 'PENDING' && j.status !== 'MATCHED');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">My Jobs</h3>
      {myJobs.length ? (
        <div className="space-y-3">
          {myJobs.map((job: any) => (
            <div key={job.id} className={`bg-white rounded-xl border p-5 ${job.status === 'IN_PROGRESS' ? 'border-orange-300 shadow-md shadow-orange-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={job.status} />
                    <span className="text-sm font-medium text-gray-500">{job.serviceType}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span><MapPin className="w-3.5 h-3.5 inline mr-0.5" /> {job.location}</span>
                    <span><Calendar className="w-3.5 h-3.5 inline mr-0.5" /> {new Date(job.requestedDate).toLocaleDateString()}</span>
                    <span><Clock className="w-3.5 h-3.5 inline mr-0.5" /> {job.requestedTime}</span>
                    <span><User className="w-3.5 h-3.5 inline mr-0.5" /> {job.client?.name}</span>
                  </div>

                  {/* Live Timer for IN_PROGRESS jobs */}
                  {job.status === 'IN_PROGRESS' && job.checkInTime && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Timer className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Time on Job</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-600 font-medium">LIVE</span>
                          </span>
                        </div>
                        <LiveTimer checkInTime={job.checkInTime} />
                      </div>
                    </div>
                  )}

                  {/* Checkout summary for AWAITING_PAYMENT jobs */}
                  {job.status === 'AWAITING_PAYMENT' && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4" />
                        <span className="text-sm font-medium text-purple-800">Service Summary</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-purple-600">Time: <LiveTimer checkInTime={job.checkInTime} checkOutTime={job.checkOutTime || undefined} /></span>
                        <span className="text-purple-600">({job.totalHours} hour{job.totalHours > 1 ? 's' : ''})</span>
                      </div>
                      <div className="mt-1 text-lg font-bold text-purple-900">
                        Total: ₦{(job.amount || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-purple-500 mt-1">Waiting for client to pay</p>
                    </div>
                  )}

                  {/* Payment status badges */}
                  {job.paymentStatus === 'RELEASED' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <CircleCheck className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs font-medium text-green-700">Payment sent to your bank account</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {job.status === 'ACCEPTED' && (
                    <>
                      <button
                        onClick={() => handleAction(job.id, 'checkin')}
                        disabled={actionLoading === job.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === job.id ? '...' : 'Check In'}
                      </button>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleAction(job.id, 'checkout')}
                        disabled={actionLoading === job.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === job.id ? '...' : 'Check Out'}
                      </button>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No jobs assigned yet" />
      )}
    </div>
  );
}

// ==================== WALLET DASHBOARD (Provider Earnings) ====================
function WalletDashboard({ user }: { user: any }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const { toast } = useToast();

  const loadWallet = useCallback(async () => {
    try {
      const data = await api.getWallet();
      setWallet(data);
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > (wallet?.balance || 0)) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount within your wallet balance.', variant: 'destructive' });
      return;
    }
    setWithdrawing(true);
    try {
      await api.withdrawFromWallet(amount);
      toast({ title: 'Withdrawal Successful ✅', description: `₦${amount.toLocaleString()} has been withdrawn from your wallet.`, variant: 'success' });
      setWithdrawAmount('');
      await loadWallet();
    } catch (err: any) {
      toast({ title: 'Withdrawal Failed', description: err.message || 'Could not process withdrawal.', variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Wallet</h3>
        <button onClick={loadWallet} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 opacity-90" />
            <span className="text-sm font-medium opacity-90">Available Balance</span>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">Virtual Wallet</span>
        </div>
        <p className="text-3xl font-bold mt-2">₦{(wallet?.balance || 0).toLocaleString()}</p>
        <p className="text-sm opacity-80 mt-1">Earnings from completed services are credited here instantly</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CircleCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-green-900">₦{(wallet?.totalEarnings || 0).toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">Lifetime earnings</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Platform Fees</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">₦{(wallet?.totalCommission || 0).toLocaleString()}</p>
          <p className="text-xs text-orange-600 mt-1">5% service commission</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Withdrawn</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">₦{(wallet?.totalWithdrawn || 0).toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-1">Withdrawn to bank</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">₦0</p>
          <p className="text-xs text-amber-600 mt-1">Awaiting client payment</p>
        </div>
      </div>

      {/* Withdraw Section */}
      {user.role === 'PROVIDER' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-gray-500" />
            Withdraw to Bank Account
          </h4>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₦</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
            </button>
          </div>
          {(user.provider?.bankName || user.provider?.accountNumber) && (
            <p className="text-xs text-gray-400 mt-2">Funds will be withdrawn to {user.provider?.bankName} (••••{user.provider?.accountNumber?.slice(-4)})</p>
          )}
        </div>
      )}

      {/* Wallet Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Transaction History</h4>
          <span className="text-xs text-gray-400">{wallet?.ledger?.length || 0} transactions</span>
        </div>
        {wallet?.ledger && wallet.ledger.length > 0 ? (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {wallet.ledger.map((entry: any) => (
              <div key={entry.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  entry.type === 'EARNING' ? 'bg-green-100' :
                  entry.type === 'WITHDRAWAL' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  {entry.type === 'EARNING' ? <CircleCheck className="w-4 h-4 text-green-600" /> :
                   entry.type === 'WITHDRAWAL' ? <ArrowLeftRight className="w-4 h-4 text-red-600" /> :
                   <CreditCard className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.description || entry.type}</p>
                  <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${
                    entry.type === 'EARNING' ? 'text-green-700' :
                    entry.type === 'WITHDRAWAL' ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {entry.type === 'EARNING' ? '+' : '-'}₦{entry.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">Bal: ₦{entry.balanceAfter?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-3 text-sm">No wallet transactions yet</p>
            <p className="text-xs text-gray-400 mt-1">Earnings will appear here when clients pay for your services</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessagesView({ user }: { user: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const chatStatuses = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

  // Initialize WebSocket connection
  useEffect(() => {
    let socket: any;
    (async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io('/?XTransformPort=3003', {
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Chat connected');
        });

        socket.on('disconnect', () => {
          console.log('Chat disconnected');
        });

    // Listen for new messages from WebSocket
    socket.on('new-message', (msg: any) => {
      setMessages((prev) => {
        // Avoid duplicate messages
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Listen for typing indicators
    socket.on('user-typing', (data: { userId: string; userName: string }) => {
      if (data.userId !== user.id) {
        setTypingUser(data.userName);
        // Auto-clear typing after 3 seconds
        setTimeout(() => setTypingUser(null), 3000);
      }
    });

    socket.on('user-stop-typing', () => {
      setTypingUser(null);
    });
      } catch (err) {
        console.error('Socket connection error:', err);
      }
    })();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user.id]);

  // Join/leave rooms when selecting a conversation
  useEffect(() => {
    if (socketRef.current && selectedRequest) {
      // Leave previous rooms and join new one
      socketRef.current.emit('join-room', {
        requestId: selectedRequest,
        userId: user.id,
        userName: user.name,
      });
    }
    return () => {
      if (socketRef.current && selectedRequest) {
        socketRef.current.emit('leave-room', { requestId: selectedRequest });
      }
    };
  }, [selectedRequest, user.id, user.name]);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.getServices();
        const withProvider = result.requests.map((r: any) => {
          if (r.status === 'AWAITING_PAYMENT' && (r.paymentStatus === 'HELD_IN_ESCROW' || r.paymentStatus === 'RELEASED')) {
            return { ...r, status: 'COMPLETED' };
          }
          return r;
        }).filter((r: any) =>
          r.providerId && chatStatuses.includes(r.status)
        );
        setRequests(withProvider);
      } catch (err) {
        console.error('Messages error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      api.getMessages(selectedRequest).then(setMessages).catch(() => {});
    }
  }, [selectedRequest]);

  // Polling fallback: fetch messages every 5 seconds when a conversation is selected
  useEffect(() => {
    if (!selectedRequest) return;
    const interval = setInterval(() => {
      api.getMessages(selectedRequest).then((fetched) => {
        setMessages((prev) => {
          // Merge: keep local messages not yet in server, add server messages, deduplicate by ID
          const serverIds = new Set(fetched.map((m: any) => m.id));
          // Keep local-only messages (not yet on server)
          const localOnly = prev.filter(m => !serverIds.has(m.id));
          // Deduplicate fetched array by ID (in case of DB duplicates)
          const seenIds = new Set<string>();
          const dedupedFetched = fetched.filter((m: any) => {
            if (seenIds.has(m.id)) return false;
            seenIds.add(m.id);
            return true;
          });
          const merged = [...localOnly, ...dedupedFetched];
          return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedRequest]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRequest || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(selectedRequest, newMessage);
      // The WebSocket 'new-message' event will also add this, but we add locally first for instant feedback
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Also emit via WebSocket for real-time delivery to the other party
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          requestId: selectedRequest,
          messageId: msg.id,
          senderId: user.id,
          senderName: user.name,
          content: msg.content,
          createdAt: msg.createdAt,
        });
      }
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  // Typing indicator
  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (socketRef.current && selectedRequest) {
      socketRef.current.emit('typing', {
        requestId: selectedRequest,
        userId: user.id,
        userName: user.name,
      });
    }
  };

  if (loading) return <LoadingSkeleton />;

  // Get the other person's name for a request
  const getOtherPerson = (req: any) => {
    if (user.role === 'CLIENT') return req.provider?.user?.name || 'Provider';
    return req.client?.name || 'Client';
  };

  const getOtherPersonInitial = (req: any) => {
    const name = getOtherPerson(req);
    return name.charAt(0).toUpperCase();
  };

  const selectedReq = requests.find((r: any) => r.id === selectedRequest);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
      <div className="flex h-full">
        {/* Conversation list - sidebar */}
        <div className={`w-full sm:w-80 border-r border-gray-100 flex flex-col flex-shrink-0 ${selectedRequest ? 'hidden sm:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Messages</h3>
            <p className="text-xs text-gray-400 mt-0.5">{requests.length} conversation{requests.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {requests.length ? (
              <div>
                {requests.map((req: any) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req.id)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      selectedRequest === req.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold flex-shrink-0">
                        {getOtherPersonInitial(req)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{getOtherPerson(req)}</p>
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{req.serviceType}{req.description ? ` — ${req.description}` : ''}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{new Date(req.requestedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Messages will appear here once you have an active booking</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedRequest ? 'hidden sm:flex' : 'flex'}`}>
          {selectedRequest && selectedReq ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="sm:hidden p-1 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold">
                  {getOtherPersonInitial(selectedReq)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{getOtherPerson(selectedReq)}</p>
                  <p className="text-xs text-gray-400">{selectedReq.serviceType} — {new Date(selectedReq.requestedDate).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={selectedReq.status} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${msg.senderId === user.id ? 'order-2' : 'order-1'}`}>
                      {msg.senderId !== user.id && (
                        <p className="text-[11px] text-gray-400 mb-1 ml-1">{msg.sender?.name || 'Them'}</p>
                      )}
                      <div
                        className={`px-4 py-2.5 text-sm leading-relaxed ${
                          msg.senderId === user.id
                            ? 'bg-orange-600 text-white rounded-2xl rounded-br-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md'
                        }`}
                      >
                        <p>{msg.content}</p>
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.senderId === user.id ? 'text-right mr-1' : 'ml-1'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Say hello to get the conversation started</p>
                  </div>
                )}
                {typingUser && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    {typingUser} is typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !sending) sendMessage(); }}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                <p className="text-xs text-gray-400 mt-1">Choose from your active bookings on the left to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({ user }: { user: any }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    user.provider?.skills ? user.provider.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  );
  const [skillInput, setSkillInput] = useState('');
  const [hourlyRate, setHourlyRate] = useState(String(user.provider?.hourlyRate || ''));
  const [location, setLocation] = useState(user.provider?.location || '');
  const [bio, setBio] = useState(user.provider?.bio || '');
  const [availability, setAvailability] = useState(user.provider?.availability || 'WEEKDAYS');
  const [bankName, setBankName] = useState(user.provider?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user.provider?.accountNumber || '');
  const [accountName, setAccountName] = useState(user.provider?.accountName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const addSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !selectedSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === 'Backspace' && !skillInput && selectedSkills.length > 0) {
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name, phone,
        ...(user.role === 'PROVIDER' ? { skills: selectedSkills.join(','), hourlyRate: parseFloat(hourlyRate) || 0, location, bio, availability, bankName, accountNumber, accountName } : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All fields are required');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await api.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setShowPwSection(false);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h3>

        {user.role === 'PROVIDER' && user.provider?.verificationStatus && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-gray-50">
            <span className="text-lg">{user.provider.verificationStatus === 'VERIFIED' ? <CircleCheck className="w-5 h-5 text-green-600" /> : <Hourglass className="w-5 h-5 text-amber-500" />}</span>
            <div>
              <p className="font-medium text-gray-900">
                {user.provider.verificationStatus === 'VERIFIED' ? 'Verified Provider' : 'Verification Pending'}
              </p>
              <p className="text-sm text-gray-500">
                Rating: {user.provider.rating} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" /> ({user.provider.totalReviews} {user.provider.totalReviews === 1 ? 'review' : 'reviews'}) • {user.provider.completedJobs} {user.provider.completedJobs === 1 ? 'job' : 'jobs'} completed
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={user.email} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
          </div>

          {user.role === 'PROVIDER' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services You Offer</label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 min-h-[42px]">
                  {selectedSkills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="text-orange-500 hover:text-orange-700 text-sm leading-none">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    className="flex-1 min-w-[80px] outline-none text-sm border-none p-0 focus:ring-0"
                    placeholder={selectedSkills.length === 0 ? 'Type a service and press Enter e.g., Plumbing, AC Repair...' : 'Add more...'}
                    autoComplete="off"
                  />
                </div>
                {selectedSkills.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-500">{selectedSkills.length} service{selectedSkills.length !== 1 ? 's' : ''} registered</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₦/hr)</label>
                  <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 5000" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="WEEKENDS">Weekends</option>
                  <option value="ALL_WEEK">All Week</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none" />
              </div>

              {/* Bank Account Details for Payout */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-gray-900">Bank Account for Payout</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3">Payments are automatically sent to this account after you complete jobs.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                    >
                      <option value="">Select Bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="GTBank">GTBank</option>
                      <option value="First Bank">First Bank</option>
                      <option value="UBA">UBA</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Sterling Bank">Sterling Bank</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                      <option value="Polaris Bank">Polaris Bank</option>
                      <option value="Wema Bank">Wema Bank</option>
                      <option value="Kuda Bank">Kuda Bank</option>
                      <option value="Opay">Opay</option>
                      <option value="Moniepoint">Moniepoint</option>
                      <option value="PalmPay">PalmPay</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="0123456789"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                {bankName && accountNumber && accountName && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CircleCheck className="w-3.5 h-3.5 text-green-600" />
                    <p className="text-xs text-green-700">
                      Payouts will be sent to <span className="font-medium">{accountName}</span> — {bankName} ({accountNumber.slice(0, 3)}****{accountNumber.slice(-4)})
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Password</h3>
          <button
            onClick={() => setShowPwSection(!showPwSection)}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            {showPwSection ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Keep your account secure by updating your password regularly.</p>

        {pwSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Password updated successfully.
          </div>
        )}

        {showPwSection && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {pwError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {pwError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    {showNewPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPw}
              className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {changingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
      <p className="text-gray-500 mt-3">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
