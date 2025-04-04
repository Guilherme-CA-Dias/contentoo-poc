"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { useTasks } from "@/hooks/use-tasks"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Define a type for the freelancer object that might be returned from the API
interface FreelancerData {
  id: string;
  email: string;
}

interface ITask {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  source: string;
  status: string;
  freelancerEmail?: string;
}

export function TaskList() {
  const { tasks, isLoading, isError, error } = useTasks()

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'default_task':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  if (isError) {
    return (
      <div className="p-6 border rounded-md">
        <p className="text-red-500">Failed to load tasks: {error?.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task: ITask) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status ? task.status.replace(/_/g, ' ') : 'N/A'}
                  </span>
                </TableCell>
                <TableCell>{format(new Date(task.createdAt), "PPP")}</TableCell>
                <TableCell>{task.source || "N/A"}</TableCell>
                <TableCell>
                  {task.freelancerEmail ? (
                    <span className="text-sm">{task.freelancerEmail}</span>
                  ) : (
                    <span className="text-sm text-gray-500">Unassigned</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
} 