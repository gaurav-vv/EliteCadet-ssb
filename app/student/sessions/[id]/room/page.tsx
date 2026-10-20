import type { Metadata } from "next";
import { MeetingRoomPage } from "@/components/meetings/meeting-room-page";

export const metadata: Metadata = { title: "Meeting room" };

export default async function StudentMeetingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingRoomPage id={id} backHref={`/student/sessions/${id}`} />;
}
