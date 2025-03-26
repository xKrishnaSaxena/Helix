import { useState } from "react";
import {
  FiDatabase,
  FiBox,
  FiDollarSign,
  FiTrendingUp,
  FiGlobe,
  FiAlertTriangle,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../contexts/authContext";
import toast, { Toaster } from "react-hot-toast";

const INDEXING_CATEGORIES = [
  {
    id: "any",
    label: "Any Transaction Type",
    icon: <FiAlertTriangle className="text-red-500" />,
    requires: ["anyAddresses"],
    transactionTypes: ["ANY"],
    description: "Capture all transaction types for specified addresses",
  },
  {
    id: "nft_bids",
    label: "NFT Bids & Listings",
    icon: <FiBox className="text-purple-600" />,
    requires: ["nftAddresses"],
    transactionTypes: [
      "NFT_BID",
      "NFT_BID_CANCELLED",
      "NFT_LISTING",
      "NFT_CANCEL_LISTING",
      "NFT_AUCTION_CREATED",
      "NFT_AUCTION_UPDATED",
    ],
  },
  {
    id: "nft_pricing",
    label: "NFT Market Prices",
    icon: <FiTrendingUp className="text-green-500" />,
    requires: ["nftAddresses"],
    transactionTypes: ["NFT_SALE", "NFT_MINT", "NFT_TRANSFER"],
  },
  {
    id: "lending_markets",
    label: "Lending Markets",
    icon: <FiDollarSign className="text-blue-500" />,
    requires: ["tokenAddresses"],
    transactionTypes: [
      "LOAN",
      "REPAY_LOAN",
      "ADD_TO_POOL",
      "REMOVE_FROM_POOL",
      "LIQUIDATION",
    ],
  },
  {
    id: "token_pricing",
    label: "Token Prices (DEX)",
    icon: <FiTrendingUp className="text-orange-500" />,
    requires: ["tokenAddresses"],
    transactionTypes: ["SWAP", "ADD_LIQUIDITY", "REMOVE_LIQUIDITY"],
  },
];

export default function DataIndexingSetup() {
  const [selectedCategories, setSelectedCategories] = useState<
    Record<string, any>
  >({});
  const [anySelected, setAnySelected] = useState(false);
  const [error, setError] = useState("");
  const [network, setNetwork] = useState<"mainnet" | "devnet">("mainnet");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logout } = useAuth();
  const [dbConfig, setDbConfig] = useState({
    host: "",
    port: "",
    user: "",
    password: "",
    database: "",
  });
  const handleCategoryToggle = (category: any) => {
    if (category.id === "any") {
      if (!selectedCategories[category.id]) {
        setSelectedCategories({
          [category.id]: {
            config: {},
            transactionTypes: ["ANY"],
          },
        });
        setAnySelected(true);
      } else {
        setSelectedCategories({});
        setAnySelected(false);
      }
    } else {
      if (anySelected) {
        setError("Please deselect 'Any Transaction Type' first");
        return;
      }
      setSelectedCategories((prev) => {
        const newSelected = { ...prev };
        if (newSelected[category.id]) {
          delete newSelected[category.id];
        } else {
          newSelected[category.id] = {
            config: {},
            transactionTypes: category.transactionTypes,
          };
        }
        return newSelected;
      });
    }
    setError("");
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        network,
        categories: Object.entries(selectedCategories)
          .filter(([_, val]) => val !== null)
          .map(([id, config]) => ({
            category: id,
            ...config,
          })),
      };
      console.log(payload);
      await toast.promise(
        Promise.all([
          fetch("http://localhost:3000/api/db/saveCredentials", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              host: dbConfig.host,
              port: dbConfig.port,
              user: dbConfig.user,
              password: dbConfig.password,
              dbName: dbConfig.database,
            }),
          }),
          fetch("http://localhost:3000/api/indexing/setPreferences", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(payload),
          }),
        ]).then(async ([res1, res2]) => {
          if (!res1.ok || !res2.ok) {
            throw new Error("Failed to save configuration");
          }
          return await Promise.all([res1.json(), res2.json()]);
        }),
        {
          loading: <b>Saving configuration...</b>,
          success: <b>Configuration saved successfully!</b>,
          error: (err) => <b>Error: {err.message}</b>,
        }
      );
    } catch (error) {
      console.error("Setup error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const TransactionTypeList = ({ types }: { types: string[] }) => (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-2">Tracked transaction types:</p>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <span
            key={type}
            className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {type}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center relative">
          <button
            onClick={() => {
              logout();
            }}
            className="absolute right-0 top-0 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiLogOut />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Blockchain Data Indexing Setup
            </h1>
            <p className="text-gray-600 mt-2">
              Configure real-time blockchain data synchronization
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FiDatabase className="text-blue-600" /> Database Connection
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Host"
              value={dbConfig.host}
              onChange={(e) =>
                setDbConfig({ ...dbConfig, host: e.target.value })
              }
              className="p-3 border rounded-lg"
            />
            <input
              placeholder="Port"
              type="number"
              value={dbConfig.port}
              onChange={(e) =>
                setDbConfig({ ...dbConfig, port: e.target.value })
              }
              className="p-3 border rounded-lg"
            />
            <input
              placeholder="Username"
              value={dbConfig.user}
              onChange={(e) =>
                setDbConfig({ ...dbConfig, user: e.target.value })
              }
              className="p-3 border rounded-lg"
            />
            <input
              placeholder="Password"
              type="password"
              value={dbConfig.password}
              onChange={(e) =>
                setDbConfig({ ...dbConfig, password: e.target.value })
              }
              className="p-3 border rounded-lg"
            />
            <input
              placeholder="Database Name"
              value={dbConfig.database}
              onChange={(e) =>
                setDbConfig({ ...dbConfig, database: e.target.value })
              }
              className="p-3 border rounded-lg col-span-2"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FiGlobe className="text-green-600" /> Blockchain Network
          </h2>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as any)}
            className="p-3 border rounded-lg w-full"
          >
            <option value="mainnet">Mainnet (Production)</option>
            <option value="devnet">Devnet (Testing)</option>
          </select>
        </div>

        <div className="space-y-4">
          {INDEXING_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {category.icon}
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategories[category.id]
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  } ${
                    (anySelected && category.id !== "any") ||
                    (!anySelected &&
                      category.id === "any" &&
                      Object.keys(selectedCategories).length > 0)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={
                    (anySelected && category.id !== "any") ||
                    (!anySelected &&
                      category.id === "any" &&
                      Object.keys(selectedCategories).length > 0)
                  }
                >
                  {selectedCategories[category.id] ? "Configure" : "Enable"}
                </button>
              </div>

              {selectedCategories[category.id] && (
                <div className="mt-4 space-y-4">
                  {category.id === "any" ? (
                    <div>
                      <label className="block mb-2">Addresses to Monitor</label>
                      <input
                        placeholder="Comma-separated addresses (any type)"
                        onChange={(e) =>
                          setSelectedCategories((prev) => ({
                            ...prev,
                            [category.id]: {
                              ...prev[category.id],
                              config: {
                                anyAddresses: e.target.value
                                  .split(",")
                                  .map((s) => s.trim()),
                              },
                            },
                          }))
                        }
                        className="p-3 border rounded-lg w-full"
                      />
                    </div>
                  ) : (
                    <>
                      {category.requires.includes("nftAddresses") && (
                        <div>
                          <label className="block mb-2">
                            NFT Contract Addresses
                          </label>
                          <input
                            placeholder="Comma-separated addresses (x...)"
                            onChange={(e) =>
                              setSelectedCategories((prev) => ({
                                ...prev,
                                [category.id]: {
                                  ...prev[category.id],
                                  config: {
                                    ...prev[category.id].config,
                                    nftAddresses: e.target.value.split(","),
                                  },
                                },
                              }))
                            }
                            className="p-3 border rounded-lg w-full"
                          />
                          <TransactionTypeList
                            types={category.transactionTypes}
                          />
                        </div>
                      )}

                      {category.requires.includes("tokenAddresses") && (
                        <div>
                          <label className="block mb-2">Token Addresses</label>
                          <input
                            placeholder="Comma-separated addresses (x...)"
                            onChange={(e) =>
                              setSelectedCategories((prev) => ({
                                ...prev,
                                [category.id]: {
                                  ...prev[category.id],
                                  config: {
                                    ...prev[category.id].config,
                                    tokenAddresses: e.target.value.split(","),
                                  },
                                },
                              }))
                            }
                            className="p-3 border rounded-lg w-full"
                          />
                          <TransactionTypeList
                            types={category.transactionTypes}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {error && (
            <div className="text-red-600 p-4 bg-red-50 rounded-lg">
              {error}
              <button
                onClick={() => setError("")}
                className="ml-4 text-red-800 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700"
        >
          Start Data Indexing
        </button>
      </div>
    </div>
  );
}
