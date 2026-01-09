import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/client';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, Lock } from 'lucide-react';

interface SetupAccountPageProps {
  token: string;
  onSetupComplete: (user: { id: string; email: string; name: string; role: string }) => void;
  onNavigateToLogin: () => void;
}

const SetupAccountPage: React.FC<SetupAccountPageProps> = ({ token, onSetupComplete, onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ name: string; email: string; companyName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const infoFetched = useRef(false);
  const onSetupCompleteRef = useRef(onSetupComplete);

  // Keep the ref updated
  onSetupCompleteRef.current = onSetupComplete;

  useEffect(() => {
    // Prevent double execution
    if (infoFetched.current) return;
    infoFetched.current = true;

    const fetchAccountInfo = async () => {
      try {
        const info = await authAPI.getSetupAccountInfo(token);
        setAccountInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Token non valido o scaduto');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountInfo();
  }, [token]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Almeno 8 caratteri');
    if (!/[A-Z]/.test(pwd)) errors.push('Almeno una lettera maiuscola');
    if (!/[a-z]/.test(pwd)) errors.push('Almeno una lettera minuscola');
    if (!/[0-9]/.test(pwd)) errors.push('Almeno un numero');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push('Almeno un carattere speciale');
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authAPI.setupAccount(token, password);
      setSuccess(true);
      // Wait a moment before redirecting
      setTimeout(() => {
        onSetupCompleteRef.current(response.user);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la configurazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-blue-600">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Caricamento...
            </h1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/30 p-8">
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Stiamo verificando il tuo invito...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (error && !accountInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-red-500">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Invito Non Valido
            </h1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/30 p-8">
            <div className="text-center space-y-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Il link potrebbe essere scaduto o già utilizzato.
              </p>
              <button
                onClick={onNavigateToLogin}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Torna al Login
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
            Powered by NCode Studio
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-green-500">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Account Configurato!
            </h1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/30 p-8">
            <div className="text-center space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                Il tuo account è stato configurato con successo.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Verrai reindirizzato automaticamente...
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
            Powered by NCode Studio
          </p>
        </div>
      </div>
    );
  }

  // Setup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-blue-600">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Configura il tuo Account
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/30 p-8">
          <div className="text-center mb-6">
            <p className="text-slate-600 dark:text-slate-400">
              Benvenuto, <strong>{accountInfo?.name}</strong>!
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Sei stato invitato a unirti a <strong>{accountInfo?.companyName}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={accountInfo?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci la password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password requirements */}
              {password && passwordErrors.length > 0 && (
                <ul className="mt-2 text-xs text-red-500 space-y-1">
                  {passwordErrors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
              {password && passwordErrors.length === 0 && (
                <p className="mt-2 text-xs text-green-600">Password valida</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Conferma Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Conferma la password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-xs text-red-500">Le password non coincidono</p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || passwordErrors.length > 0 || password !== confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting ? 'Configurazione...' : 'Configura Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onNavigateToLogin}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Hai già un account? Accedi
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          Powered by NCode Studio
        </p>
      </div>
    </div>
  );
};

export default SetupAccountPage;
