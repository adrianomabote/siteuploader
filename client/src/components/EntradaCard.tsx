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
    <div className="rounded-2xl border border-white/5 bg-[#121821] p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-[#94a3b8]" data-testid="text-entrada-title">
          Entrada confirmada
        </h2>
        <span
          className="rounded-full bg-[#1e293b]/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90"
          data-testid="text-placar"
        >
          {placarStatus === "waiting" ? "AGUARDANDO..." : placar}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col rounded-xl bg-[#1e293b]/30 p-3 border border-white/5">
          <span className="mb-1 text-[11px] font-medium text-[#64748b]">Depois de</span>
          <span className="text-xl font-black text-white tracking-tight" data-testid="text-apos-de">
            {aposDe}
          </span>
        </div>
        <div className="flex flex-col rounded-xl bg-[#1e293b]/30 p-3 border border-white/5">
          <span className="mb-1 text-[11px] font-medium text-[#64748b]">Cashout</span>
          <span className="text-xl font-black text-white tracking-tight" data-testid="text-cashout">
            {cashout}
          </span>
        </div>
        <div className="flex flex-col rounded-xl bg-[#1e293b]/30 p-3 border border-white/5">
          <span className="mb-1 text-[11px] font-medium text-[#64748b]">Gale's</span>
          <span className="text-xl font-black text-white tracking-tight" data-testid="text-gales">
            {gales === "--" ? "--" : `${gales} vezes`}
          </span>
        </div>
      </div>
    </div>
  );
}
