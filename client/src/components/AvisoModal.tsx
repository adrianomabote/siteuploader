interface AvisoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AvisoModal({ isOpen, onClose }: AvisoModalProps) {
  if (!isOpen) return null;

  const handleAcessarPlataforma = () => {
    onClose();
    window.open("https://media1.placard.co.mz/redirect.aspx?pid=3319&bid=1690", "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      data-testid="modal-aviso"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border-2 border-primary bg-gradient-to-br from-[#1a2332] to-[#0f1419] p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-2xl leading-none text-muted-foreground transition-colors hover:text-foreground"
          data-testid="button-close-aviso"
        >
          ×
        </button>

        <h2 className="mb-4 text-center text-xl font-bold uppercase tracking-wide text-primary">
          Aviso Importante
        </h2>

        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
          Para utilizar os sinais de forma eficaz, é necessário estar conectado à plataforma de
          apostas oficial. Caso ainda não possua uma conta, recomendamos o acesso através do botão
          abaixo para obter as melhores condições de entrada.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#4b5563] px-5 py-3.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-[#374151]"
            data-testid="button-fechar-aviso"
          >
            Fechar
          </button>
          <button
            onClick={handleAcessarPlataforma}
            className="flex-1 rounded-lg bg-primary px-5 py-3.5 text-sm font-semibold uppercase leading-tight text-white transition-colors hover:bg-primary/90"
            data-testid="button-acessar-plataforma"
          >
            Acessar<br />Plataforma
          </button>
        </div>
      </div>
    </div>
  );
}
