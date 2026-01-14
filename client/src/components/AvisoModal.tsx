interface AvisoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AvisoModal({ isOpen, onClose }: AvisoModalProps) {
  if (!isOpen) return null;

  const handleAcessarPlataforma = () => {
    onClose();
    window.open("https://go.aff.oddsbest.co/3iaj17cv", "_blank");
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

        <h2 className="mb-4 text-center text-xl font-bold uppercase tracking-wide text-yellow-500">
          ⚠️ AVISO IMPORTANTE
        </h2>

        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
          Para usar o sistema corretamente, é necessário estar conectado à casa de apostas onde o sistema funciona. Caso ainda não possua uma conta, crie a sua através do botão abaixo e garanta o acesso completo ao sistema.
        </p>
        {/* Atualizado: 2025-10-21 */}

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
            className="flex-1 rounded-lg bg-primary px-5 py-3.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-primary/90"
            data-testid="button-acessar-plataforma"
          >
            Criar Conta
          </button>
        </div>
      </div>
    </div>
  );
}
