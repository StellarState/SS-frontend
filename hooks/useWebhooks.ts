"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface WebhookDelivery {
  id: string;
  statusCode: number;
  timestamp: string;
  success: boolean;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "failing" | "disabled";
  lastDelivery?: WebhookDelivery;
  consecutiveFailures: number;
  signingSecret?: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

const WEBHOOKS_QUERY_KEY = ["webhooks"] as const;

async function fetchWebhooks(): Promise<Webhook[]> {
  const res = await fetch("/api/webhooks");
  if (!res.ok) throw new Error("Failed to fetch webhooks");
  return res.json();
}

async function createWebhook(
  input: CreateWebhookInput
): Promise<Webhook & { signingSecret: string }> {
  const res = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create webhook");
  return res.json();
}

async function deleteWebhook(id: string): Promise<void> {
  const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete webhook");
}

async function redeliverWebhook(webhookId: string, deliveryId: string): Promise<void> {
  const res = await fetch(
    `/api/webhooks/${webhookId}/deliveries/${deliveryId}/redeliver`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to redeliver webhook");
}

async function sendTestEvent(webhookId: string): Promise<void> {
  const res = await fetch(`/api/webhooks/${webhookId}/test`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to send test event");
}

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_QUERY_KEY,
    queryFn: fetchWebhooks,
    staleTime: 30 * 1000,
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to create webhook");
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      toast.success("Webhook deleted");
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });
}

export function useRedeliverWebhookMutation() {
  return useMutation({
    mutationFn: ({
      webhookId,
      deliveryId,
    }: {
      webhookId: string;
      deliveryId: string;
    }) => redeliverWebhook(webhookId, deliveryId),
    onSuccess: () => {
      toast.success("Redeliver queued");
    },
    onError: () => {
      toast.error("Redeliver failed");
    },
  });
}

export function useSendTestEventMutation() {
  return useMutation({
    mutationFn: sendTestEvent,
    onSuccess: () => {
      toast.success("Test event sent");
    },
    onError: () => {
      toast.error("Failed to send test event");
    },
  });
}
