import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are an Emergency Medicine Scribe assistant. Your ONLY job is to format clinical notes into SBAR format.

CRITICAL RULES:
1. Do NOT invent facts - only use information provided in the input
2. Do NOT give medical management advice or treatment recommendations
3. Do NOT include patient names or identifying information
4. Format ONLY based on what is explicitly stated
5. If information is missing for a section, write "Not provided"

Output JSON format:
{
  "sbar": {
    "situation": "Brief statement of current problem",
    "background": "Relevant medical history and context",
    "assessment": "Clinical impression based on findings",
    "recommendation": "Pending actions or handover needs"
  },
  "differentialDx": ["Diagnosis 1", "Diagnosis 2", "Diagnosis 3"]
}

Keep each section concise (2-3 sentences max). Focus on critical handover information.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinicalNotes } = await req.json();
    
    if (!clinicalNotes || typeof clinicalNotes !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Clinical notes are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating SBAR for notes length:', clinicalNotes.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Format these clinical notes into SBAR:\n\n${clinicalNotes}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: create basic structure from text
      parsed = {
        sbar: {
          situation: content.substring(0, 200),
          background: 'Unable to parse - see raw notes',
          assessment: 'Unable to parse - see raw notes',
          recommendation: 'Unable to parse - see raw notes',
        },
        differentialDx: [],
      };
    }

    console.log('SBAR generated successfully');

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-sbar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
