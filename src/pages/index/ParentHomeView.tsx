import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { triggerHaptic } from "@/utils/haptics";

interface ParentHomeViewProps {
  onNewPost: () => void;
}

const ParentHomeView = ({ onNewPost }: ParentHomeViewProps) => {
  const navigate = useNavigate();

  return (
    <div className="mt-6 space-y-4 w-full">
      <Button
        size="lg"
        onClick={() => navigate("/parent-portal")}
        className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-12 py-5 font-bold shadow-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 w-full max-w-[300px] h-12 text-2xl"
      >
        PARENT PORTAL
      </Button>

      <Button
        size="lg"
        onClick={() => navigate("/dashboard")}
        className="bg-accent/80 hover:bg-accent/70 text-accent-foreground rounded-full px-12 py-5 font-bold shadow-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 w-full max-w-[300px] h-12 text-2xl"
      >
        DASHBOARD
      </Button>

      <Button
        size="lg"
        onClick={() => {
          triggerHaptic("medium");
          onNewPost();
        }}
        className="bg-primary hover:bg-primary/90 text-accent rounded-full px-12 py-5 font-bold shadow-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 w-full max-w-[300px] h-12 text-2xl"
      >
        NEW POST
      </Button>
    </div>
  );
};

export default ParentHomeView;
