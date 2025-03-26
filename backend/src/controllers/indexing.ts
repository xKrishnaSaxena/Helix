import { Request, Response } from "express";
import pool from "../db/dbSetup";
import Joi from "joi";
import { setupHeliusWebhooks } from "../services/helius";

const preferenceSchema = Joi.object({
  category: Joi.string()
    .valid("nft_bids", "nft_pricing", "lending_markets", "token_pricing", "any")
    .required(),
  config: Joi.object({
    nftAddresses: Joi.array().items(Joi.string()).optional(),
    tokenAddresses: Joi.array().items(Joi.string()).optional(),
    anyAddresses: Joi.array().items(Joi.string()).optional(),
  }).required(),
  transactionTypes: Joi.array().items(Joi.string()).required(),
});
export const setIndexingPreferences = async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { network, categories } = req.body;

  const userId = req.user.id;

  try {
    const { error } = Joi.array().items(preferenceSchema).validate(categories);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    await pool.query("BEGIN");
    await pool.query("DELETE FROM indexing_preferences WHERE user_id = $1", [
      userId,
    ]);

    const addresses = categories.flatMap((category: any) => {
      const {
        nftAddresses = [],
        tokenAddresses = [],
        anyAddresses = [],
      } = category.config;
      return [...nftAddresses, ...tokenAddresses, ...anyAddresses];
    });
    const categoriesArray = categories.map(
      (category: any) => category.category
    );
    const transactionTypes = categories.flatMap((c: any) => c.transactionTypes);
    const mergedConfig = { addresses };

    await pool.query(
      `INSERT INTO indexing_preferences 
       (user_id, config, transaction_types,network,categories) 
       VALUES ($1, $2, $3,$4,$5)`,
      [userId, mergedConfig, transactionTypes, network, categoriesArray]
    );

    await pool.query("COMMIT");

    await setupHeliusWebhooks(userId, network);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
