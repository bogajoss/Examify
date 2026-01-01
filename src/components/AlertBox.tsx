import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";

type AlertType = "error" | "success" | "info" | "warning";

interface AlertBoxProps {
  type: AlertType;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function AlertBox({ type, title, description, icon }: AlertBoxProps) {
  const iconMap = {
    error: <AlertCircle className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
  };

  const classMap = {
    error: "border-destructive bg-destructive/10",
    success: "border-success bg-success/10",
    info: "border-blue-500 bg-blue-500/10",
    warning: "border-warning bg-warning/10",
  };

  return (
    <Alert className={classMap[type]}>
      <div className="flex gap-3">
        <div>{icon || iconMap[type]}</div>
        <div>
          <p className="font-semibold">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </Alert>
  );
}
