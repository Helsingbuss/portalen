// src/components/StatusBadge.tsx
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";

interface StatusBadgeProps {
  status: "inkommen" | "besvarad" | "godkand" | "makulerad";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<
    StatusBadgeProps["status"],
    { text: string; className: string; icon: JSX.Element }
  > = {
    inkommen: {
      text: "Inkommen",
      className: "bg-blue-100 text-blue-800 border border-blue-300",
      icon: <FileText className="w-4 h-4 mr-1" />,
    },
    besvarad: {
      text: "Besvarad",
      className: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      icon: <Clock className="w-4 h-4 mr-1" />,
    },
    godkand: {
      text: "GodkÃ¤nd",
      className: "bg-green-100 text-green-800 border border-green-300",
      icon: <CheckCircle className="w-4 h-4 mr-1" />,
    },
    makulerad: {
      text: "Makulerad",
      className: "bg-red-100 text-red-800 border border-red-300",
      icon: <XCircle className="w-4 h-4 mr-1" />,
    },
  };

  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${styles[status].className}`}
    >
      {styles[status].icon}
      {styles[status].text}
    </span>
  );
}

