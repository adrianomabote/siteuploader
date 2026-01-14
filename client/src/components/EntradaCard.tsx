interface EntradaCardProps {
  placar: string;
  placarStatus: "ganho" | "perda" | "waiting";
  aposDe: string;
  cashout: string;
  gales: string;
  onApostar: () => void;
  onAtivarPush: () => void;
}

export default function EntradaCard({
  placar,
  placarStatus,
  aposDe,
  cashout,
  gales,
  onApostar,
  onAtivarPush,
}: EntradaCardProps) {
  const getPlacarClass = () => {
    if (placarStatus === "ganho") return "bg-primary/20 text-primary border-primary/30";
    if (placarStatus === "perda") return "bg-red-500/20 text-red-500 border-red-500/30";
    return "bg-muted/20 text-muted-foreground border-muted/30";
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-card/80 p-3">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-entrada-title">
          Entrada confirmada
        </h2>
        <span
          className={`rounded-full border px-3 py-1.5 text-sm sm:text-base font-semibold ${getPlacarClass()}`}
          data-testid="text-placar"
        >
          {placar}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex flex-col flex-1">
          <span className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Depois de</span>
          <span className="text-base sm:text-lg font-bold text-foreground" data-testid="text-apos-de">
            {aposDe}
          </span>
        </div>
        <div className="flex flex-col flex-1 border-x border-border/50 px-4 text-center">
          <span className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Tirar no:</span>
          <span className="text-base sm:text-lg font-bold text-foreground" data-testid="text-cashout">
            {cashout}
          </span>
        </div>
        <div className="flex flex-col flex-1 text-right">
          <span className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Tentativas</span>
          <span className="text-base sm:text-lg font-bold text-foreground" data-testid="text-gales">
            {gales}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href="https://media1.placard.co.mz/redirect.aspx?pid=3319&bid=1690"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onApostar}
          className="flex-1 rounded-lg bg-primary px-3 py-3 text-center text-sm sm:text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="button-apostar"
        >
          Apostar
        </a>
      </div>
    </div>
  );
}
