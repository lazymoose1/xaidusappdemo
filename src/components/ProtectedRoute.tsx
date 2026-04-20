import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import BrandWordmark from '@/components/BrandWordmark';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="p-5 rounded-[1.75rem] bg-white/[0.04] shadow-strong backdrop-blur-md border border-white/10 animate-pulse">
            <BrandWordmark compact className="scale-105" />
          </div>
          <div className="flex flex-col items-center gap-3 w-64">
            <div className="text-sm text-white/70">Loading your Xaidus space...</div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-white via-zinc-300 to-zinc-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" 
                   style={{ 
                     width: '60%',
                     animation: 'loading 1.5s ease-in-out infinite'
                   }} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
