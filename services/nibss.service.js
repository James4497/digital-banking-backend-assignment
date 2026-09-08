const axios = require('axios');
const BASE_URL = process.env.NIBSS_BASE_URL;
const API_KEY = process.env.NIBSS_API_KEY;
const API_SECRET = process.env.NIBSS_API_SECRET;

// Cached in memory so we don't request a new token on every single call —
// tokens are valid for 1 hour, so we only refresh once it's actually expired.
let cachedToken = null;
let tokenExpiresAt = null;

// Fetches a fresh JWT using the API key/secret, or reuses the cached one
// if it hasn't expired yet.
const getToken = async () => {
  const now = Date.now();

  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(`${BASE_URL}/auth/token`, {
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });

  cachedToken = response.data.token;
  tokenExpiresAt = now + 59 * 60 * 1000;

  return cachedToken;
};

// POST /api/transfer
// Sends money to an account at another bank via NibssByPhoenix.
const transferFunds = async (senderAccountNumber, receiverAccountNumber, amount) => {
  const token = await getToken();

  const response = await axios.post(
    `${BASE_URL}/transfer`,
    { from: senderAccountNumber, to: receiverAccountNumber, amount },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

// POST /api/insertBvn
const insertBvn = async (bvn, firstName, lastName, dob, phone) => {
  const token = await getToken();

  const response = await axios.post(
    `${BASE_URL}/insertBvn`,
    { bvn, firstName, lastName, dob, phone },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

// POST /api/insertNin
const insertNin = async (nin, firstName, lastName, dob) => {
  const token = await getToken();

  const response = await axios.post(
    `${BASE_URL}/insertNin`,
    { nin, firstName, lastName, dob },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

// POST /api/validateNin
const validateNin = async (nin) => {
  const token = await getToken();

  const response = await axios.post(
    `${BASE_URL}/validateNin`,
    { nin },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

// POST /api/account/create
// NOTE: kycType must be lowercase ("bvn" or "nin") — uppercase causes a
// 500 error on NibssByPhoenix's end.
const createAccount = async (kycType, kycID, dob) => {
  const token = await getToken();

  const response = await axios.post(
    `${BASE_URL}/account/create`,
    { kycType: kycType.toLowerCase(), kycID, dob },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
};

module.exports = {
  transferFunds,
  insertBvn,
  insertNin,
  validateNin,
  createAccount,
};


