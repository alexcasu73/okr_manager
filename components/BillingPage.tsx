import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  X,
  Loader2,
  CreditCard,
  Calendar,
  ExternalLink,
  AlertCircle,
  Zap,
  Users,
  Target,
  Key
} from 'lucide-react';
import { billingAPI, subscriptionAPI, PricingInfo, SubscriptionInfo } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Check for success parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get('success') === 'true';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricingData, subscriptionData] = await Promise.all([
        billingAPI.getPricing().catch(() => null),
        subscriptionAPI.getInfo()
      ]);
      setPricing(pricingData);
      setSubscription(subscriptionData);
    } catch (err) {
      setError('Errore nel caricamento dei dati di fatturazione');
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceType: 'monthly' | 'yearly') => {
    setCheckoutLoading(priceType);
    setError(null);
    try {
      const { url } = await billingAPI.createCheckoutSession(priceType);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione della sessione di pagamento');
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { url } = await billingAPI.createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'apertura del portale di gestione');
      setPortalLoading(false);
    }
  };

  const isPremium = subscription?.tier === 'premium';

  // OKR Manager specific features
  const freeFeatures = [
    { name: '1 Admin', icon: Users, available: true },
    { name: '1 Lead', icon: Users, available: true },
    { name: '1 User', icon: Users, available: true },
    { name: '1 OKR per ruolo', icon: Target, available: true },
    { name: '2 Key Results per OKR', icon: Key, available: true },
  ];

  const premiumFeatures = [
    { name: 'Utenti illimitati', icon: Users, available: true },
    { name: 'OKR illimitati', icon: Target, available: true },
    { name: 'Key Results illimitati', icon: Key, available: true },
    { name: 'Supporto prioritario', icon: Zap, available: true },
    { name: 'Analytics avanzate', icon: Target, available: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Fatturazione e Abbonamento
      </h1>

      {/* Success message */}
      {isSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-300">
            Pagamento completato con successo! Il tuo abbonamento Premium è ora attivo.
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Current subscription status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Piano Attuale
          </h2>
          {isPremium ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full">
              <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Premium</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
              <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Free</span>
            </div>
          )}
        </div>

        {isPremium && subscription?.limits && (
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Nessun limite</span>
            </div>
          </div>
        )}

        {isPremium ? (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Gestisci Abbonamento
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Passa a Premium per sbloccare tutte le funzionalità
          </p>
        )}
      </div>

      {/* Usage stats for free tier */}
      {!isPremium && subscription?.usage && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Utilizzo Corrente
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {subscription.usage.users?.admins || 0}/1
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Admin</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {subscription.usage.users?.leads || 0}/1
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Lead</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {subscription.usage.users?.users || 0}/1
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">User</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {subscription.usage.totals?.okrs || 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">OKR Totali</div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing plans */}
      {!isPremium && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Free</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">€0</span>
              <span className="text-slate-500 dark:text-slate-400">/mese</span>
            </div>
            <ul className="space-y-3 mb-6">
              {freeFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <feature.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="text-slate-600 dark:text-slate-300">{feature.name}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Piano Attuale
            </button>
          </div>

          {/* Premium Plans */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-blue-700/50 p-6 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
              Consigliato
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Premium</h3>
            </div>

            {/* Price options */}
            <div className="space-y-3 mb-4">
              {pricing?.plans?.map(plan => (
                <div key={plan.id} className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    €{plan.price.toFixed(2)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    /{plan.interval === 'month' ? 'mese' : 'anno'}
                  </span>
                  {plan.savings && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      Risparmia {plan.savings}
                    </span>
                  )}
                </div>
              )) || (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">€4.99</span>
                    <span className="text-slate-500 dark:text-slate-400">/mese</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">€49.99</span>
                    <span className="text-slate-500 dark:text-slate-400">/anno</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      Risparmia 17%
                    </span>
                  </div>
                </>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {premiumFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-slate-700 dark:text-slate-200">{feature.name}</span>
                </li>
              ))}
            </ul>

            {/* Upgrade buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={checkoutLoading !== null}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'yearly' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Passa a Premium Annuale
                  </>
                )}
              </button>
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={checkoutLoading !== null}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'monthly' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Passa a Premium Mensile'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium benefits when already premium */}
      {isPremium && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-amber-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Vantaggi Premium Attivi
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {premiumFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <feature.icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing notice */}
      {!pricing?.configured && !isPremium && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                Sistema di pagamento non configurato
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Contatta l'amministratore per configurare Stripe e abilitare i pagamenti.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
