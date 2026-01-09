import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface VerifyEmailPageProps {
  token: string;
  onVerified: (user: { id: string; email: string; name: string; role: string }) => void;
  onNavigateToLogin: () => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ token, onVerified, onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const verificationAttempted = useRef(false);
  const onVerifiedRef = useRef(onVerified);

  // Keep the ref updated
  onVerifiedRef.current = onVerified;

  useEffect(() => {
    // Prevent double execution
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    const verifyEmail = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        setSuccess(true);
        // Wait a moment before redirecting
        setTimeout(() => {
          onVerifiedRef.current(response.user);
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Token non valido o scaduto');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 ${
            isLoading ? 'bg-blue-600' : success ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : success ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <XCircle className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoading ? 'Verifica in corso...' : success ? 'Email Verificata!' : 'Verifica Fallita'}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/30 p-8">
          <div className="text-center space-y-4">
            {isLoading && (
              <p className="text-slate-600 dark:text-slate-400">
                Stiamo verificando la tua email...
              </p>
            )}

            {success && (
              <>
                <p className="text-slate-600 dark:text-slate-400">
                  Il tuo account è stato attivato con successo.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Verrai reindirizzato automaticamente...
                </p>
              </>
            )}

            {error && (
              <>
                <p className="text-red-600 dark:text-red-400">
                  {error}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Il link potrebbe essere scaduto o già utilizzato.
                </p>
                <button
                  onClick={onNavigateToLogin}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Torna al Login
                </button>
              </>
            )}
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

export default VerifyEmailPage;
