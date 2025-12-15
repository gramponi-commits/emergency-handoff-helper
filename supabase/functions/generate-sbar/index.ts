import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Sei un assistente medico specializzato in Pronto Soccorso italiano. Il tuo UNICO compito è formattare le note cliniche nel formato SBAR in ITALIANO.

REGOLE CRITICHE:
1. NON inventare fatti - usa solo le informazioni fornite
2. NON dare consigli di gestione medica o raccomandazioni terapeutiche
3. NON includere nomi di pazienti o informazioni identificative
4. Formatta SOLO in base a ciò che è esplicitamente dichiarato
5. Se manca un'informazione per una sezione, scrivi "Non fornito"
6. RISPONDI SEMPRE IN ITALIANO

ABBREVIAZIONI ITALIANE DA CONOSCERE:
- SFD = Senza Fissa Dimora (paziente senza casa)
- R = Ricovero
- OB/R o OBI/R = Osservazione Breve Intensiva con successivo Ricovero
- OB/D o OBI/D = Osservazione Breve Intensiva con successiva Dimissione
- D = Dimissione
- PS = Pronto Soccorso
- PA = Pressione Arteriosa
- FC = Frequenza Cardiaca
- FR = Frequenza Respiratoria
- SpO2 = Saturazione di ossigeno
- TC = Temperatura Corporea
- GCS = Glasgow Coma Scale
- ECG = Elettrocardiogramma
- Rx = Radiografia
- TC/TAC = Tomografia Computerizzata
- RM/RMN = Risonanza Magnetica
- EGA = Emogasanalisi

ESAMI DI LABORATORIO (vanno in ASSESSMENT/VALUTAZIONE):
- PCR = Proteina C Reattiva (indice di infiammazione)
- WBC/GB = Globuli Bianchi/White Blood Cells
- RBC/GR = Globuli Rossi
- Hb = Emoglobina
- Plt = Piastrine
- Cr = Creatinina
- Az = Azotemia
- Na/K = Sodio/Potassio
- GOT/GPT/AST/ALT = Transaminasi
- Trop/TnI = Troponina
- BNP/proBNP = Peptide Natriuretico
- D-dimero
- PT/INR = Tempo di Protrombina
- aPTT = Tempo di Tromboplastina Parziale Attivata

CATEGORIZZAZIONE SBAR:
- SITUATION (Situazione): Motivo di accesso, sintomo principale attuale, urgenza
- BACKGROUND (Anamnesi): Storia clinica, patologie pregresse, farmaci, allergie
- ASSESSMENT (Valutazione): Esame obiettivo, parametri vitali, TUTTI GLI ESAMI DI LABORATORIO (PCR, WBC, etc.), esami strumentali, ipotesi diagnostica
- RECOMMENDATION (Raccomandazione): Piano proposto (R/D/OBI), consulenze richieste, follow-up

Formato output JSON:
{
  "sbar": {
    "situation": "Descrizione breve del problema attuale",
    "background": "Anamnesi e storia clinica rilevante",
    "assessment": "Valutazione clinica con parametri, esami lab e strumentali",
    "recommendation": "Piano e destinazione (R/D/OBI)"
  },
  "differentialDx": ["Diagnosi 1", "Diagnosi 2", "Diagnosi 3"]
}

Mantieni ogni sezione concisa (2-3 frasi max). Focalizzati sulle informazioni critiche per il passaggio di consegne.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinicalNotes } = await req.json();
    
    if (!clinicalNotes || typeof clinicalNotes !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Le note cliniche sono obbligatorie' }),
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
          { role: 'user', content: `Formatta queste note cliniche in SBAR (in italiano):\n\n${clinicalNotes}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite richieste superato. Riprova più tardi.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti. Aggiungi crediti.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Nessun contenuto nella risposta AI');
    }

    console.log('AI response received, parsing...');

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsed = {
        sbar: {
          situation: content.substring(0, 200),
          background: 'Impossibile analizzare - vedi note originali',
          assessment: 'Impossibile analizzare - vedi note originali',
          recommendation: 'Impossibile analizzare - vedi note originali',
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
