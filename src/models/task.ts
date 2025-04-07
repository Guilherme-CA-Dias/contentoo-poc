import mongoose from "mongoose";
import { IUser } from "./user";
import { IFreelancer } from "./freelancer";
import { model, models } from "mongoose";

export interface ITask {
  id: string;
  title?: string;
  description?: string;
  createdAt: Date;
  userId: string;
  user?: IUser;
  freelancerId?: string;
  freelancer?: IFreelancer;
  source: string;
  updatedAt: Date;
  status: string;
  freelancerEmail?: string;
}

const taskSchema = new mongoose.Schema<ITask>(
  {
    id: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    freelancerId: {
      type: String,
      ref: "Freelancer",
    },
    status: {
      type: String,
    },
    freelancerEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ freelancerId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, id: 1 }, { unique: true });

if (models.Task) {
  delete models.Task;
}

export const Task = model<ITask>("Task", taskSchema);
