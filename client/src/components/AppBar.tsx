interface AppBarProps {
  connectionStatus: string;
  isOnline: boolean;
  onlineCount?: number;
}

export default function AppBar({ connectionStatus, isOnline, onlineCount }: AppBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img className="h-8 w-8 rounded-lg shadow-md border border-primary/20" src="/icon-192.png" alt="Logo" />
          <div className="flex flex-col">
            <h1 className="text-base font-black text-foreground tracking-tighter uppercase italic leading-none">Sistema Cashout</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
              <span className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase">{connectionStatus}</span>
            </div>
          </div>
        </div>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors flex-shrink-0 ${
            isOnline
              ? "bg-primary/20 text-primary"
              : "bg-yellow-500/20 text-yellow-500"
          }`}
          data-testid="button-status"
        >
          <span className="mr-1">•</span>
          {isOnline ? "Sistema Ativo" : "Reconectando ..."}
          {onlineCount !== undefined && onlineCount > 0 && (
            <span className="ml-1" data-testid="text-online-count">({onlineCount})</span>
          )}
        </button>
      </div>
    </header>
  );
}
