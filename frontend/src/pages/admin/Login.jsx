import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(88,28,135,0.15)_0%,_transparent_70%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />

      {/* Back link */}
      <div className="relative z-20 p-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-all duration-200 hover:-translate-x-1 text-sm cursor-pointer"
        >
          <i className="bx bx-chevron-left text-lg"></i>
          Back
        </button>
      </div>

      {/* Centered login form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 -mt-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-slate-800/80 border border-slate-700/50 rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 mb-6 backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7 text-cyan-400"
              >
                <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path>
                <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path>
              </svg>
            </div>
            <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
              Welcome back!
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Sign in to <span className="text-slate-400">FloodWatch</span> Admin
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <i className="bx bx-error-circle text-base shrink-0"></i>
                {error}
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent border border-slate-700/60 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-600 focus:border-slate-500 focus:outline-none transition-colors"
                placeholder="Your email"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-transparent border border-slate-700/60 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-600 focus:border-slate-500 focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-slate-950 font-medium py-3 rounded-xl hover:bg-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_14px_0_rgba(255,255,255,0.25)] text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-95"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="bx bx-loader-alt animate-spin text-base"></i>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-slate-600 text-xs mt-8">
            FloodWatch Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
}
