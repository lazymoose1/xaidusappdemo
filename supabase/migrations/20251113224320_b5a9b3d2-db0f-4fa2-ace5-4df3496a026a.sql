-- Trigger types regeneration by updating harmless table comments
COMMENT ON TABLE public.users IS 'App profiles table for authenticated users v2';
COMMENT ON TABLE public.goals IS 'User goals table v2';
COMMENT ON TABLE public.suggestions IS 'AI suggestions linked to users and optional goals v2';
COMMENT ON TABLE public.interactions IS 'User interaction logs for analytics v2';