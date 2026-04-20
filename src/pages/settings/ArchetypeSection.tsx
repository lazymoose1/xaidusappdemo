import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ARCHETYPES = [
  { id: "explorer", label: "Explorer" },
  { id: "creator", label: "Creator" },
  { id: "achiever", label: "Achiever" },
  { id: "connector", label: "Connector" },
  { id: "thinker", label: "Thinker" },
  { id: "leader", label: "Leader" },
];

interface ArchetypeSectionProps {
  archetype: string;
  onArchetypeChange: (value: string) => void;
}

const ArchetypeSection = ({ archetype, onArchetypeChange }: ArchetypeSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="archetype" className="text-sm text-foreground font-medium">Archetype</Label>
      <Select value={archetype} onValueChange={onArchetypeChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Select your archetype" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {ARCHETYPES.map((arch) => (
            <SelectItem key={arch.id} value={arch.id} className="capitalize">
              {arch.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ArchetypeSection;
