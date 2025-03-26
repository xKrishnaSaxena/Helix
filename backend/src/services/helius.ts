import axios from "axios";
import sanitizedConfig from "../utils/config";
import pool from "../db/dbSetup";
const HELIUS_API_KEY = sanitizedConfig.HELIUS_API_KEY;
const WEBHOOK_URL =
  "https://8e11-2405-201-3023-701c-8c4f-533a-6095-6ff7.ngrok-free.app";
export const setupHeliusWebhooks = async (
  userId: string,
  network: "mainnet" | "devnet"
) => {
  const { rows: prefs } = await pool.query(
    "SELECT config->'addresses' as addresses, transaction_types ,categories FROM indexing_preferences WHERE user_id = $1",
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

    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        webhookURL: `${WEBHOOK_URL}/webhook?userId=${userId}?type=${mergedPref.categories}`,
        webhookType: network === "mainnet" ? "enhanced" : "enhancedDevnet",
        accountAddresses: mergedPref.addresses || [],
        transactionTypes: mergedPref.transaction_types,
      }
    );
    console.log("Created Helius webhook:", response.data);
  } catch (error) {
    console.error("Error creating webhook:", error);
  }
};
