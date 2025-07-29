import { useState, useEffect } from "react";
import { Dashboard } from "@/lib/dashboard";
import { apiClient } from "@/lib/api";

interface DashboardResponse {
  dashboard: Dashboard | null;
  isLoading: boolean;
  error: string | null;
}

export default function useDashboard(): DashboardResponse {
  const [dashboard, setData] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getDashboard();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { dashboard, isLoading, error };
}
