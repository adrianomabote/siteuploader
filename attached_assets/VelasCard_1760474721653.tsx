interface VelasCardProps {
  velas: number[];
  isAnalyzing: boolean;
}

export default function VelasCard({ velas, isAnalyzing }: VelasCardProps) {
  const getVelaColor = (value: number) => {
    if (value >= 1.0 && value < 2.0) {
      return { bg: "#1e3a5f", fg: "#60a5fa" };
    } else if (value >= 2.0 && value < 10.0) {
      return { bg: "#3b1f5f", fg: "#a855f7" };
    } else if (value >= 10.0) {
      return { bg: "#5f1f3b", fg: "#ec4899" };
    }
    return { bg: "#1a1f2e", fg: "#60a5fa" };
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        {isAnalyzing && (
          <span className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-primary"></span>
          </span>
        )}
        <h3 className="text-base sm:text-lg font-semibold text-foreground" data-testid="text-velas-status">
          Analisando velas
          {isAnalyzing && (
            <span className="ml-2 inline-flex gap-0.5">
              <i className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-foreground" style={{ animationDelay: "0ms" }}></i>
              <i className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-foreground" style={{ animationDelay: "150ms" }}></i>
              <i className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-foreground" style={{ animationDelay: "300ms" }}></i>
            </span>
          )}
        </h3>
      </div>
      <ul className="flex flex-nowrap gap-0.5 pb-2 overflow-x-auto w-full" data-testid="list-velas">
        {velas.map((vela, index) => {
          const colors = getVelaColor(vela);
          return (
            <li
              key={index}
              className="rounded-full px-1 py-0.5 text-[9px] font-bold whitespace-nowrap text-center flex-shrink-0 min-w-[45px]"
              style={{ backgroundColor: colors.bg, color: colors.fg }}
              data-testid={`vela-${index}`}
            >
              {vela.toFixed(2)}x
            </li>
          );
        })}
      </ul>
    </div>
  );
}
