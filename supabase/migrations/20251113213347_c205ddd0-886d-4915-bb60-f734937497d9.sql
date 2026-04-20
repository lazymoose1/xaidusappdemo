-- Create users table (profiles extension)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  archetype TEXT,
  interests TEXT[],
  grade TEXT,
  school_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_date TIMESTAMP WITH TIME ZONE,
  milestones JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  goal_id TEXT,
  content TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  applied BOOLEAN DEFAULT false
);

-- Create interactions table
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for goals table
CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for suggestions table
CREATE POLICY "Users can view their own suggestions"
  ON public.suggestions FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own suggestions"
  ON public.suggestions FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for interactions table
CREATE POLICY "Users can view their own interactions"
  ON public.interactions FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for performance
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_completed ON public.goals(completed);
CREATE INDEX idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX idx_suggestions_goal_id ON public.suggestions(goal_id);
CREATE INDEX idx_interactions_user_id ON public.interactions(user_id);
CREATE INDEX idx_interactions_timestamp ON public.interactions(timestamp DESC);