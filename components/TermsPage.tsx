import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
            Termini di Utilizzo
          </h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              1. Accettazione dei Termini
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Utilizzando il servizio OKRfy, l'utente accetta integralmente i presenti Termini di Utilizzo.
              Se non si accettano questi termini, si prega di non utilizzare il servizio.
              OKRfy è un servizio fornito da NCode Studio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              2. Descrizione del Servizio
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              OKRfy è una piattaforma per la gestione degli Objectives and Key Results (OKR) aziendali.
              Il servizio permette di creare, monitorare e gestire obiettivi a livello aziendale,
              di team e individuali, facilitando l'allineamento e il raggiungimento dei risultati.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              3. Registrazione e Account
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Per utilizzare OKRfy è necessario registrarsi fornendo informazioni accurate e complete.
              L'utente è responsabile di:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Mantenere la riservatezza delle proprie credenziali di accesso</li>
              <li>Tutte le attività che avvengono attraverso il proprio account</li>
              <li>Notificare immediatamente eventuali accessi non autorizzati</li>
              <li>Fornire e mantenere informazioni accurate e aggiornate</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              4. Utilizzo Accettabile
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              L'utente si impegna a non:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
              <li>Violare leggi o regolamenti applicabili</li>
              <li>Caricare contenuti illegali, offensivi o dannosi</li>
              <li>Tentare di accedere a dati di altri utenti senza autorizzazione</li>
              <li>Interferire con il funzionamento del servizio</li>
              <li>Utilizzare il servizio per scopi fraudolenti</li>
              <li>Rivendere o sublicenziare l'accesso al servizio</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              5. Proprietà Intellettuale
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Il servizio OKRfy, inclusi software, design, loghi e contenuti, è di proprietà di
              NCode Studio ed è protetto dalle leggi sulla proprietà intellettuale.
              I dati inseriti dall'utente rimangono di sua proprietà. L'utente concede a OKRfy
              una licenza limitata per elaborare tali dati al solo fine di erogare il servizio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              6. Disponibilità del Servizio
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              OKRfy si impegna a garantire la massima disponibilità del servizio.
              Tuttavia, non possiamo garantire un funzionamento ininterrotto.
              Ci riserviamo il diritto di sospendere temporaneamente il servizio per manutenzione
              o aggiornamenti, cercando di minimizzare i disagi per gli utenti.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              7. Limitazione di Responsabilità
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              OKRfy è fornito "così com'è". Nei limiti consentiti dalla legge, NCode Studio
              non sarà responsabile per danni indiretti, incidentali o consequenziali derivanti
              dall'uso del servizio. La responsabilità massima sarà limitata all'importo
              pagato dall'utente negli ultimi 12 mesi.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              8. Backup e Recupero Dati
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              OKRfy effettua backup regolari dei dati. Tuttavia, si consiglia agli utenti
              di esportare periodicamente i propri dati importanti.
              In caso di cancellazione dell'account, i dati verranno eliminati definitivamente
              dopo 30 giorni.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              9. Modifiche ai Termini
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Ci riserviamo il diritto di modificare questi Termini di Utilizzo.
              Le modifiche significative verranno comunicate via email o attraverso il servizio.
              L'uso continuato del servizio dopo le modifiche costituisce accettazione
              dei nuovi termini.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              10. Risoluzione
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              L'utente può chiudere il proprio account in qualsiasi momento.
              OKRfy si riserva il diritto di sospendere o terminare l'accesso in caso di
              violazione dei presenti termini, previo avviso quando possibile.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              11. Legge Applicabile
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              I presenti Termini sono regolati dalla legge italiana.
              Per qualsiasi controversia sarà competente il Foro di riferimento
              della sede legale di NCode Studio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              12. Contatti
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Per domande relative ai presenti Termini di Utilizzo, contattare:
              team@ncodestudio.it
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

export default TermsPage;
