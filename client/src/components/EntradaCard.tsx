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
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-foreground/80 uppercase tracking-tight" data-testid="text-entrada-title">
          Sinal Confirmado
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPlacarClass()}`}
          data-testid="text-placar"
        >
          {placar}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col flex-1">
          <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/70">Depois de</span>
          <span className="text-sm font-black text-foreground" data-testid="text-apos-de">
            {aposDe}
          </span>
        </div>
        <div className="flex flex-col flex-1 border-x border-border/30 px-2 text-center">
          <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/70">Tirar no:</span>
          <span className="text-sm font-black text-foreground" data-testid="text-cashout">
            {cashout}
          </span>
        </div>
        <div className="flex flex-col flex-1 text-right">
          <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/70">Tentativas</span>
          <span className="text-sm font-black text-foreground" data-testid="text-gales">
            {gales}
          </span>
        </div>
      </div>
    </div>
  );
}
