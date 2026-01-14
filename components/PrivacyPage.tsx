import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna alla Home
          </button>
        </div>
      </header>

      {/* Content */}
      <main>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              1. Titolare del Trattamento
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Il Titolare del trattamento dei dati personali è NCode Studio, con sede in Italia.
              Per qualsiasi informazione relativa al trattamento dei dati personali, è possibile
              contattarci all'indirizzo email: team@ncodestudio.it
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              2. Dati Raccolti
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              OKRfy raccoglie i seguenti tipi di dati personali:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Dati di registrazione: nome, email aziendale, password (criptata)</li>
              <li>Dati aziendali: nome dell'azienda, informazioni sui team</li>
              <li>Dati di utilizzo: OKR, Key Results, progressi e attività</li>
              <li>Dati tecnici: indirizzo IP, tipo di browser, sistema operativo</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              3. Finalità del Trattamento
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              I dati personali sono trattati per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Erogazione del servizio OKRfy e gestione dell'account utente</li>
              <li>Invio di comunicazioni relative al servizio (notifiche, aggiornamenti)</li>
              <li>Miglioramento del servizio e analisi statistiche anonime</li>
              <li>Adempimento di obblighi legali e fiscali</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              4. Base Giuridica del Trattamento
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Il trattamento dei dati personali si basa sul consenso dell'utente,
              sull'esecuzione del contratto di servizio e sul legittimo interesse del Titolare
              per quanto riguarda la sicurezza e il miglioramento del servizio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              5. Conservazione dei Dati
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              I dati personali sono conservati per la durata del rapporto contrattuale e,
              successivamente, per il periodo necessario ad adempiere agli obblighi di legge.
              I dati relativi agli OKR archiviati vengono conservati per un massimo di 5 anni.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              6. Condivisione dei Dati
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              I dati personali non vengono venduti a terzi. Possono essere condivisi con:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Fornitori di servizi tecnici (hosting, email) necessari all'erogazione del servizio</li>
              <li>Autorità competenti quando richiesto dalla legge</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              7. Diritti dell'Utente
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              In conformità al GDPR, l'utente ha diritto a:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Accedere ai propri dati personali</li>
              <li>Rettificare dati inesatti o incompleti</li>
              <li>Richiedere la cancellazione dei dati (diritto all'oblio)</li>
              <li>Limitare il trattamento dei dati</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Opporsi al trattamento dei dati</li>
              <li>Revocare il consenso in qualsiasi momento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              8. Sicurezza dei Dati
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Adottiamo misure di sicurezza tecniche e organizzative per proteggere i dati personali,
              tra cui: crittografia SSL/TLS, password hashate, accesso limitato ai dati,
              backup regolari e monitoraggio della sicurezza.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              9. Cookie
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              OKRfy utilizza cookie tecnici necessari al funzionamento del servizio.
              Non utilizziamo cookie di profilazione o di terze parti per finalità pubblicitarie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              10. Contatti
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Per esercitare i propri diritti o per qualsiasi domanda relativa alla privacy,
              è possibile contattarci all'indirizzo: team@ncodestudio.it
            </p>
          </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          © {new Date().getFullYear()} OKRfy. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
