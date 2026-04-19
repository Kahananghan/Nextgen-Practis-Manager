
export enum JobStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  OVERDUE = 'Overdue'
}

export enum JobPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Job {
  id: string;
  clientName: string;
  jobName: string;
  jobType: string;
  priority: JobPriority;
  dueDate: string;
  status: JobStatus;
  progress: number;
  assignedTo: string;
}

export interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
}
