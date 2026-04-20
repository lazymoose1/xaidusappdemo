import { Bell, Compass, Home, LayoutGrid, MessageSquare, Search, Settings, Users } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'teen';
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = useMemo(() => {
    if (role === "parent") {
      return [
        { type: "link" as const, path: "/", label: "home", icon: Home },
        { type: "link" as const, path: "/notifications", label: "alerts", icon: Bell },
        { type: "link" as const, path: "/dashboard", label: "snapshot", icon: LayoutGrid },
        { type: "link" as const, path: "/settings/parent", label: "settings", icon: Settings },
      ];
    }

    return [
      { type: "link" as const, path: "/", label: "home", icon: Home },
      { type: "link" as const, path: "/notifications", label: "alerts", icon: Bell },
      { type: "link" as const, path: "/settings", label: "settings", icon: Settings },
      { type: "action" as const, label: "more", icon: Compass },
    ];
  }, [role]);

  const moreLinks = useMemo(() => {
    const base = [
      { path: "/search", label: "Search", icon: Search, description: "Browse people, goals, and ideas." },
      { path: "/forums", label: "Forums", icon: Users, description: "Community conversations and questions." },
      { path: "/messages", label: "Messages", icon: MessageSquare, description: "Direct conversations and group threads." },
    ];

    if (role === "parent") {
      return [
        { path: "/settings/parent", label: "Parent settings", icon: Settings, description: "Account, role, and sign out." },
        { path: "/parent-portal", label: "Parent portal", icon: LayoutGrid, description: "Deeper view into connected teens." },
        ...base,
      ];
    }

    return base;
  }, [role]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-black/92 border-t border-white/10 z-50 h-[15vh] min-h-[72px] flex items-center backdrop-blur-xl">
        <div className="flex justify-around items-center h-full px-2 w-full">
          {navItems.map((item) => {
            const isActive = item.type === "link" && location.pathname === item.path;

            if (item.type === "action") {
              return (
                <button
                  key={item.label}
                  aria-label={item.label}
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300">
                    <item.icon className="w-4 h-4 transition-colors duration-300 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] mt-1 transition-colors duration-300 text-muted-foreground truncate max-w-full uppercase tracking-[0.16em]">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300"
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  isActive ? "bg-white text-black shadow-soft" : "bg-transparent"
                }`}>
                  <item.icon className={`w-4 h-4 transition-colors duration-300 ${
                    isActive ? "text-black" : "text-muted-foreground"
                  }`} />
                </div>
                <span className={`text-[10px] mt-1 transition-colors duration-300 truncate max-w-full uppercase tracking-[0.16em] ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
            <DialogDescription>
              Secondary spaces are still here, but your main loop stays focused on progress first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {moreLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  setMoreOpen(false);
                  navigate(link.path);
                }}
                className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <link.icon className="w-4 h-4 text-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">{link.label}</p>
                    <p className="text-xs text-muted-foreground break-words">{link.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BottomNav;
