import type { SavedDesign } from "@/types/dashboard";

export type SaveDesignPayload = Partial<SavedDesign>;

export async function loadDesign(id: string): Promise<{ data: SavedDesign | null; reason?: string }> {
  return { data: null, reason: "no-backend" };
}

export async function saveDesign(design: Partial<SavedDesign>): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "Backend removed" };
}

export async function updateDesign(id: string, design: Partial<SavedDesign>): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "Backend removed" };
}