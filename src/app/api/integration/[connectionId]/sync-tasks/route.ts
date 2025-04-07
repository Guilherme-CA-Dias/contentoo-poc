import { NextResponse } from "next/server";
import { getIntegrationClient } from "@/lib/integration-app-client";
import { APIHandler, RequestParams } from "@/lib/api-middleware";
import { Task } from "@/models/task";

interface IntegrationRecord {
  fields: {
    title: string;
    description: string;
    dueDate: string | null;
    contentTypeDetails: string;
    id: string;
    status: string;
    freelancerEmail?: string;
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
      const connectionsResponse = await client.connections.find({ integrationId });
      const connection = connectionsResponse.items[0];

      if (!connection) {
        return NextResponse.json(
          { error: "Connection not found" },
          { status: 404 }
        );
      }

      let cursor: string | undefined;
      const allTasks = [];

      // Handle pagination synchronously
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
          freelancerEmail: record.fields.freelancerEmail,
          createdAt: new Date(record.createdTime),
          updatedAt: new Date(record.updatedTime),
        }));

        // Collect all tasks
        allTasks.push(...tasksToCreate);

        if (!nextCursor) {
          break;
        }
        cursor = nextCursor;
      } while (true);

      // Bulk update all tasks at once
      if (allTasks.length > 0) {
        await Task.bulkWrite(
          allTasks.map((task) => ({
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
      }

      return NextResponse.json({
        success: true,
        message: "Tasks synced successfully",
        count: allTasks.length
      });

    } catch (error) {
      console.error("Error syncing tasks:", error);
      return NextResponse.json(
        { error: "Failed to sync tasks" },
        { status: 500 }
      );
    }
  }
);
