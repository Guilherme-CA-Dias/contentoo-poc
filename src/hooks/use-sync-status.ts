import useSWR from "swr";
import { authenticatedFetcher } from "@/lib/fetch-utils";
import { SyncStatusType } from "@/models/sync-status";

interface SyncStatusResponse {
  id: string;
  connectionId: string;
  status: SyncStatusType;
  startedAt: string;
  completedAt?: string;
  error?: string;
  totalItems?: number;
}

interface UseSyncStatusOptions {
  connectionId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  shouldRefresh?: boolean;
}

export function useSyncStatus({
  connectionId,
  onSuccess,
  onError,
  shouldRefresh,
}: UseSyncStatusOptions) {
  const {
    data: status,
    error,
    isLoading,
  } = useSWR<SyncStatusResponse>(
    connectionId ? `/api/integration/${connectionId}/sync-status` : null,
    authenticatedFetcher,
    {
      refreshInterval: shouldRefresh ? 1000 : 0,
      onSuccess: (data) => {
        if (data.status === SyncStatusType.COMPLETED) {
          onSuccess?.();
        } else if (data.status === SyncStatusType.FAILED) {
          onError?.(data.error || "Sync failed");
        }
      },
      onError: (err) => {
        onError?.(
          err instanceof Error ? err.message : "Failed to fetch sync status"
        );
      },
    }
  );

  return {
    status,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
