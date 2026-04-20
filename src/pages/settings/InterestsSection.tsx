import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Music, Palette, Book, Plane, Camera, Code, Heart } from "lucide-react";

const INTERESTS = [
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "music", label: "Music", icon: Music },
  { id: "art", label: "Art", icon: Palette },
  { id: "reading", label: "Reading", icon: Book },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "coding", label: "Coding", icon: Code },
  { id: "wellness", label: "Wellness", icon: Heart },
];

interface InterestsSectionProps {
  selectedInterests: string[];
  onToggleInterest: (id: string) => void;
}

const InterestsSection = ({ selectedInterests, onToggleInterest }: InterestsSectionProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm text-foreground font-medium">Interests</Label>
      <div className="grid grid-cols-2 gap-3">
        {INTERESTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onToggleInterest(id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedInterests.includes(id)
                ? "border-accent bg-accent/10"
                : "border-border bg-card hover:border-accent/50"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-2 ${
                selectedInterests.includes(id) ? "text-accent" : "text-muted-foreground"
              }`}
            />
            <p className="text-sm font-medium text-foreground">{label}</p>
          </button>
        ))}
      </div>
      {selectedInterests.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedInterests.map((interest) => (
            <Badge key={interest} variant="outline" className="capitalize border-accent/50">
              {interest}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterestsSection;
