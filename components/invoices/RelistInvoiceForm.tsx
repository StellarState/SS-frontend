"use client";
/**
 * Relist invoice form for cancelled invoices (#646).
 *
 * Opens the publish form prefilled with the previous invoice's terms so the
 * issuer can quickly republish without re-entering all details. Shown only on
 * cancelled invoices.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import type { Invoice } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const relistSchema = z.object({
  title: z.string().min(1, "Title is required"),
  faceValue: z
    .string()
    .min(1, "Face value is required")
    .refine((v) => Number(v) > 0, "Must be greater than 0"),
  fundingDeadline: z.string().min(1, "Funding deadline is required"),
  yieldPercentage: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || Number(v) > 0,
      "Must be greater than 0",
    ),
});

type RelistFormData = z.infer<typeof relistSchema>;

interface RelistPayload {
  title: string;
  face_value: number;
  funding_deadline: string;
  yield_percentage?: number;
}

async function relistInvoice(payload: RelistPayload): Promise<unknown> {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to relist invoice");
  return res.json();
}

interface RelistInvoiceFormProps {
  invoice: Pick<
    Invoice,
    "id" | "title" | "status" | "amount" | "due_date" | "yield_percentage"
  >;
}

export function RelistInvoiceForm({ invoice }: RelistInvoiceFormProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RelistFormData>({
    resolver: zodResolver(relistSchema),
    defaultValues: {
      title: invoice.title,
      faceValue: String(invoice.amount ?? ""),
      fundingDeadline: invoice.due_date
        ? new Date(invoice.due_date).toISOString().slice(0, 10)
        : "",
      yieldPercentage: invoice.yield_percentage != null
        ? String(invoice.yield_percentage)
        : "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RelistFormData) =>
      relistInvoice({
        title: data.title,
        face_value: Number(data.faceValue),
        funding_deadline: data.fundingDeadline,
        yield_percentage: data.yieldPercentage ? Number(data.yieldPercentage) : undefined,
      }),
    onSuccess: () => {
      toast.success("Invoice relisted successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
    },
    onError: () => {
      toast.error("Failed to relist invoice. Please try again.");
    },
  });

  if (invoice.status !== "cancelled" && (invoice.status as string) !== "canceled") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <RefreshCw className="size-4" aria-hidden="true" />
          Relist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Relist invoice</DialogTitle>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="px-0 pt-2">
            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="relist-title">Invoice title</Label>
                <Input id="relist-title" {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relist-face-value">Face value (XLM)</Label>
                <Input
                  id="relist-face-value"
                  inputMode="decimal"
                  {...register("faceValue")}
                />
                {errors.faceValue && (
                  <p className="text-sm text-destructive">{errors.faceValue.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relist-deadline">Funding deadline</Label>
                <Input
                  id="relist-deadline"
                  type="date"
                  {...register("fundingDeadline")}
                />
                {errors.fundingDeadline && (
                  <p className="text-sm text-destructive">{errors.fundingDeadline.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relist-yield">Yield % (optional)</Label>
                <Input
                  id="relist-yield"
                  inputMode="decimal"
                  placeholder="e.g. 8.5"
                  {...register("yieldPercentage")}
                />
                {errors.yieldPercentage && (
                  <p className="text-sm text-destructive">{errors.yieldPercentage.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Relisting…" : "Relist invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
