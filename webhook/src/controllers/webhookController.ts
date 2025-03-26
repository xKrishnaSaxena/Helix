import { Request, Response } from "express";
import { getUserDatabase } from "../services/indexer";
import pool from "../db/dbSetup";

export const handleWebhook = async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const eventTypes = (req.query.type as string)?.split(",") || [];
  const eventDataArray = req.body;
  console.log(eventTypes);

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
    const userNFTAddresses = userConfig?.nftAddresses || [];
    const userTokenAddresses = userConfig?.tokenAddresses || [];
    const userAnyAddresses = userConfig?.anyAddresses || [];

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
          } catch (error: any) {
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
  console.log("TIME");
  console.log(data.timestamp);
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
      return {
        table: "any",
        data: {
          ...commonData,
          raw: data,
          event_type: data.type,
          transaction_types: data.transactionTypes,
        },
      };
    case "nft_bids":
      if (data.nftAddress !== userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("NFT address mismatch in bid event");
      }
      return {
        table: "nft_bids",
        data: {
          ...commonData,
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

    case "nft_prices": {
      if (data.nftAddress !== userNFTAddresses.includes(data.nftAddress)) {
        throw new Error("NFT address mismatch in price event");
      }

      return {
        table: "nft_prices",
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

    case "tokens_to_borrow":
      const relevantTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );
      if (!relevantTransfer) {
        throw new Error("No monitored tokens in transaction");
      }
      const loanData = data.accountData.find(
        (a: any) => a.data?.parsed?.type === "loan"
      )?.data?.parsed?.info;
      return {
        table: "lending_offers",
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

    case "token_prices":
      const monitoredTransfer = data.tokenTransfers.find((t: any) =>
        userTokenAddresses.includes(t.mint)
      );
      if (!monitoredTransfer) {
        throw new Error("No monitored tokens in price transaction");
      }
      const swapData = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      const pairedToken = data.tokenTransfers.find(
        (t: any) => !userTokenAddresses.includes(t.mint)
      );
      if (!swapData || !pairedToken) {
        throw new Error("Relevant token transfer not found");
      }

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
        table: "token_prices",
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
