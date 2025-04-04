import { NextRequest, NextResponse } from "next/server";
import { Task } from "@/models/task";
import { APIHandler, RequestParams } from "@/lib/api-middleware";
import type { AuthCustomer } from "@/lib/auth";

interface TasksParams extends RequestParams {
  query: {
    search?: string;
    freelancerId?: string;
  };
}

interface TaskQuery {
  userId: string;
  title?: {
    $regex: string;
    $options: string;
  };
  freelancerId?: string;
}

async function handler(
  request: NextRequest,
  auth: AuthCustomer,
  params: TasksParams
) {
  try {
    console.log({ params });
    const queryParams = params.query || {};
    const search = queryParams.search;
    const freelancerId = queryParams.freelancerId;

    const query: TaskQuery = { userId: auth.customerId };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (freelancerId) {
      query.freelancerId = freelancerId;
    }

    const tasks = await Task.find(query)
      .select("id title description createdAt updatedAt freelancerEmail source status")
      .sort({ createdAt: -1 })
      .populate("freelancerId", "id email");

    return NextResponse.json(
      {
        tasks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export const GET = APIHandler<TasksParams>(handler);
