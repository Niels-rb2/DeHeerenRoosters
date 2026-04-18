// Type-definities voor de `rooster_*` tabellen in Supabase.
// Manueel onderhouden — genereer later evt. opnieuw met `supabase gen types`.

export type ScheduleStatus = "draft" | "published";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type SwapStatus =
  | "pending_target"
  | "pending_admin"
  | "approved"
  | "rejected";

export interface Employee {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefaultPattern {
  id: string;
  employee_id: string;
  day_of_week: number; // 0=ma … 6=zo
  start_time: string;
  end_time: string | null; // null = tot sluit
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  week_start: string; // ISO date (maandag)
  status: ScheduleStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  schedule_id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null; // null = tot sluit
  is_day_off: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayOverride {
  id: string;
  schedule_id: string;
  date: string;
  is_closed: boolean;
  custom_open_time: string | null;
  custom_close_time: string | null;
  title: string | null;
  color: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  date: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  target_id: string;
  target_shift_id: string | null;
  status: SwapStatus;
  target_accepted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventKeyword {
  id: string;
  keyword: string;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  employee_id: string;
  endpoint: string;
  subscription: unknown;
  created_at: string;
}

// Feestjes uit de bestaande Kanban Board tabel (alleen-lezen voor deze app).
export interface PrivateEventRequest {
  id: string;
  gmail_thread_id: string;
  sender_name: string;
  sender_email: string;
  occasion_type: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  special_notes: string | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      rooster_employees: Row<Employee>;
      rooster_default_patterns: Row<DefaultPattern>;
      rooster_schedules: Row<Schedule>;
      rooster_shifts: Row<Shift>;
      rooster_day_overrides: Row<DayOverride>;
      rooster_leave_requests: Row<LeaveRequest>;
      rooster_swap_requests: Row<SwapRequest>;
      rooster_event_keywords: Row<EventKeyword>;
      rooster_push_subscriptions: Row<PushSubscription>;
      private_event_requests: Row<PrivateEventRequest>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
