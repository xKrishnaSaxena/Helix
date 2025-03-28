import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

type WebhookContextType = {
  webhooks: any[];
  loading: boolean;
  error: string;
  deleteWebhook: (id: string) => Promise<void>;
  fetchWebhooks: () => Promise<void>;
};
const WebhookContext = createContext<WebhookContextType>({
  webhooks: [],
  loading: false,
  error: "",
  deleteWebhook: async () => {},
  fetchWebhooks: async () => {},
});
export const useWebhooks = () => useContext(WebhookContext);

export const WebhookProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:3000/api/indexing/getAllWebhooks",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      setWebhooks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      setLoading(true);
      await fetch("http://localhost:3000/api/indexing/deleteWebhook", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ id }),
      });
      await fetchWebhooks();
      toast.success("Webhook deleted successfully");
    } catch (err: any) {
      toast.error(`Error deleting webhook: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  return (
    <WebhookContext.Provider
      value={{ webhooks, loading, error, deleteWebhook, fetchWebhooks }}
    >
      {children}
    </WebhookContext.Provider>
  );
};
