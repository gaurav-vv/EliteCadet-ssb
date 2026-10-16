"use server";

// Notification Server Actions — thin entry points over
// lib/server/notifications/service.ts (always the caller's own rows).

import { revalidatePath } from "next/cache";
import * as service from "@/lib/server/notifications/service";

export async function loadNotificationsAction() {
  return service.getMyNotifications();
}

export async function markNotificationReadAction(id?: string) {
  const result = await service.markRead(id);
  // The unread badge is rendered by each workspace layout.
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
