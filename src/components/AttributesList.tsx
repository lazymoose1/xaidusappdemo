import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface AttributesListProps {
  attributes: string[];
}

const AttributesList = ({ attributes }: AttributesListProps) => {
  if (attributes.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 px-4 w-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="font-serif text-base text-foreground">Your Attributes</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {attributes.map((attribute, index) => (
          <Badge
            key={index}
            variant="outline"
            className="bg-accent/10 text-accent border-accent/30 px-3 py-1 text-sm font-medium"
          >
            {attribute}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default AttributesList;
