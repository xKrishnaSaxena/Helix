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
            console.log("TRANSFORMING DATA");
            const transformed = await transformWebhookData(
              eventType,
              eventData,
              userTokenAddresses,
              userNFTAddresses,
              userAnyAddresses
            );
            console.log("DATA TRANSFORMED");

            const tableExists = await client.query(
              `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = $1
              )`,
              [transformed.table]
            );
            console.log("TABLE EXISTS");

            if (!tableExists.rows[0].exists) {
              await client.query(`
                CREATE TABLE ${transformed.table} (
                  id SERIAL PRIMARY KEY,
                  data JSONB NOT NULL,
                  created_at TIMESTAMPTZ DEFAULT NOW()
                )
              `);
            }

            console.log("INSERTING DATA");

            await client.query(
              `INSERT INTO ${transformed.table} (data) VALUES ($1)`,
              [transformed.data]
            );

            console.log("BROADCAST RESPONSE");

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
            console.log("COMPLETED");
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
      console.log("ANY");
      return {
        table: "events_any",
        data: {
          ...commonData,
          raw: data,
          type: data.type || "unknown",
          event_type: "events_any",
          transaction_types: type,
        },
      };
    case "nft_bids":
      if (data.nftAddress !== userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("NFT address mismatch in bid event");
      }
      console.log("NFT BIDS");
      console.log(data.bidder);
      console.log(data.amount);
      console.log(data.nftAddress);
      return {
        table: "events_nft_bids",
        data: {
          ...commonData,
          raw: data,
          bidder: data.bidder,
          amount: data.amount,
          currency: data.currency || "SOL",
          nft_address: data.nftAddress,
          marketplace: data.platform || "unknown",
          bid_type: data.bidType || "standard",
          auction_house: data.auctionHouse || null,
          bid_status: data.instructions.some(
            (i: any) => i.parsed?.type === "cancelBid"
          )
            ? "cancelled"
            : "active",
        },
      };

    case "nft_pricing": {
      if (data.nftAddress !== userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("NFT address mismatch in price event");
      }

      return {
        table: "events_nft_prices",
        data: {
          ...commonData,
          nft_address: data.nftAddress,
          sale_price: data.amount,
          currency: data.currency || "SOL",
          seller: data.seller,
          buyer: data.buyer,
          sale_type: data.instructions.some(
            (i: any) => i.program === "mpl_auction_house"
          )
            ? "auction"
            : "direct",
          marketplace: data.platform || "unknown",
          fee_structure: {
            platform_fee: data.fee / 1_000_000_000,
          },
          raw: data,
        },
      };
    }

    case "lending_markets":
      console.log("LENDING MARKETS");
      const relevantTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );
      console.log(relevantTransfer);
      if (!relevantTransfer) {
        throw new Error("No monitored tokens in transaction");
      }
      const loanData = data.accountData.find(
        (a: any) => a.data?.parsed?.type === "loan"
      )?.data?.parsed?.info;
      console.log(loanData);
      return {
        table: "events_lending_offers",
        data: {
          ...commonData,
          lender: loanData?.lender || data.feePayer,
          token_address: relevantTransfer.mint,
          amount: loanData?.amount || 0,
          duration_days: loanData?.duration
            ? Math.floor(loanData.duration / 86400)
            : 0,
          interest_rate: loanData?.apr || "variable",
          protocol: data.source,
          collateral_ratio: loanData?.collateralRatio || 1.5,
          loan_type: loanData?.fixedRate ? "fixed" : "variable",
          raw: data,
        },
      };

    case "token_pricing":
      console.log("TOKEN PRICES");
      const monitoredTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );
      console.log("MONITORED TRANSFER");
      console.log(monitoredTransfer);
      if (!monitoredTransfer) {
        throw new Error("No monitored tokens in price transaction");
      }

      const swapData = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      console.log("SWAP DATA");
      console.log(swapData);
      const pairedToken = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      console.log("PAIRED TOKEN");
      console.log(pairedToken);
      if (!swapData || !pairedToken) {
        throw new Error("Relevant token transfer not found");
      }
      console.log("SWAP DATA");
      console.log(data.accountData);
      const poolAccounts = data.accountData.filter(
        (a: any) => a.account === data.instructions[0].accounts[3]
      );
      const calculatePrice = (
        tokenAmount: number,
        pairedAmount: number
      ): number => {
        if (!tokenAmount || !pairedAmount) return 0;
        return Number((pairedAmount / tokenAmount).toFixed(6));
      };

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
          token_address: monitoredTransfer.mint,
          price: calculatePrice(swapData.tokenAmount, pairedToken.tokenAmount),
          liquidity: calculateLiquidity(poolAccounts),
          swap_direction:
            swapData.fromUserAccount === data.feePayer ? "sell" : "buy",
          platform: data.source,
          pool_address: poolAccounts?.account,
          fee_breakdown: {
            protocol_fee: data.fee / 1_000_000_000,
            network_fee:
              data.nativeTransfers?.reduce(
                (sum: number, t: any) => sum + t.amount,
                0
              ) / 1_000_000_000,
          },
          timestamp: new Date(data.timestamp * 1000),
          raw: data,
        },
      };

    default:
      throw new Error(`Unsupported event type: ${type}`);
  }
};
