import useSWR from "swr";
import { authenticatedFetcher } from "@/lib/fetch-utils";
import { SyncStatus, SyncStatusType } from "@/models/sync-status";
import { useEffect } from "react";

interface UseSyncStatusProps {
  connectionId?: string;
  shouldRefresh: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useSyncStatus({
  connectionId,
  shouldRefresh,
  onSuccess,
  onError,
}: UseSyncStatusProps) {
  const { data, error, isLoading, mutate } = useSWR<{ status: SyncStatus }>(
    shouldRefresh && connectionId ? `/api/integration/${connectionId}/sync-status` : null,
    authenticatedFetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  useEffect(() => {
    if (!shouldRefresh || !connectionId) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const result = await authenticatedFetcher(`/api/integration/${connectionId}/sync-status`);
        
        if (result?.status?.status === SyncStatusType.COMPLETED) {
          onSuccess?.();
          return true;
        } else if (result?.status?.status === SyncStatusType.FAILED) {
          onError?.(result.status.error || 'Sync failed');
          return true;
        }
        
        return false;
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Error checking sync status');
        return true;
      }
    };

    const poll = async () => {
      const shouldStop = await checkStatus();
      
      if (!shouldStop) {
        timeoutId = setTimeout(poll, 2000);
      }
    };

    poll();

    // Cleanup function to clear timeout when component unmounts or shouldRefresh changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [connectionId, shouldRefresh, onSuccess, onError]);

  return {
    status: data?.status,
    isLoading,
    isError: error,
  };
}
