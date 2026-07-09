// Vercel serverless function
// Держит API-ключ на сервере, браузер его никогда не видит

const SYSTEM = `Ты — опытный арт-директор, который помогает фрилансерам превращать сырые, расплывчатые брифы клиентов в чёткое техническое задание.
Отвечай ТОЛЬКО валидным JSON, без markdown-разметки, без пояснений до или после. Формат:
{
  "goal": "краткая формулировка цели проекта одним предложением",
  "audience": "целевая аудитория, если угадывается из брифа, иначе разумное предположение с пометкой (предположение)",
  "must_have": ["список", "обязательных", "элементов, которые явно или неявно упомянуты"],
  "style": "стилистические ориентиры, которые можно вычленить из брифа",
  "constraints": ["сроки, бюджет и другие ограничения, если есть — иначе пустой массив"],
  "open_questions": ["3-5 конкретных вопросов клиенту, которые нужно задать до старта работы, потому что бриф их не раскрывает"]
}
Пиши по-русски, конкретно, без воды. Если в брифе чего-то нет — не выдумывай факты, а помечай это как открытый вопрос.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brief } = req.body || {};
  if (!brief || typeof brief !== 'string' || brief.trim().length < 5) {
    return res.status(400).json({ error: 'Пустой или слишком короткий бриф' });
  }
  if (brief.length > 6000) {
    return res.status(400).json({ error: 'Слишком длинный бриф (максимум ~6000 символов)' });
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
      return res.status(502).json({ error: 'Ошибка на стороне AI-сервиса, попробуйте ещё раз' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
