"use client";

import { useIntegrationApp } from "@integration-app/react";
import type { Integration as IntegrationAppIntegration } from "@integration-app/sdk";
import { toast } from "sonner";
import { authenticatedFetcher } from "@/lib/fetch-utils";
import { useState } from "react";

interface IntegrationListItemProps {
  integration: IntegrationAppIntegration;
  onRefresh: () => void;
}

export function IntegrationListItem({
  integration,
  onRefresh,
}: IntegrationListItemProps) {
  const integrationApp = useIntegrationApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleSync = async () => {
    if (!integration.connection?.id) return;
    try {
      setIsSyncing(true);
      await authenticatedFetcher(
        `/api/integration/${integration.connection.id}/sync-tasks`,
        {
          method: "POST",
          body: JSON.stringify({ 
            integrationId: integration.connection.integrationId 
          }),
        }
      );
      toast.success("Sync completed successfully");
      onRefresh();
    } catch (error) {
      console.error("Failed to sync:", error);
      toast.error("Failed to sync tasks");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async () => {
    try {
      const connection = await integrationApp
        .integration(integration.key)
        .openNewConnection();

      if (!connection.id) {
        toast.error("Please select a connection first");
        return;
      }

      // Run the get-users-and-create-data-link flow
      try {
        await integrationApp
          .connection(connection.id)
          .flow('get-users-and-create-data-link')
          .run({
            input: {
              integrationKey: integration.key
            }
          });
      } catch (error) {
        console.error("Failed to run get-users flow:", error);
        toast.error("Failed to setup integration data");
        return;
      }

      const integrationId = connection.integrationId;
      const IntNeedsDataSourceAndFieldMapping = ["asana", "monday", "notion"];

      if (IntNeedsDataSourceAndFieldMapping.includes(
        connection.name.toLowerCase()
      )) {
        handleSync();
      }

      onRefresh();
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Failed to connect integration");
    }
  };

  const handleDisconnect = async () => {
    if (!integration.connection?.id) return;
    try {
      await integrationApp.connection(integration.connection.id).archive();
      onRefresh();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const handleConfigure = async () => {
    try {
      setIsConfiguring(true);
      await integrationApp.integration(integration.key).open();
    } catch (error) {
      console.error("Failed to open configuration:", error);
      toast.error("Failed to open configuration");
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <li className="group flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex-shrink-0">
        {integration.logoUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={integration.logoUri}
            alt={`${integration.name} logo`}
            className="w-10 h-10 rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
            {integration.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
          {integration.name}
        </h3>
        {isSyncing && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Syncing...
          </p>
        )}
      </div>
      <div className="flex space-x-2">
        {integration.connection && (
          <>
            <button
              onClick={handleConfigure}
              disabled={isConfiguring}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isConfiguring 
                  ? "bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200"
              }`}
            >
              {isConfiguring ? "Configuring..." : "Configure"}
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isSyncing
                  ? "bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100 hover:bg-blue-200 hover:text-blue-800 dark:hover:bg-blue-800 dark:hover:text-blue-100"
              }`}
            >
              {isSyncing ? "Syncing..." : "Sync"}
            </button>
          </>
        )}
        <button
          onClick={() =>
            integration.connection ? handleDisconnect() : handleConnect()
          }
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            integration.connection
              ? "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100 hover:bg-red-200 hover:text-red-800 dark:hover:bg-red-800 dark:hover:text-red-100"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-700 dark:hover:text-blue-100"
          }`}
        >
          {integration.connection ? "Disconnect" : "Connect"}
        </button>
      </div>
    </li>
  );
}
