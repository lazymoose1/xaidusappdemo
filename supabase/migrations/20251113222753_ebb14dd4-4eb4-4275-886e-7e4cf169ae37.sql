-- Harmless schema comments to trigger type regeneration
COMMENT ON TABLE public.users IS 'App profiles table for authenticated users';
COMMENT ON TABLE public.goals IS 'User goals table';
COMMENT ON TABLE public.suggestions IS 'AI suggestions linked to users and optional goals';
COMMENT ON TABLE public.interactions IS 'User interaction logs for analytics';