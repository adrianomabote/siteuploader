import { useState } from 'react';
import AvisoModal from '../AvisoModal';

export default function AvisoModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-primary px-4 py-2 text-white"
      >
        Abrir Modal de Aviso
      </button>
      <AvisoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
