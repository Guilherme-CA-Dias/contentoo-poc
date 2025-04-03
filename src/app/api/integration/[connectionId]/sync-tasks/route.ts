import { NextResponse } from "next/server";
import { getIntegrationClient } from "@/lib/integration-app-client";
import { APIHandler, RequestParams } from "@/lib/api-middleware";
import { Task, ITask } from "@/models/task";
import { SyncStatus, SyncStatusType } from "@/models/sync-status";

interface IntegrationRecord {
  fields: {
    title: string;
    description: string;
    dueDate: string | null;
    contentTypeDetails: string;
    id: string;
    status: string;
  };
  id: string;
  name: string;
  uri: string;
  createdTime: string;
  updatedTime: string;
}

interface SyncTasksParams extends RequestParams {
  params: {
    connectionId: string;
  };
  body?: {
    integrationId?: string;
  };
}

export const POST = APIHandler<SyncTasksParams>(
  async (request, auth, params) => {
    try {
      const { connectionId } = params.params;
      const { integrationId } = params.body || {};

      const client = await getIntegrationClient(auth);

      const connectionsResponse = await client.connections.find({
        integrationId,
      });

      const connection = connectionsResponse.items[0];

      if (!connection) {
        return NextResponse.json(
          { error: "Connection not found" },
          { status: 404 }
        );
      }

      // Initialize sync status in database
      const syncStatus = await SyncStatus.create({
        connectionId,
        status: SyncStatusType.INPROGRESS,
        startedAt: new Date(),
        totalItems: 0,
      });

      const response = NextResponse.json({
        success: true,
        message: "Task sync started",
      });

      (async () => {
        try {
          let cursor: string | undefined;

          do {
            const result = await client
              .connection(connectionId)
              .action("list-tasks")
              .run({ cursor });

            const nextCursor = result.output.cursor;
            const records = result.output.records as IntegrationRecord[];

            const tasksToCreate = records.map((record) => ({
              id: record.id,
              title: record.fields.title,
              userId: auth.customerId,
              description: record.fields.description || "",
              source: connection.integration?.key as string,
              status: record.fields.status,
              dueDate: record.fields.dueDate,
              createdAt: new Date(record.createdTime),
              updatedAt: new Date(record.updatedTime),
            }));

            await Task.bulkWrite(
              tasksToCreate.map((task) => ({
                updateOne: {
                  filter: {
                    userId: auth.customerId,
                    id: task.id,
                  },
                  update: { $set: task },
                  upsert: true,
                },
              }))
            );

            if (!nextCursor) {
              // Mark sync as completed
              await SyncStatus.findByIdAndUpdate(syncStatus._id, {
                status: SyncStatusType.COMPLETED,
                completedAt: new Date(),
              });
              break;
            }

            cursor = nextCursor;
          } while (true);
        } catch (error) {
          console.error("Error in background task sync:", error);
          // Mark sync as failed
          await SyncStatus.findByIdAndUpdate(syncStatus._id, {
            status: SyncStatusType.FAILED,
            completedAt: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();

      return response;
    } catch (error) {
      console.error("Error syncing tasks:", error);
      return NextResponse.json(
        { error: "Failed to sync tasks" },
        { status: 500 }
      );
    }
  }
);
