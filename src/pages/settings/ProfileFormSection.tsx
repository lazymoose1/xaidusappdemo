import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface ProfileFormSectionProps {
  email: string;
  onEmailChange: (v: string) => void;
  username: string;
  onUsernameChange: (v: string) => void;
  fullname: string;
  onFullnameChange: (v: string) => void;
  bio: string;
  onBioChange: (v: string) => void;
  wallet: string;
  onWalletChange: (v: string) => void;
  goals: string;
  onGoalsChange: (v: string) => void;
  social: string;
  onSocialChange: (v: string) => void;
  profileImage: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileFormSection = ({
  email, onEmailChange,
  username, onUsernameChange,
  fullname, onFullnameChange,
  bio, onBioChange,
  wallet, onWalletChange,
  goals, onGoalsChange,
  social, onSocialChange,
  profileImage, onImageChange,
}: ProfileFormSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-foreground font-medium">email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} className="mt-1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm text-foreground font-medium">username</Label>
        <Input id="username" value={username} onChange={(e) => onUsernameChange(e.target.value)} className="mt-1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullname" className="text-sm text-foreground font-medium">full name</Label>
        <Input id="fullname" value={fullname} onChange={(e) => onFullnameChange(e.target.value)} className="mt-1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profileImage" className="text-sm text-foreground font-medium">profile image</Label>
        <div className="mt-1 border-2 border-dashed border-border rounded-md p-8 text-center hover:border-accent transition-colors cursor-pointer">
          <input type="file" id="profileImage" accept="image/*" onChange={onImageChange} className="hidden" />
          <label htmlFor="profileImage" className="cursor-pointer block">
            {profileImage ? (
              <img src={profileImage} alt="Preview" className="max-h-32 mx-auto rounded-lg object-cover" />
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-2 text-accent" />
                <p className="text-accent text-lg">Choose Photo</p>
              </>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm text-foreground font-medium">bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => onBioChange(e.target.value)} className="mt-1 min-h-[100px]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wallet" className="text-sm text-foreground font-medium">Wallet Address</Label>
        <Input id="wallet" value={wallet} onChange={(e) => onWalletChange(e.target.value)} className="mt-1 font-mono text-xs" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goals" className="text-sm text-foreground font-medium">Goals</Label>
        <Textarea id="goals" value={goals} onChange={(e) => onGoalsChange(e.target.value)} className="mt-1 min-h-[100px]" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="social" className="text-sm text-foreground font-medium">Social Connections</Label>
        <Input id="social" value={social} onChange={(e) => onSocialChange(e.target.value)} placeholder="Enter social connections..." className="mt-1" />
      </div>
    </div>
  );
};

export default ProfileFormSection;
