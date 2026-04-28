import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './AuthProvider';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error(error?.message || 'Something went wrong');
      },
    },
  },
});

export const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
