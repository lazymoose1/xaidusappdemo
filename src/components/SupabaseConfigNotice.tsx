import { supabaseConfigErrorMessage } from "@/integrations/supabase/client";

export const SupabaseConfigNotice = () => {
  if (!supabaseConfigErrorMessage) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
      <p className="text-sm font-semibold text-amber-200">Deployment setup required</p>
      <p className="mt-1 text-sm leading-6 text-amber-100/90">{supabaseConfigErrorMessage}</p>
    </div>
  );
};
