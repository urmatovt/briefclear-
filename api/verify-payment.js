// Verifies that a transaction with the given TxID actually arrived
// at our USDT (TRC20) address with a sufficient amount.
// Uses the public TronGrid API, no key required.

const USDT_ADDRESS = 'TKLGsd1JnJfW17AxkYCeox4y4ySScJG7PE';
const MIN_AMOUNT = 9; // minimum amount in USDT

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }

  const { txid } = req.body || {};
  if (!txid || typeof txid !== 'string' || txid.trim().length < 10) {
    return res.status(400).json({ valid: false, error: 'Please provide a valid transaction TxID' });
  }

  try {
    const url = `https://api.trongrid.io/v1/accounts/${USDT_ADDRESS}/transactions/trc20?limit=50&only_confirmed=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data) {
      return res.status(200).json({ valid: false, error: 'Could not fetch transactions, try again later' });
    }

    const tx = data.data.find(t => t.transaction_id === txid.trim());

    if (!tx) {
      return res.status(200).json({
        valid: false,
        error: 'Transaction not found. If you just sent it, wait 1-2 minutes and try again.'
      });
    }

    if (tx.to !== USDT_ADDRESS) {
      return res.status(200).json({ valid: false, error: 'This is not a transfer to the correct address' });
    }

    if (tx.token_info?.symbol !== 'USDT') {
      return res.status(200).json({ valid: false, error: 'This is not a USDT transfer' });
    }

    const decimals = tx.token_info?.decimals ?? 6;
    const amount = Number(tx.value) / Math.pow(10, decimals);

    if (amount < MIN_AMOUNT) {
      return res.status(200).json({
        valid: false,
        error: `Transfer amount (${amount} USDT) is less than required ($${MIN_AMOUNT})`
      });
    }

    return res.status(200).json({ valid: true, amount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, error: 'Error verifying the transaction, try again' });
  }
}
