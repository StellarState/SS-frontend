"use client";
import { useParams } from "next/navigation";
import { TicketDetail } from "@/components/help/TicketDetail";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  return <TicketDetail ticketId={params.id} />;
}
