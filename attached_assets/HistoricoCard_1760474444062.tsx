import { useState } from "react";

export interface HistoricoItem {
  id: string;
  hora: string;
  aposDe: string;
  cashout: string;
  vela: string;
  status: "green" | "loss";
}

interface HistoricoCardProps {
  items: HistoricoItem[];
}

export default function HistoricoCard({ items }: HistoricoCardProps) {
  const [filter, setFilter] = useState<"all" | "green" | "loss">("all");

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  return (
    <div className="rounded-xl border border-card-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground" data-testid="text-historico-title">
          Histórico
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-primary/20 text-primary"
                : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
            }`}
            data-testid="filter-all"
          >
            Tudo
          </button>
          <button
            onClick={() => setFilter("green")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === "green"
                ? "bg-primary/20 text-primary"
                : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
            }`}
            data-testid="filter-green"
          >
            Green
          </button>
          <button
            onClick={() => setFilter("loss")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === "loss"
                ? "bg-primary/20 text-primary"
                : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
            }`}
            data-testid="filter-loss"
          >
            Loss
          </button>
        </div>
      </div>

      <ul className="flex flex-nowrap gap-0.5 pb-2 overflow-x-auto w-full" data-testid="list-historico">
        {filteredItems.map((item) => (
          <li
            key={item.id}
            className={`rounded-full px-1 py-0.5 text-[9px] font-bold whitespace-nowrap text-center flex-shrink-0 min-w-[45px] ${
              item.status === "green"
                ? "bg-primary/20 text-primary"
                : "bg-red-500/20 text-red-500"
            }`}
            data-testid={`historico-${item.id}`}
          >
            {item.status === "green" ? "✅" : "❌"}
          </li>
        ))}
      </ul>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        Puxe para baixo para atualizar
      </div>
    </div>
  );
}
