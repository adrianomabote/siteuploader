interface CTAPushProps {
  onAtivar: () => void;
}

export default function CTAPush({ onAtivar }: CTAPushProps) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-600/20">
          <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <strong className="block text-sm font-bold text-foreground">Ative os alertas!</strong>
          <span className="text-xs text-muted-foreground">
            Para receber os sinais mesmo com o app fechado.
          </span>
        </div>
      </div>
      <button
        onClick={onAtivar}
        className="mt-3 w-full rounded-lg bg-yellow-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-yellow-700"
        data-testid="button-cta-push"
      >
        Ativar notificações
      </button>
    </div>
  );
}
