import type { Metadata } from "next";
import { MeetingRoomPage } from "@/components/meetings/meeting-room-page";

export const metadata: Metadata = { title: "Meeting room" };

export default async function MentorMeetingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingRoomPage id={id} backHref={`/mentor/sessions/${id}`} />;
}
