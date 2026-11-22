"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Trash2, RefreshCw, Send } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useWebhooks,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useRedeliverWebhookMutation,
  useSendTestEventMutation,
  type Webhook,
} from "@/hooks/useWebhooks";

const SUPPORTED_EVENTS = [
  { value: "invoice.funded", label: "Invoice funded" },
  { value: "payment.received", label: "Payment received" },
  { value: "invoice.settled", label: "Invoice settled" },
];

const webhookSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((v) => v.startsWith("https://"), "URL must use HTTPS"),
  events: z
    .array(z.string())
    .min(1, "Select at least one event"),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

function WebhookForm({ onCreated }: { onCreated: (secret: string) => void }) {
  const { mutateAsync, isPending } = useCreateWebhookMutation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [] },
  });

  const selectedEvents = watch("events");

  function toggleEvent(value: string) {
    const current = selectedEvents;
    setValue(
      "events",
      current.includes(value)
        ? current.filter((e) => e !== value)
        : [...current, value],
      { shouldValidate: true }
    );
  }

  async function onSubmit(values: WebhookFormValues) {
    const result = await mutateAsync(values);
    reset();
    if (result.signingSecret) {
      onCreated(result.signingSecret);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="webhook-url">
          Endpoint URL
        </label>
        <Input
          id="webhook-url"
          placeholder="https://example.com/webhook"
          {...register("url")}
        />
        {errors.url && (
          <p className="text-xs text-destructive">{errors.url.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Events</p>
        <div className="space-y-1">
          {SUPPORTED_EVENTS.map((ev) => (
            <label key={ev.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedEvents.includes(ev.value)}
                onChange={() => toggleEvent(ev.value)}
                className="h-4 w-4"
              />
              {ev.label}
            </label>
          ))}
        </div>
        {errors.events && (
          <p className="text-xs text-destructive">{errors.events.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create webhook"}
      </Button>
    </form>
  );
}

function SecretModal({
  secret,
  onClose,
}: {
  secret: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signing secret</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Copy this secret now — it will not be shown again.
        </p>
        <code className="block rounded bg-muted p-3 font-mono text-sm break-all">
          {secret}
        </code>
        <Button onClick={onClose}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryLog({ webhook }: { webhook: Webhook }) {
  const { mutate: redeliver, isPending } = useRedeliverWebhookMutation();
  const deliveries: Webhook["lastDelivery"][] = webhook.lastDelivery
    ? [webhook.lastDelivery]
    : [];

  if (deliveries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No deliveries yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveries.map((d) => {
          if (!d) return null;
          return (
            <TableRow key={d.id}>
              <TableCell className="text-xs">
                {new Date(d.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={d.success ? "default" : "destructive"}>
                  {d.statusCode}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    redeliver({ webhookId: webhook.id, deliveryId: d.id })
                  }
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Redeliver
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function WebhookRow({ webhook }: { webhook: Webhook }) {
  const { mutate: deleteWebhook, isPending: isDeleting } =
    useDeleteWebhookMutation();
  const { mutate: sendTest, isPending: isTesting } =
    useSendTestEventMutation();

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-sm truncate">{webhook.url}</code>
              {webhook.consecutiveFailures >= 3 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Failing
                </Badge>
              )}
              {webhook.status === "active" && webhook.consecutiveFailures < 3 && (
                <Badge variant="default">Active</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {webhook.events.map((ev) => (
                <Badge key={ev} variant="secondary" className="text-xs">
                  {ev}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isTesting}
              onClick={() => sendTest(webhook.id)}
            >
              <Send className="h-3 w-3 mr-1" />
              Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={() => deleteWebhook(webhook.id)}
              aria-label="Delete webhook"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Delivery log
          </p>
          <DeliveryLog webhook={webhook} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WebhooksPage() {
  const { data: webhooks, isLoading, isError } = useWebhooks();
  const [secret, setSecret] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Receive real-time events for payment and funding activity.
          </p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add endpoint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New webhook endpoint</DialogTitle>
            </DialogHeader>
            <WebhookForm
              onCreated={(s) => {
                setFormOpen(false);
                setSecret(s);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {secret && (
        <SecretModal secret={secret} onClose={() => setSecret(null)} />
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Failed to load webhooks.</p>
      )}

      {!isLoading && !isError && webhooks?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No webhook endpoints configured.
          </CardContent>
        </Card>
      )}

      {webhooks &&
        webhooks.map((w) => <WebhookRow key={w.id} webhook={w} />)}
    </div>
  );
}
