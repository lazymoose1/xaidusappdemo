import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client helper
function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

interface TinyRequest {
  action: 'analyze_goal' | 'get_suggestion' | 'log_interaction' | 'get_user_data' | 'add_goal' | 'get_goals' | 'delete_goal' | 'complete_goal' | 'add_milestone';
  userId: string;
  userToken?: string;
  goal?: any;
  goalId?: string;
  milestone?: any;
  interactionType?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = getSupabaseClient(authHeader);
    const body: TinyRequest = await req.json();
    const { action, userId, goal, goalId, milestone, interactionType, metadata } = body;

    console.log('Received action:', action, 'for user:', userId);

    switch (action) {
      case 'get_user_data': {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        const { data: userGoals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId);
        
        const activeGoals = (userGoals || []).filter(g => !g.completed);
        const completedCount = (userGoals || []).filter(g => g.completed).length;
        
        return new Response(JSON.stringify({ 
          attributes: userData?.interests || ['Creative', 'Determined', 'Leader'],
          progress: userData?.last_active ? 50 : 0,
          goals: activeGoals.map(g => ({ 
            id: g.goal_id, 
            title: g.title, 
            progress: g.completed ? 100 : 50
          })),
          completedGoals: completedCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_goal': {
        const newGoalId = crypto.randomUUID();
        
        const { error } = await supabase
          .from('goals')
          .insert({
            goal_id: newGoalId,
            user_id: userId,
            title: goal.title || goal,
            description: goal.description || '',
            category: goal.category || 'general',
            milestones: [],
            completed: false,
          });
        
        if (error) {
          console.error('Error adding goal:', error);
          throw error;
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          goalId: newGoalId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_goals': {
        const { data: userGoals, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching goals:', error);
          throw error;
        }
        
        return new Response(JSON.stringify({ 
          goals: (userGoals || []).map(g => ({
            goalId: g.goal_id,
            userId: g.user_id,
            title: g.title,
            description: g.description,
            category: g.category,
            progress: g.completed ? 100 : 50,
            completed: g.completed,
            createdAt: g.created_at,
            completedAt: g.completed_at,
            milestones: g.milestones || []
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_goal': {
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('goal_id', goalId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error deleting goal:', error);
          throw error;
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'complete_goal': {
        const { error } = await supabase
          .from('goals')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString() 
          })
          .eq('goal_id', goalId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error completing goal:', error);
          throw error;
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_milestone': {
        const { data: currentGoal } = await supabase
          .from('goals')
          .select('milestones')
          .eq('goal_id', goalId)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!currentGoal) {
          throw new Error('Goal not found');
        }
        
        const milestones = currentGoal.milestones || [];
        milestones.push({
          text: milestone.text || milestone,
          createdAt: new Date().toISOString()
        });
        
        const { error } = await supabase
          .from('goals')
          .update({ milestones })
          .eq('goal_id', goalId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error adding milestone:', error);
          throw error;
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze_goal': {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        const { data: userGoals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId);

        const suggestion = `Great pick${goal?.title ? `: "${goal.title}"` : ''}. Break it into one 20-minute action you can do today and one small check-in on Friday. Share progress with a parent or friend.`;

        const suggestionId = crypto.randomUUID();
        await supabase
          .from('suggestions')
          .insert({
            suggestion_id: suggestionId,
            user_id: userId,
            goal_id: goalId,
            content: suggestion,
            type: 'goal_analysis',
            applied: false,
          });

        return new Response(JSON.stringify({ 
          suggestion,
          suggestionId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_suggestion': {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        const { data: userGoals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', false);

        const suggestion = `Quick nudge: pick one tiny task you can finish today. If you’re stuck, ask “what’s the 10-minute version?” then do it. You’ve got this.`;

        const suggestionId = crypto.randomUUID();
        await supabase
          .from('suggestions')
          .insert({
            suggestion_id: suggestionId,
            user_id: userId,
            content: suggestion,
            type: 'general',
            applied: false,
          });

        return new Response(JSON.stringify({ suggestion }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'log_interaction': {
        const interactionId = crypto.randomUUID();
        
        await supabase
          .from('interactions')
          .insert({
            interaction_id: interactionId,
            user_id: userId,
            action: interactionType || 'unknown',
            metadata: metadata || {},
          });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Unknown action' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in tiny-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});