// Проверяет ключ, купленный на Gumroad, через их официальный API верификации
// Документация: https://help.gumroad.com/article/76-license-keys

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { licenseKey } = req.body || {};
  if (!licenseKey) {
    return res.status(400).json({ valid: false, error: 'Нет ключа' });
  }

  try {
    const params = new URLSearchParams({
      product_permalink: process.env.GUMROAD_PRODUCT_PERMALINK, // например 'briefclear'
      license_key: licenseKey
    });

    const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(200).json({ valid: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, error: 'Ошибка проверки' });
  }
}
