// GitHub Webhook Event Types
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    type: string;
  };
  html_url: string;
  description?: string;
  default_branch: string;
}

export interface User {
  login: string;
  id: number;
  type: string;
  site_admin: boolean;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  user: User;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: string;
  user: User;
  html_url: string;
  created_at: string;
  updated_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface Installation {
  id: number;
  account: {
    login: string;
    id: number;
    type: string;
  };
  repository_selection: string;
}

export interface RepositoryRef {
  id: number;
  name: string;
  full_name: string;
}

// Main Webhook Event Interface
export interface WebhookEvent {
  action: string;
  repository?: Repository;
  sender?: User;
  installation?: Installation;

  // Issue events
  issue?: Issue;
  comment?: Comment;

  // Pull request events
  pull_request?: PullRequest;

  // Installation events
  repositories_added?: RepositoryRef[];
  repositories_removed?: RepositoryRef[];
}