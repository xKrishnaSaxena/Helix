import { FiClock, FiBox, FiShield, FiActivity } from "react-icons/fi";
import { useWebSocket } from "../hooks/useWebsocket";
import { VscArrowSwap } from "react-icons/vsc";

const TransactionIcon = ({ category }: { category: string }) => {
  const iconClass = "w-5 h-5 mr-2";
  switch (category) {
    case "nft_bids":
      return <FiBox className={`${iconClass} text-purple-500`} />;
    case "nft_pricing":
      return <FiActivity className={`${iconClass} text-red-500`} />;
    case "token_pricing":
      return <VscArrowSwap className={`${iconClass} text-green-500`} />;
    case "lending_markets":
      return <FiShield className={`${iconClass} text-blue-500`} />;
    default:
      return <FiClock className={`${iconClass} text-gray-500`} />;
  }
};
const formatAmount = (amount: number, decimals: number = 9) => {
  if (!amount) return "0.0000";
  const divisor = 10 ** decimals;
  return (amount / divisor).toFixed(Math.max(decimals, 9));
};

const TransactionDetails = ({
  category,
  data,
}: {
  category: string;
  data: any;
}) => {
  switch (category) {
    case "token_pricing":
      return (
        <div className="space-y-1">
          {data.platform && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="capitalize">{data.platform}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Swap:</span>
            <span className="font-medium">
              {formatAmount(data.base_token.amount)} {data.base_token.symbol}
              <span className="mx-2">→</span>
              {formatAmount(data.quote_token.amount)} {data.quote_token.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">
              {data.price} {data.quote_token.symbol}/{data.base_token.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Direction:</span>
            <span className="capitalize">{data.swap_direction}</span>
          </div>
        </div>
      );

    case "lending_markets":
      return (
        <div className="space-y-1">
          {data.platform && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="capitalize">{data.platform}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Available:</span>
            <span className="font-medium">
              {formatAmount(data.token.available_to_borrow)} {data.token.symbol}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">APR:</span>
            <span className="font-medium">
              {(data.rates.borrow_apr * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Collateral:</span>
            <span className="font-medium">{data.terms.collateral_ratio}x</span>
          </div>
        </div>
      );

    case "nft_pricing":
      return (
        <div className="space-y-1">
          {data.platform && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="capitalize">{data.platform}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sale Price:</span>
            <span className="font-medium">
              {formatAmount(data.sale_price.gross)} {data.sale_price.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Type:</span>
            <span className="capitalize">{data.sale_type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fees:</span>
            <span className="font-medium">
              {formatAmount(data.fees.platform)} {data.sale_price.currency}
            </span>
          </div>
        </div>
      );

    case "nft_bids":
      return (
        <div className="space-y-1">
          {data.platform && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="capitalize">{data.platform}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Bid Amount:</span>
            <span className="font-medium">
              {formatAmount(data.bid_amount.gross)} {data.bid_amount.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span
              className={`capitalize ${
                data.status === "active" ? "text-green-500" : "text-red-500"
              }`}
            >
              {data.status}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Marketplace:</span>
            <span className="capitalize">{data.marketplace}</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            {data.description || "Transaction executed"}
          </div>
          {data.platform && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform:</span>
              <span className="capitalize">{data.platform}</span>
            </div>
          )}
          {data.type && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Type:</span>
              <span className="capitalize">{data.type}</span>
            </div>
          )}
        </div>
      );
  }
};

export default function TransactionFeed() {
  const { transactions } = useWebSocket();

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-100">
      <div className="p-4 bg-gray-50 border-b rounded-t-xl">
        <h3 className="font-semibold flex items-center">
          <FiClock className="mr-2" />
          Real-Time Transactions
        </h3>
      </div>
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {transactions.map((tx, index) => (
          <div
            key={index}
            className="p-4 bg-gray-50 rounded-lg animate-fade-in-up"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <TransactionIcon category={tx.category} />
                <span className="font-medium capitalize">
                  {tx.category.replace(/_/g, " ")}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(tx.data.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <TransactionDetails category={tx.category} data={tx.data} />

            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <FiClock className="mr-1" />
                  Fee: {tx.data.network_fee?.toFixed(9)} SOL
                </div>
                <span
                  className={`text-sm ${
                    tx.data.success !== false
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {tx.data.success !== false ? "Confirmed" : "Failed"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Waiting for transactions...
          </div>
        )}
      </div>
    </div>
  );
}
