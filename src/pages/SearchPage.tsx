import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Search as SearchIcon, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filters = [
    { value: "all", label: "All" },
    { value: "posts", label: "Posts" },
    { value: "topics", label: "Topics" },
    { value: "people", label: "People" },
  ];

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log("Searching for:", searchQuery, "Filter:", selectedFilter);
  };

  const handleDiscoverUsers = () => {
    navigate("/members");
  };

  return (
    <div className="min-h-screen pb-16 bg-background">
      {/* Header Bar */}
      <header className="bg-primary border-b border-border h-14 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent hover:bg-background/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-serif text-2xl text-accent">Search</h1>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-accent hover:bg-background/20"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="pt-20 px-4 pb-24 max-w-2xl mx-auto space-y-8">
        {/* Primary Search Card */}
        <Card className="border border-border/50 shadow-medium">
          <CardContent className="p-6 space-y-4">
            <label className="text-sm font-semibold text-muted-foreground block">
              What do you want to know about?
            </label>
            
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Start typing to search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-2xl border-accent/20 focus:border-accent"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Badge
                  key={filter.value}
                  variant={selectedFilter === filter.value ? "default" : "outline"}
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-300 ${
                    selectedFilter === filter.value
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-background text-accent border-accent hover:bg-accent/10"
                  }`}
                  onClick={() => setSelectedFilter(filter.value)}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* When Card */}
        <Card className="border border-border/50 shadow-soft">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">When</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:border-accent/30 transition-colors cursor-pointer">
                <span className="text-sm text-foreground">Any date</span>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:border-accent/30 transition-colors cursor-pointer">
                <span className="text-sm text-foreground">Any time</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleSearch}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-full py-6 text-base font-bold shadow-medium hover:shadow-xl transition-all duration-300"
          >
            <SearchIcon className="w-5 h-5 mr-2" />
            Search
          </Button>
          
          <Button
            onClick={() => navigate('/users')}
            variant="outline"
            className="w-full bg-background border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground rounded-full py-6 text-base font-bold transition-all duration-300"
          >
            Discover Users
          </Button>
        </div>

        {/* Results Placeholder */}
        <div className="pt-6">
          <h3 className="text-lg font-serif text-foreground mb-4">Recent Searches</h3>
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-sm">
              Your recent searches will appear here
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchPage;
