export async function saveContact(data: any): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: "Backend removed" };
}

export async function getContacts(): Promise<any[]> {
  return [];
}