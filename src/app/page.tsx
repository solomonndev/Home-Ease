'use client';

import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type View = 'landing' | 'dashboard';

export default function Home() {
  const { isAuthenticated, user, token, login, logout } = useAuthStore();
  const [view, setView] = useState<View>('landing');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    if (token && isAuthenticated) {
      setView('dashboard');
      // Verify token is still valid
      api.getMe().catch(() => {
        logout();
        setView('landing');
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
    { name: 'Laundry', desc: 'Wash, dry & fold services' },
    { name: 'Maintenance', desc: 'General home repairs & fixes' },
    { name: 'Electrical', desc: 'Certified electrical work' },
    { name: 'Painting', desc: 'Interior & exterior painting' },
    { name: 'Gardening', desc: 'Landscape & garden maintenance' },
  ];

  const features = [
    { icon: '🎯', title: 'Smart Matching', desc: 'Our intelligent algorithm matches you with the perfect service provider based on skills, location, and ratings.' },
    { icon: '🔒', title: 'Secure Payments', desc: 'Paystack-powered escrow system holds funds safely and auto-releases to artisan after completion, ensuring transparency for both parties.' },
    { icon: '⭐', title: 'Verified Providers', desc: 'All service providers go through a thorough verification process to ensure quality and reliability.' },
    { icon: '💬', title: 'Real-time Chat', desc: 'Communicate directly with your service provider through our integrated messaging system.' },
    { icon: '📊', title: 'Transparent Reviews', desc: 'Honest ratings and reviews help you make informed decisions about service providers.' },
    { icon: '📅', title: 'Easy Scheduling', desc: 'Book services at your convenience with our flexible scheduling system.' },
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
              <span className="font-bold text-xl text-gray-900">HomeEase</span>
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
              <span>✨</span> Trusted by thousands of households
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
              <div className="flex items-center gap-2">
                <span className="text-orange-500 font-bold text-lg">4.8★</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why Choose HomeEase?</h2>
            <p className="mt-4 text-lg text-gray-600">Built for trust, transparency, and convenience</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{feature.icon}</div>
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
              { step: '03', title: 'Pay Securely', desc: 'Payment is processed via Paystack and held in escrow — auto-released to artisan after completion' },
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
              <span className="font-bold text-lg text-white">HomeEase</span>
            </div>
            <p className="text-sm">© 2026 HomeEase. Virtual Space for Domestic Services.</p>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      {showAuthDialog && (
        <AuthDialog
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                      <span className="text-2xl block mb-1">🏠</span>
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
                      <span className="text-2xl block mb-1">🛠️</span>
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
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
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
                    <span>🏦</span>
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

          {/* Demo accounts */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 text-center">Demo Accounts</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex justify-between"><span>Client:</span><span>adaeze@example.com / client123</span></div>
              <div className="flex justify-between"><span>Provider:</span><span>ngozi@example.com / provider123</span></div>
              <div className="flex justify-between"><span>Admin:</span><span>admin@domestic-services.com / admin123</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>(user.role === 'PROVIDER' ? 'job-offers' : 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ notifications: any[]; unreadCount: number }>({ notifications: [], unreadCount: 0 });

  useEffect(() => {
    api.getNotifications().then(setNotifs).catch(() => {});
  }, []);

  const navItems = user.role === 'CLIENT'
    ? [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'find-artisans', label: 'Find Artisans', icon: '🔍' },
        { id: 'my-requests', label: 'My Requests', icon: '📋' },
        { id: 'payments', label: 'Payments', icon: '💳' },
        { id: 'messages', label: 'Messages', icon: '💬' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ]
    : user.role === 'PROVIDER'
    ? [
        { id: 'job-offers', label: 'Job Offers', icon: '📨' },
        { id: 'my-jobs', label: 'My Jobs', icon: '📋' },
        { id: 'messages', label: 'Messages', icon: '💬' },
        { id: 'earnings', label: 'Earnings', icon: '💰' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ]
    : [
        { id: 'overview', label: 'Dashboard', icon: '📊' },
        { id: 'verifications', label: 'Verifications', icon: '✅' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'requests', label: 'All Requests', icon: '📋' },
        { id: 'disputes', label: 'Disputes', icon: '⚖️' },
        { id: 'logs', label: 'Audit Logs', icon: '📜' },
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
            <span className="font-bold text-lg text-gray-900">HomeEase</span>
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
                <span>{item.icon}</span>
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
            <button
              onClick={async () => {
                const n = await api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 }));
                setNotifs(n);
                setActiveTab('notifications');
              }}
              className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg"
            >
              🔔
              {notifs.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifs.unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 sm:p-6">
          {user.role === 'CLIENT' && <ClientContent tab={activeTab} user={user} onNavigate={(t) => setActiveTab(t)} />}
          {user.role === 'PROVIDER' && <ProviderContent tab={activeTab} user={user} onNavigate={(t) => setActiveTab(t)} />}
          {user.role === 'ADMIN' && <AdminContent tab={activeTab} user={user} />}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
        setRequests(r.requests);
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

  if (loading && !stats) {
    return <LoadingSkeleton />;
  }

  if (tab === 'overview') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={stats?.totalRequests || 0} icon="📋" color="orange" />
          <StatCard label="Pending" value={stats?.pendingRequests || 0} icon="⏳" color="amber" />
          <StatCard label="Active" value={stats?.activeRequests || 0} icon="🔄" color="blue" />
          <StatCard label="Total Spent" value={`₦${(stats?.totalSpent || 0).toLocaleString()}`} icon="💳" color="purple" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
          {stats?.recentRequests?.length ? (
            <div className="space-y-3">
              {stats.recentRequests.map((req: any) => (
                <RequestCard key={req.id} request={req} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No requests yet. Create your first service request!</p>
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
          <h3 className="text-lg font-semibold text-gray-900">My Service Requests</h3>
          <button
            onClick={() => loadData()}
            className="text-sm text-orange-600 hover:underline"
          >
            Refresh
          </button>
        </div>
        {requests.length ? (
          <div className="space-y-3">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} showActions onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <EmptyState message="No service requests found" />
        )}
      </div>
    );
  }

  if (tab === 'payments') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Payments & Escrow</h3>

        {/* Payment Transparency Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>🔒</span>
              <span className="text-sm font-medium text-amber-800">Held in Escrow</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">₦{(paymentSummary?.totalInEscrow || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">Funds secured for active jobs</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>✅</span>
              <span className="text-sm font-medium text-green-800">Released to Artisans</span>
            </div>
            <p className="text-2xl font-bold text-green-900">₦{(paymentSummary?.totalReleased || 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Paid after work completion</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>↩️</span>
              <span className="text-sm font-medium text-red-800">Refunded</span>
            </div>
            <p className="text-2xl font-bold text-red-900">₦{(paymentSummary?.totalRefunded || 0).toLocaleString()}</p>
            <p className="text-xs text-red-600 mt-1">Returned to you</p>
          </div>
        </div>

        {/* How Escrow Works */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">How Escrow Payments Work</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'You Pay', desc: 'Payment is made securely via Paystack and held in escrow', icon: '💳' },
              { step: '2', title: 'Held in Escrow', desc: 'Funds are locked until work is completed', icon: '🔒' },
              { step: '3', title: 'Work Completed', desc: 'Provider finishes the service and marks it complete', icon: '✅' },
              { step: '4', title: 'Auto-Released', desc: 'Payment is automatically sent to artisan\'s bank account', icon: '🏦' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artisan Gets</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.serviceRequest?.serviceType || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tx.serviceRequest?.provider?.user?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">₦{(tx.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">₦{(tx.providerPayout || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {tx.status === 'ESCROW' && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">🔒 In escrow — auto-released when work is done</span>
                      )}
                      {tx.status === 'COMPLETED' && tx.paidOutAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">✅ Auto-released {new Date(tx.paidOutAt).toLocaleDateString()}</span>
                      )}
                    </td>
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
            <span className="text-2xl">⚠️</span>
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
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-medium text-amber-800">Verification Pending</p>
              <p className="text-sm text-amber-600">Your profile is awaiting admin verification. You&apos;ll be notified once approved.</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Job Offers" value={jobOffers.length} icon="📨" color="orange" />
          <StatCard label="Active Jobs" value={stats?.activeJobs || 0} icon="🔄" color="blue" />
          <StatCard label="Completed" value={stats?.completedJobs || 0} icon="✅" color="amber" />
          <StatCard label="Rating" value={stats?.rating ? `${stats.rating} ⭐` : 'N/A'} icon="⭐" color="purple" />
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
                      <span>📍 {req.location}</span>
                      <span>📅 {new Date(req.requestedDate).toLocaleDateString()}</span>
                      <span>🕐 {req.requestedTime}</span>
                      <span>💰 ₦{(req.amount || 0).toLocaleString()}</span>
                    </div>
                    {req.paymentStatus === 'HELD_IN_ESCROW' && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-xs">🔒</span>
                        <span className="text-xs font-medium text-amber-700">Payment secured in escrow</span>
                        {req.transaction && (
                          <span className="text-xs text-amber-600">— you get ₦{(req.transaction.providerPayout || 0).toLocaleString()}</span>
                        )}
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
            <span className="text-4xl">📭</span>
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
    const hasBankDetails = stats?.hasBankDetails;
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Earnings & Payouts</h3>

        {/* Bank Account Alert */}
        {!hasBankDetails && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🏦</span>
            <div className="flex-1">
              <p className="font-medium text-red-800">Bank Account Required for Payout</p>
              <p className="text-sm text-red-600">You need to add your bank account details to receive payments. Go to your Profile to set it up.</p>
            </div>
            <button
              onClick={() => onNavigate('profile')}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Add Bank Details
            </button>
          </div>
        )}

        {hasBankDetails && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-green-800">Payout Account Active</p>
              <p className="text-sm text-green-600">
                {stats?.bankName} ••••{stats?.accountNumber} — Payments will be sent to this account after work completion.
              </p>
            </div>
          </div>
        )}

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>🔒</span>
              <span className="text-sm font-medium text-amber-800">Pending in Escrow</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">₦{(paymentSummary?.totalInEscrow || stats?.pendingEarnings || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">Available after work completion</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>💰</span>
              <span className="text-sm font-medium text-green-800">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-green-900">₦{(paymentSummary?.totalReleased || stats?.totalEarnings || 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Paid to your bank account</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span>📊</span>
              <span className="text-sm font-medium text-orange-800">Platform Fees</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">₦{(stats?.totalPlatformFees || 0).toLocaleString()}</p>
            <p className="text-xs text-orange-600 mt-1">5% service fee on all transactions</p>
          </div>
        </div>

        {/* How Payouts Work */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">How You Get Paid</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Client Pays', desc: 'Client pays securely via Paystack, money held in escrow' },
              { step: '2', title: 'You Work', desc: 'Accept the job and complete the service' },
              { step: '3', title: 'Mark Complete', desc: 'Mark the job as completed when done' },
              { step: '4', title: 'Get Paid', desc: 'Payment auto-released to your bank account on completion' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        {payments.length ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Payout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.serviceRequest?.serviceType || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tx.serviceRequest?.client?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">₦{(tx.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">₦{(tx.providerPayout || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {tx.status === 'ESCROW'
                        ? '🔒 Auto-release on completion'
                        : tx.paidOutAt
                          ? `✅ Paid ${new Date(tx.paidOutAt).toLocaleDateString()}`
                          : new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No earnings yet" />
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

// ==================== ADMIN DASHBOARD CONTENT ====================
function AdminContent({ tab, user }: { tab: string; user: any }) {
  const [summary, setSummary] = useState<any>(null);
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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
          <StatCard label="Total Users" value={summary?.totalUsers || 0} icon="👥" color="orange" />
          <StatCard label="Service Providers" value={summary?.totalProviders || 0} icon="🛠️" color="blue" />
          <StatCard label="Total Requests" value={summary?.totalRequests || 0} icon="📋" color="amber" />
          <StatCard label="Revenue" value={`₦${(summary?.totalRevenue || 0).toLocaleString()}`} icon="💰" color="purple" />
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
                    <p className="text-sm text-gray-500 mt-2">📍 {p.location} • ₦{p.hourlyRate.toLocaleString()}/hr</p>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
        {logs.length ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{log.admin?.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{log.action}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.details}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No audit logs" />
        )}
      </div>
    );
  }

  return null;
}

// ==================== SHARED COMPONENTS ====================
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
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

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    MATCHED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Matched' },
    ACCEPTED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Accepted' },
    IN_PROGRESS: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'In Progress' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    ESCROW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Escrow' },
    ACTIVE: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Active' },
    SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' },
    VERIFIED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Verified' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    HELD_IN_ESCROW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Held in Escrow' },
    RELEASED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Released' },
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

function RequestCard({ request, showActions, onNavigate }: { request: any; showActions?: boolean; onNavigate?: (tab: string) => void }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [payingNow, setPayingNow] = useState(false);

  const handlePayNow = async () => {
    setPayingNow(true);
    try {
      const paystackKey = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

      if (paystackKey && request.amount > 0) {
        const payResult = await api.initializePaystackPayment(request.id);
        window.location.href = payResult.authorizationUrl;
      } else {
        // Fallback to mock payment
        await api.createPayment(request.id, 'CARD');
        window.location.reload();
      }
    } catch (err: any) {
      alert('Payment failed: ' + (err.message || 'Please try again'));
    } finally {
      setPayingNow(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={request.status} />
            <span className="text-sm font-medium text-gray-500">{request.serviceType}</span>
          </div>
          {request.description && <p className="text-sm text-gray-600 mt-1">{request.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span>📍 {request.location}</span>
            <span>📅 {new Date(request.requestedDate).toLocaleDateString()}</span>
            <span>🕐 {request.requestedTime}</span>
            <span>💰 ₦{(request.amount || 0).toLocaleString()}</span>
          </div>
          {request.provider && (
            <p className="text-xs text-gray-400 mt-2">
              Provider: {request.provider.user?.name} ⭐{request.provider.rating}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              Payment: <StatusBadge status={request.paymentStatus} />
            </span>
            {request.transaction && request.paymentStatus === 'HELD_IN_ESCROW' && (
              <span className="text-xs text-amber-600">🔒 ₦{(request.transaction.providerPayout || request.transaction.amount || 0).toLocaleString()} secured</span>
            )}
          </div>
        </div>
        {showActions && request.status === 'COMPLETED' && !request.feedback && (
          <button
            onClick={() => setShowFeedback(true)}
            className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
          >
            Leave Review
          </button>
        )}
        {showActions && request.status === 'PENDING' && request.paymentStatus === 'PENDING' && request.amount > 0 && (
          <button
            onClick={handlePayNow}
            disabled={payingNow}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            {payingNow ? '⏳' : '💳'} {payingNow ? 'Processing...' : 'Pay Now'}
          </button>
        )}
        {showActions && request.status === 'PENDING' && (
          <button
            onClick={async () => {
              await api.serviceAction(request.id, 'cancel');
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Cancel
          </button>
        )}
        {showActions && (request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS') && (
          <button
            onClick={() => onNavigate('messages')}
            className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-1"
          >
            💬 Chat
          </button>
        )}
      </div>

      {showFeedback && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rate this service</h4>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFeedbackRating(star)}
                className={`text-2xl ${star <= feedbackRating ? 'text-amber-400' : 'text-gray-300'}`}
              >
                ★
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
    { value: 'CLEANING', label: 'Cleaning', keywords: ['clean', 'wash', 'sweep', 'mop', 'dust', 'sanitize', 'tidy', 'scrub', 'vacuum', 'housekeeping', 'maid'] },
    { value: 'COOKING', label: 'Cooking', keywords: ['cook', 'chef', 'meal', 'food', 'kitchen', 'catering', 'recipe', 'dinner', 'lunch', 'breakfast', 'private chef'] },
    { value: 'CAREGIVING', label: 'Caregiving', keywords: ['care', 'caregiver', 'nanny', 'babysitter', 'elderly', 'senior', 'childcare', 'nurse', 'companion', 'sitter', 'home care'] },
    { value: 'PLUMBING', label: 'Plumbing', keywords: ['plumb', 'plumber', 'pipe', 'leak', 'drain', 'toilet', 'faucet', 'tap', 'water', 'sink', 'bathroom', 'shower'] },
    { value: 'LAUNDRY', label: 'Laundry', keywords: ['laundry', 'wash', 'dry clean', 'iron', 'press', 'fold', 'clothes', 'dry cleaning', 'fabric care'] },
    { value: 'MAINTENANCE', label: 'Maintenance', keywords: ['maintain', 'repair', 'fix', 'handyman', 'renovation', 'restore', 'general repair', 'home repair', 'door', 'window', 'furniture'] },
    { value: 'ELECTRICAL', label: 'Electrical', keywords: ['electric', 'wiring', 'wire', 'light', 'power', 'switch', 'outlet', 'socket', 'circuit', 'generator', 'fan', 'ac', 'bulb', 'appliance'] },
    { value: 'PAINTING', label: 'Painting', keywords: ['paint', 'painter', 'decorate', 'wall', 'interior', 'exterior', 'color', 'varnish', 'stain'] },
    { value: 'GARDENING', label: 'Gardening', keywords: ['garden', 'lawn', 'mow', 'landscape', 'plant', 'flower', 'grass', 'weed', 'trim', 'hedge', 'tree', 'yard'] },
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
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [selectedService, searchQuery, filterLocation, filterMinRate, filterMaxRate, filterMinRating, filterAvailability, sortBy]);

  // Auto-search when filters change or service is selected
  useEffect(() => {
    if (selectedService || searchQuery.trim()) {
      doSearch();
    }
  }, [selectedService, filterLocation, filterMinRate, filterMaxRate, filterMinRating, filterAvailability, sortBy]);

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
    if (!showSuggestions) return;
    const visibleItems = hasQuery ? suggestions : serviceData;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, visibleItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < visibleItems.length) {
        handleSelectService(visibleItems[highlightedIndex].value);
      } else if (searchQuery.trim()) {
        doSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleBookArtisan = (artisan: any) => {
    setBookingArtisan(artisan);
    setBookingAmount(String(Math.round(artisan.hourlyRate)));
    setBookingError('');
    setBookingSuccess(false);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) {
      setBookingError('Please select a service first');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    try {
      // Step 1: Create the service request first
      const serviceResult = await api.createService({
        serviceType: selectedService,
        description: bookingDescription,
        location: bookingLocation,
        requestedDate: bookingDate,
        requestedTime: bookingTime,
        amount: parseFloat(bookingAmount) || 0,
        providerId: bookingArtisan.id,
        paymentMethod: bookingPaymentMethod,
      });

      const requestId = serviceResult.id;
      const payAmount = parseFloat(bookingAmount) || 0;

      // Step 2: Check if Paystack is configured
      const paystackKey = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

      if (paystackKey && payAmount > 0) {
        try {
          // Initialize Paystack transaction on the backend
          const payResult = await api.initializePaystackPayment(requestId);

          // Redirect to Paystack payment page
          window.location.href = payResult.authorizationUrl;
          return; // Page will redirect, no need to continue
        } catch (payErr: any) {
          // Paystack init failed - fall back to mock payment
          console.warn('Paystack init failed, using mock payment:', payErr.message);
          await api.createPayment(requestId, bookingPaymentMethod);
          setBookingSuccess(true);
          onSuccess();
        }
      } else {
        // No Paystack key configured - use mock payment (for local testing)
        if (payAmount > 0) {
          await api.createPayment(requestId, bookingPaymentMethod);
        }
        setBookingSuccess(true);
        onSuccess();
      }
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
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
            <span>⚙️</span> Filters
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
                          <span className="text-sm text-amber-600 font-medium">⭐ {artisan.rating.toFixed(1)}</span>
                        )}
                        <span className="text-xs text-gray-400">({artisan.totalReviews} reviews)</span>
                      </div>

                      {artisan.bio && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{artisan.bio}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          📍 {artisan.location || 'Not specified'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-orange-700">
                          ₦{artisan.hourlyRate.toLocaleString()}/hr
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          📅 {availLabels[artisan.availability] || artisan.availability}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          ✅ {artisan.completedJobs} jobs done
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
              <span className="text-5xl">🔍</span>
              <p className="text-gray-600 mt-3 font-medium">No artisans found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Initial state - prompt to search */
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <span className="text-5xl">👷</span>
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
                  <span className="text-5xl">✅</span>
                  <h3 className="text-xl font-semibold text-gray-900 mt-4">Booking Confirmed!</h3>
                  <p className="text-gray-600 mt-2">
                    Your payment is being processed via Paystack and will be held safely in escrow. {bookingArtisan.name} will be notified to accept your request.
                  </p>
                  <p className="text-sm text-amber-600 mt-2">
                    Payment will be automatically released to the artisan's bank account once the work is completed.
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
                            <span>⭐ {bookingArtisan.rating.toFixed(1)}</span>
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
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₦)</label>
                        <input
                          type="number"
                          value={bookingAmount}
                          onChange={(e) => setBookingAmount(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Escrow Payment Info */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔒</span>
                        <h4 className="text-sm font-semibold text-amber-800">Secure Escrow Payment</h4>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Your payment will be processed securely via <strong>Paystack</strong> and held safely in escrow. The artisan automatically gets paid to their bank account after completing the work — no manual action needed. This ensures transparency and protects both parties.
                      </p>
                      {bookingAmount && parseFloat(bookingAmount) > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
                          <div className="flex justify-between text-xs text-amber-700">
                            <span>Service Amount</span>
                            <span className="font-medium">₦{parseFloat(bookingAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-amber-600">
                            <span>Platform Fee (5%)</span>
                            <span>₦{Math.round(parseFloat(bookingAmount) * 0.05).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-amber-800 font-semibold pt-1 border-t border-amber-200">
                            <span>Artisan Receives After Completion</span>
                            <span>₦{(parseFloat(bookingAmount) - Math.round(parseFloat(bookingAmount) * 0.05)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Powered by</span>
                        <span className="text-sm font-bold text-blue-600">Paystack</span>
                        <span className="text-xs text-gray-400">🔒 PCI Compliant</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'CARD', label: 'Card Payment', icon: '💳', desc: 'Debit/Credit Card' },
                          { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦', desc: 'Pay via bank' },
                        ].map((pm) => (
                          <label
                            key={pm.value}
                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              bookingPaymentMethod === pm.value
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={pm.value}
                              checked={bookingPaymentMethod === pm.value}
                              onChange={(e) => setBookingPaymentMethod(e.target.value)}
                              className="sr-only"
                            />
                            <span className="text-xl">{pm.icon}</span>
                            <span className="text-xs font-medium">{pm.label}</span>
                            <span className="text-[10px] text-gray-400">{pm.desc}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">All payments processed securely by Paystack</p>
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {bookingLoading ? 'Redirecting to Paystack...' : `Pay ₦${parseFloat(bookingAmount || '0').toLocaleString()} & Book`}
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
      setJobs(result.requests);
    } catch (err) {
      console.error('Jobs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleAction = async (jobId: string, action: string) => {
    setActionLoading(jobId);
    try {
      await api.serviceAction(jobId, action);
      await loadJobs();
      onRefresh();
    } catch (err: any) {
      console.error('Action error:', err);
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
            <div key={job.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={job.status} />
                    <span className="text-sm font-medium text-gray-500">{job.serviceType}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span>📍 {job.location}</span>
                    <span>📅 {new Date(job.requestedDate).toLocaleDateString()}</span>
                    <span>🕐 {job.requestedTime}</span>
                    <span>💰 ₦{(job.amount || 0).toLocaleString()}</span>
                    <span>👤 {job.client?.name}</span>
                  </div>
                  {job.paymentStatus === 'HELD_IN_ESCROW' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-xs">🔒</span>
                      <span className="text-xs font-medium text-amber-700">Payment secured in escrow — auto-released when you complete</span>
                    </div>
                  )}
                  {job.paymentStatus === 'RELEASED' && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-xs">✅</span>
                      <span className="text-xs font-medium text-green-700">Payment released to your bank account</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {job.status === 'ACCEPTED' && (
                    <>
                      <button
                        onClick={() => handleAction(job.id, 'start')}
                        disabled={actionLoading === job.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {actionLoading === job.id ? '...' : 'Start'}
                      </button>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-1"
                      >
                        💬 Chat
                      </button>
                    </>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleAction(job.id, 'complete')}
                        disabled={actionLoading === job.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === job.id ? '...' : '✓ Complete'}
                      </button>
                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-1"
                      >
                        💬 Chat
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

function MessagesView({ user }: { user: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const chatStatuses = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
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

    return () => {
      socket.disconnect();
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
        const withProvider = result.requests.filter((r: any) =>
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
          // Merge: keep local messages not yet in server, add server messages
          const localIds = new Set(prev.map(m => m.id));
          const serverIds = new Set(fetched.map((m: any) => m.id));
          const merged = [...prev.filter(m => !serverIds.has(m.id)), ...fetched];
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
    if (!newMessage.trim() || !selectedRequest) return;
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

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Conversation list */}
      <div className="w-80 bg-white rounded-xl border border-gray-100 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
            {selectedRequest && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        {requests.length ? (
          <div className="divide-y divide-gray-50">
            {requests.map((req: any) => (
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedRequest === req.id ? 'bg-orange-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{req.serviceType}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{req.description || 'No description'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {user.role === 'CLIENT' ? `Provider: ${req.provider?.user?.name || 'N/A'}` : `Client: ${req.client?.name || 'N/A'}`}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">No conversations yet</div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col">
        {selectedRequest ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                {requests.find((r: any) => r.id === selectedRequest)?.serviceType || 'Chat'}
              </h3>
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.senderId === user.id
                        ? 'bg-orange-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="font-medium text-xs mb-0.5 opacity-75">{msg.sender?.name}</p>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.senderId === user.id ? 'text-orange-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No messages yet. Start the conversation!</p>
              )}
              {typingUser && (
                <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  {typingUser} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
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

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h3>

        {user.role === 'PROVIDER' && user.provider?.verificationStatus && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-gray-50">
            <span className="text-lg">{user.provider.verificationStatus === 'VERIFIED' ? '✅' : '⏳'}</span>
            <div>
              <p className="font-medium text-gray-900">
                {user.provider.verificationStatus === 'VERIFIED' ? 'Verified Provider' : 'Verification Pending'}
              </p>
              <p className="text-sm text-gray-500">
                Rating: {user.provider.rating} ⭐ ({user.provider.totalReviews} reviews) • {user.provider.completedJobs} jobs completed
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
                  <span>🏦</span>
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
                    <span className="text-green-600">✅</span>
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
            {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <span className="text-4xl">📭</span>
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
