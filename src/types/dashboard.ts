export interface Score {
  f1: number;
  accuracy: number;
  timestamp: string;
}

export interface UserStats {
  total_submissions: number;
  best_f1: number;
  uploads_today: number;
  uploads_remaining: number;
} 