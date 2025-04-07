import { NextRequest, NextResponse } from "next/server";
import { Task } from "@/models/task";

interface TaskFields {
  title: string;
  description: string;
  dueDate: string | null;
  contentTypeDetails: string;
  id: string;
  status: string;
  freelancerEmail?: string;
}

interface UnifiedFields {
  id: string;
  subject: string;
  content: string;
  type: string;
  dueTime: string | null;
  startTime: string | null;
  createdTime: string;
  updatedTime: string;
  assigneeId: string;
  followerIds: string[];
  tags: string[];
  projectId: string;
  endTime: string | null;
  ownerId: string;
}

interface WebhookTaskData {
  fields: TaskFields;
  id: string;
  name: string;
  uri: string;
  createdTime: string;
  updatedTime: string;
}

interface WebhookPayload {
  externalTaskId: string;
  data: WebhookTaskData;
}

interface RouteParams {
  params: {
    connectionId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const connectionId = params.connectionId;
    const payload = (await request.json()) as WebhookPayload;

    // Get the integration token from headers
    const integrationToken = request.headers.get('x-integration-app-token');
    if (!integrationToken) {
      return NextResponse.json(
        { error: "Missing integration token" },
        { status: 401 }
      );
    }

    // Prepare task data using the fields structure
    const taskData = {
      id: payload.externalTaskId,
      title: payload.data.fields.title,
      description: payload.data.fields.description || "",
      status: payload.data.fields.status,
      dueDate: payload.data.fields.dueDate,
      freelancerEmail: payload.data.fields.freelancerEmail,
      createdAt: new Date(payload.data.createdTime),
      updatedAt: new Date(payload.data.updatedTime),
    };

    // Update or create the task
    await Task.updateOne(
      {
        id: payload.externalTaskId,
      },
      { $set: taskData },
      { upsert: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
} 