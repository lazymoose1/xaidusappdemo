import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, TrendingUp, Users, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MembersPage = () => {
  const navigate = useNavigate();

  const stats = [
    { label: "Total Members", value: "85", icon: Users },
    { label: "Total Balance", value: "45 $LMC", icon: DollarSign },
    { label: "New This Month", value: "12", icon: TrendingUp },
    { label: "Admin Status", value: "5", icon: Users },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Custom header */}
      <header className="bg-primary border-b border-border h-[15vh] fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center h-full relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="display-title text-2xl text-foreground">xaidus</h1>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/20"
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="pt-[calc(15vh+1rem)] px-4 pb-24 space-y-8 max-w-2xl mx-auto">
        {/* Admin Portal Banner */}
        <div>
          <div className="bg-gradient-to-r from-accent to-accent/80 rounded-xl p-8 text-center shadow-medium">
            <h2 className="font-serif text-4xl text-accent-foreground mb-2">Admin Portal</h2>
            <p className="text-accent-foreground/80 text-sm">Manage your community</p>
          </div>
        </div>

        {/* Stimulate Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-16 py-7 text-base font-bold shadow-medium hover:shadow-xl transition-all duration-300"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            STIMULATE
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 text-center bg-background border border-border/50 hover:border-accent/30 transition-colors shadow-soft">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MembersPage;
