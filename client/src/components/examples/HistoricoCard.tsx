import HistoricoCard from '../HistoricoCard';

export default function HistoricoCardExample() {
  const mockItems = [
    { id: "1", hora: "14:25:30", aposDe: "1.50x", cashout: "2.00x", vela: "2.35x", status: "green" as const },
    { id: "2", hora: "14:20:15", aposDe: "1.80x", cashout: "2.50x", vela: "1.85x", status: "loss" as const },
    { id: "3", hora: "14:15:42", aposDe: "1.40x", cashout: "2.00x", vela: "3.10x", status: "green" as const },
  ];

  return <HistoricoCard items={mockItems} />;
}
