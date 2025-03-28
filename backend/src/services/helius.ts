import axios from "axios";
import sanitizedConfig from "../utils/config";
import pool from "../db/dbSetup";
const HELIUS_API_KEY = sanitizedConfig.HELIUS_API_KEY;
const WEBHOOK_URL =
  "https://d2d2-2405-201-3023-701c-11e0-29f5-81dd-6e42.ngrok-free.app";
export const setupHeliusWebhooks = async (
  userId: string,
  network: "mainnet" | "devnet"
) => {
  const { rows: prefs } = await pool.query(
    `SELECT 
    config->0->'nftAddresses' as nft_addresses,
    config->0->'tokenAddresses' as token_addresses,
    config->0->'anyAddresses' as any_addresses,
    transaction_types,
    categories 
   FROM indexing_preferences 
   WHERE user_id = $1`,
    [userId]
  );

  if (prefs.length === 0) {
    console.log("No indexing preferences found for user", userId);
    return;
  }

  const exisitingWebhooks = await axios.get(
    `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`
  );

  for (const webhook of exisitingWebhooks.data) {
    if (webhook.webhookURL.includes(`userId=${userId}`)) {
      await axios.delete(
        `https://api.helius.xyz/v0/webhooks/${webhook.id}?api-key=${HELIUS_API_KEY}`
      );
    }
  }

  try {
    const mergedPref = prefs[0];

    const accountAddresses = [
      ...(mergedPref.nft_addresses || []),
      ...(mergedPref.token_addresses || []),
      ...(mergedPref.any_addresses || []),
    ].flat();

    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        webhookURL: `${WEBHOOK_URL}/webhook?userId=${userId}&type=${mergedPref.categories}`,
        webhookType: network === "mainnet" ? "enhanced" : "enhancedDevnet",
        accountAddresses: accountAddresses,
        transactionTypes: mergedPref.transaction_types,
      }
    );
    console.log("Created Helius webhook:", response.data);
  } catch (error) {
    console.error("Error creating webhook:", error);
  }
};
