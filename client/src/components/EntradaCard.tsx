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
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card to-card/80 p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-entrada-title">
          Entrada confirmada
        </h2>
        <span
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-wider ${getPlacarClass()}`}
          data-testid="text-placar"
        >
          {placarStatus === "waiting" ? "AGUARDANDO..." : placar}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col rounded-xl bg-muted/20 p-2 border border-muted/10">
          <span className="mb-0.5 text-[10px] font-medium text-muted-foreground">Depois de</span>
          <span className="text-lg font-bold text-foreground tracking-tight" data-testid="text-apos-de">
            {aposDe}
          </span>
        </div>
        <div className="flex flex-col rounded-xl bg-muted/20 p-2 border border-muted/10">
          <span className="mb-0.5 text-[10px] font-medium text-muted-foreground">Cashout</span>
          <span className="text-lg font-bold text-foreground tracking-tight" data-testid="text-cashout">
            {cashout}
          </span>
        </div>
        <div className="flex flex-col rounded-xl bg-muted/20 p-2 border border-muted/10">
          <span className="mb-0.5 text-[10px] font-medium text-muted-foreground">Gale's</span>
          <span className="text-lg font-bold text-foreground tracking-tight" data-testid="text-gales">
            {gales === "--" ? "--" : `${gales} vezes`}
          </span>
        </div>
      </div>
    </div>
  );
}
