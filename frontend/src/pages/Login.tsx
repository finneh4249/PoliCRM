import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { auth } from "../utils/firebase";
import { $user } from "../stores/authStore";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore($user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === "auth/wrong-password") {
        setError('Incorrect password. Try "Forgot Password" to reset it.');
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 6 characters.");
      } else {
        setError(err.message || "Authentication failed");
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
      setShowPasswordReset(false);
      setLoading(false);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Failed to send reset email");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="card p-8 max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">PoliCRM</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isSignUp ? "Create your account" : "Sign in to access the dashboard"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:bg-secondary transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-foreground"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-card text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground transition-colors text-sm placeholder:text-muted-foreground"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground transition-colors text-sm placeholder:text-muted-foreground"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setSuccess("");
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-foreground mb-2">Reset Password</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handlePasswordReset}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground transition-colors mb-4 text-sm placeholder:text-muted-foreground"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setError("");
                  }}
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground hover:bg-secondary transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
