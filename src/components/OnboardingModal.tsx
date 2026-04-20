import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Users, Eye, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Users,
      title: "Welcome to Xaidus",
      description: "Xaidus is a teen-led daily operating system designed around trust, check-ins, and calmer support for families and educators.",
    },
    {
      icon: Shield,
      title: "Choose Your Role",
      description: "You can use Xaidus as a teen, parent, educator, or admin. Your role determines what features you can access. You can change this anytime in Settings.",
    },
    {
      icon: CheckCircle,
      title: "Earn Attributes",
      description: "Complete goals to earn attributes that represent your achievements! Each completed goal rewards you with unique attributes like 'Creative', 'Determined', or 'Leader'. Track your progress in the crystal ball meter.",
    },
    {
      icon: Eye,
      title: "Parent Portal",
      description: "If you're a parent or educator, you can access insights about teen activity by long-pressing the + button. This helps you support healthy media habits through conversation, not surveillance.",
    },
    {
      icon: CheckCircle,
      title: "You're All Set!",
      description: "Start exploring feeds, connect with others, and enjoy a balanced social experience. Remember: we're here to support healthy relationships with technology.",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      sessionStorage.setItem('onboardingSeen', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('onboardingSeen', 'true');
    onClose();
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-accent" />
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          <DialogTitle className="font-serif text-2xl text-center mb-4 break-words">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-center break-words whitespace-normal">
            {currentStep.description}
          </DialogDescription>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4 flex-shrink-0">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === step ? 'bg-accent' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <>
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Next
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              Get Started
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
