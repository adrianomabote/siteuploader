interface AppBarProps {
  connectionStatus: string;
  isOnline: boolean;
  onlineCount?: number;
}

export default function AppBar({ connectionStatus, isOnline, onlineCount }: AppBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="h-9 w-9 rounded bg-primary"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sistema Cashout</h1>
            <span className="text-sm sm:text-base text-muted-foreground" data-testid="text-connection-status">
              {connectionStatus}
            </span>
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
