import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/api/client";

type ApiUser = {
  id: string;
  displayName: string;
  email: string;
  handle: string;
  avatarUrl?: string;
  role?: string;
  archetype?: string;
  interests?: string[];
};

const UsersListPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<{ users: ApiUser[] }>("/api/users")
      .then((res) => {
        if (!active) return;
        setUsers(res.users || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Failed to load users");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter((user) =>
      (user.displayName || "").toLowerCase().includes(q) ||
      (user.handle || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-serif text-2xl text-accent">discover users</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-[15vh]">
        {/* Search */}
        <div className="p-4 bg-background border-b border-border/30 sticky top-[15vh] z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Users list */}
        <div className="divide-y divide-border/30">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => navigate(`/profile/${encodeURIComponent(user.displayName || user.id)}`)}
              className="p-4 cursor-pointer hover:bg-muted/20 transition-colors active:scale-[0.99] min-h-[88px] flex items-center"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                      {user.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-base">{user.displayName}</p>
                  <p className="text-muted-foreground text-sm">{user.handle}</p>
                  <p className="text-muted-foreground text-xs mt-1 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Loading users...</div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-base">No users found</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-sm text-red-500">{error}</div>
        )}
      </main>
    </div>
  );
};

export default UsersListPage;
