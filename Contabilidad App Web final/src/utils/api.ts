import { supabase } from "./supabase";

// ── Jobs ──────────────────────────────────────────────────────────────────────
export async function getJobs(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, data")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.data);
}

export async function upsertJob(userId: string, job: any): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .upsert({ id: job.id, user_id: userId, data: job, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function deleteJob(userId: string, jobId: number): Promise<void> {
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("user_id", userId)
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

// ── Employees ─────────────────────────────────────────────────────────────────
export async function getEmployees(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, data")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.data);
}

export async function upsertEmployee(userId: string, emp: any): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .upsert({ id: emp.id, user_id: userId, data: emp, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(userId: string, empId: number): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("user_id", userId)
    .eq("id", empId);
  if (error) throw new Error(error.message);
}

// ── Settings ──────────────────────────────────────────────────────────────────
export async function getSettings(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.data ?? null;
}

export async function saveSettings(userId: string, settings: any): Promise<void> {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
