import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onCustom?: { label: string; action: () => void; icon?: React.ReactNode }[];
  isLoading?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}

export function ActionButtons({
  onEdit,
  onDelete,
  onCustom,
  isLoading = false,
  editLabel = "সম্পাদনা",
  deleteLabel = "মুছে দিন",
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Edit className="h-4 w-4 mr-1" />
          {editLabel}
        </Button>
      )}
      {onDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleteLabel}
        </Button>
      )}
      {onCustom?.map((btn, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={btn.action}
          disabled={isLoading}
        >
          {btn.icon && <span className="mr-1">{btn.icon}</span>}
          {btn.label}
        </Button>
      ))}
    </div>
  );
}
