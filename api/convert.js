// Vercel serverless function
// Keeps the API key on the server, the browser never sees it

const SYSTEM = `You are an experienced art director who helps freelancers turn vague, rambling client briefs into a clear technical spec.

Respond with VALID JSON ONLY, no markdown formatting, no explanation before or after. Format:
{
  "goal": "a short one-sentence statement of the project's goal",
  "audience": "target audience if it can be inferred from the brief, otherwise a reasonable guess marked as (assumption)",
  "must_have": ["list", "of", "required elements that are explicitly or implicitly mentioned"],
  "style": "style direction that can be extracted from the brief",
  "constraints": ["deadlines, budget, and other constraints if any — otherwise an empty array"],
  "open_questions": ["3-5 specific questions to ask the client before starting work, because the brief doesn't cover them"]
}
Write in English, concretely, no filler. If something isn't in the brief, don't invent it — flag it as an open question instead.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brief } = req.body || {};
  if (!brief || typeof brief !== 'string' || brief.trim().length < 5) {
    return res.status(400).json({ error: 'Brief is empty or too short' });
  }
  if (brief.length > 6000) {
    return res.status(400).json({ error: 'Brief is too long (max ~6000 characters)' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM,
        messages: [{ role: 'user', content: brief }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'AI service error, please try again' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
