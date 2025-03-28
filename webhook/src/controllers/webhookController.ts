import { Request, Response } from "express";
import { getUserDatabase } from "../services/indexer";
import pool from "../db/dbSetup";

import fs from "fs";
import path from "path";
export const handleWebhook = async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const eventTypes = (req.query.type as string)?.split(",") || [];
  const eventDataArray = req.body;
  const userPool = await getUserDatabase(userId);

  const client = await userPool.connect();

  try {
    const { rows } = await pool.query(
      `SELECT config,categories FROM indexing_preferences 
       WHERE user_id = $1 `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error("No indexing preferences found for user");
    }
    const userConfig = rows[0].config;

    const userCategories = rows[0].categories;

    const userNFTAddresses = userConfig[0]?.nftAddresses || [];
    const userTokenAddresses = userConfig[0]?.tokenAddresses || [];
    const userAnyAddresses = userConfig[0]?.anyAddresses || [];

    for (const eventData of eventDataArray) {
      await client.query("BEGIN");
      try {
        for (const eventType of eventTypes) {
          if (!userCategories.includes(eventType)) continue;
          try {
            const transformed = await transformWebhookData(
              eventType,
              eventData,
              userTokenAddresses,
              userNFTAddresses,
              userAnyAddresses
            );

            const tableExists = await client.query(
              `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = $1
              )`,
              [transformed.table]
            );

            if (!tableExists.rows[0].exists) {
              await client.query(`
                CREATE TABLE ${transformed.table} (
                  id SERIAL PRIMARY KEY,
                  data JSONB NOT NULL,
                  created_at TIMESTAMPTZ DEFAULT NOW()
                )
              `);
            }

            await client.query(
              `INSERT INTO ${transformed.table} (data) VALUES ($1)`,
              [transformed.data]
            );

            await fetch("http://localhost:4000/broadcast", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId,
                message: {
                  type: "TRANSACTION",
                  data: transformed.data,
                  category: eventType,
                },
              }),
            });
          } catch (error: any) {
            console.log(error.message);
            console.error(`Skipping ${eventType} processing:`, error.message);
            continue;
          }
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
const transformWebhookData = async (
  type: string,
  data: any,
  userTokenAddresses: string[],
  userNFTAddresses: string[],
  userAnyAddresses: string[]
) => {
  const eventTimestamp = data.timestamp
    ? new Date(data.timestamp * 1000)
    : new Date();

  const allAllowedAddresses = [
    ...userAnyAddresses,
    ...userNFTAddresses,
    ...userTokenAddresses,
  ];

  const commonData = {
    event_id: data.signature,
    blockchain: "solana",
    network_fee: data.fee / 1_000_000_000,
    success: !data.transactionError,
    platform: data.source || "unknown",
    timestamp: eventTimestamp,
    allAllowedAddresses: allAllowedAddresses,
  };

  switch (type) {
    case "any":
      const filename = `raw_${data.signature || Date.now()}.json`;

      const rawDataDir = path.join(__dirname, "raw_data_any");
      if (!fs.existsSync(rawDataDir)) fs.mkdirSync(rawDataDir);
      fs.writeFileSync(
        path.join(rawDataDir, filename),
        JSON.stringify(data, null, 2)
      );

      return {
        table: "events_any",
        data: {
          ...commonData,
          raw: data,
          type: data.type || "unknown",
          event_type: "events_any",
          transaction_types: type,
          description: data.description || "Transaction executed",
        },
      };
    case "nft_bids": {
      const filename = `raw_${data.signature || Date.now()}.json`;

      const rawDataDir = path.join(__dirname, "raw_data_nft_bids");
      if (!fs.existsSync(rawDataDir)) fs.mkdirSync(rawDataDir);
      fs.writeFileSync(
        path.join(rawDataDir, filename),
        JSON.stringify(data, null, 2)
      );
      if (!userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("Unauthorized NFT address in bid event");
      }

      const platformFee = data.fee / 1_000_000_000;
      const netBidValue = data.amount - platformFee;

      return {
        table: "events_nft_bids",
        data: {
          ...commonData,
          transaction_hash: data.signature,
          timestamp: new Date(data.timestamp * 1000),
          marketplace: data.source || "unknown",

          nft_address: data.nftAddress,
          token_id: data.tokenId,

          bid_amount: {
            gross: data.amount,
            net: netBidValue,
            currency: data.currency || "SOL",
          },

          status: data.instructions.some(
            (i: any) => i.parsed?.type === "cancelBid"
          )
            ? "cancelled"
            : "active",

          bid_type: data.bidType || "standard",
          auction_house: data.auctionHouseAddress || null,

          market_depth: {
            current_highest_bid: data.currentHighestBid || 0,
            bid_count: data.totalBids || 1,
          },
        },
      };
    }

    case "nft_pricing": {
      const filename = `raw_${data.signature || Date.now()}.json`;

      const rawDataDir = path.join(__dirname, "raw_data_nft_pricing");
      if (!fs.existsSync(rawDataDir)) fs.mkdirSync(rawDataDir);
      fs.writeFileSync(
        path.join(rawDataDir, filename),
        JSON.stringify(data, null, 2)
      );
      if (!userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("Unauthorized NFT address in price event");
      }

      const platformFee = data.fee / 1_000_000_000;
      const netPrice = data.amount - platformFee;

      return {
        table: "events_nft_prices",
        data: {
          ...commonData,
          transaction_hash: data.signature,
          timestamp: new Date(data.timestamp * 1000),
          marketplace: data.source || "unknown",

          nft_address: data.nftAddress,
          token_id: data.tokenId,

          sale_price: {
            gross: data.amount,
            net: netPrice,
            currency: data.currency || "SOL",
          },

          sale_type: data.instructions.some(
            (i: any) => i.program === "mpl_auction_house"
          )
            ? "auction"
            : "direct",

          fees: {
            platform: platformFee,
            royalty: data.royaltyFee || 0,
          },

          price_history: {
            last_sale: data.amount,
            average_7d: null,
          },
        },
      };
    }

    case "lending_markets": {
      const tokenTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );
      if (!tokenTransfer) {
        throw new Error("No relevant token in lending transaction");
      }

      const loanInfo = data.accountData.find(
        (a: any) => a.data?.parsed?.type === "loan"
      )?.data?.parsed?.info;

      const availableToBorrow = loanInfo?.availableAmount || 0;
      const totalLiquidity = loanInfo?.totalDeposits || 0;
      const utilizationRate =
        totalLiquidity > 0
          ? (totalLiquidity - availableToBorrow) / totalLiquidity
          : 0;

      return {
        table: "events_lending_offers",
        data: {
          ...commonData,
          transaction_hash: data.signature,
          timestamp: new Date(data.timestamp * 1000),
          protocol: data.source,

          token: {
            address: tokenTransfer.mint,
            decimals: tokenTransfer.rawTokenAmount?.decimals || 9,
            total_liquidity: totalLiquidity,
            available_to_borrow: availableToBorrow,
          },

          terms: {
            loan_to_value_ratio: loanInfo?.ltv || 0.75,
            collateral_ratio: loanInfo?.collateralRatio || 1.5,
            max_duration_days: loanInfo?.maxDuration
              ? Math.floor(loanInfo.maxDuration / 86400)
              : 0,
          },

          rates: {
            borrow_apr: loanInfo?.borrowApr || 0,
            supply_apr: loanInfo?.supplyApr || 0,
            utilization_rate: Number(utilizationRate.toFixed(4)),
          },

          health_factor: loanInfo?.healthFactor || 1,
          liquidation_threshold: loanInfo?.liquidationThreshold || 0.85,
        },
      };
    }

    case "token_pricing":
      const monitoredTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );

      if (!monitoredTransfer) {
        throw new Error("No monitored tokens in price transaction");
      }

      const swapData = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      const pairedTransfer = data.tokenTransfers.find(
        (t: any) => t.mint !== monitoredTransfer.mint
      );

      const networkFee =
        data.nativeTransfers?.reduce(
          (sum: number, t: any) => sum + t.amount,
          0
        ) / 1_000_000_000;
      if (!pairedTransfer) {
        throw new Error("Paired token not found in swap");
      }

      const pairedToken = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      const tokenPrice =
        pairedTransfer.tokenAmount / monitoredTransfer.tokenAmount;
      const priceUSD = tokenPrice;
      if (!swapData || !pairedToken) {
        throw new Error("Relevant token transfer not found");
      }

      const calculateLiquidity = (accountData: any[]): number => {
        const reserves = accountData
          .filter((a) => a.data?.parsed?.info?.reserves)
          .flatMap((a) => a.data.parsed.info.reserves);

        return reserves.length >= 2 ? Math.sqrt(reserves[0] * reserves[1]) : 0;
      };

      return {
        table: "events_token_prices",
        data: {
          ...commonData,
          transaction_hash: data.signature,
          timestamp: new Date(data.timestamp * 1000),
          platform: data.source,

          base_token: {
            address: monitoredTransfer.mint,
            amount: monitoredTransfer.tokenAmount,
          },
          quote_token: {
            address: pairedTransfer.mint,
            amount: pairedTransfer.tokenAmount,
          },

          price: Number(tokenPrice.toFixed(6)),
          price_usd: Number(priceUSD.toFixed(2)),

          swap_direction:
            monitoredTransfer.fromUserAccount === data.feePayer
              ? "sell"
              : "buy",
          liquidity: calculateLiquidity(data.accountData),

          fees: {
            protocol: data.fee / 1_000_000_000,
            network: networkFee,
          },
        },
      };

    default:
      throw new Error(`Unsupported event type: ${type}`);
  }
};
