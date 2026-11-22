"use client";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateSupportTicket } from "@/hooks/useSupportTickets";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

const schema = z.object({
  category: z.string().min(1, "Please select a category"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description too long"),
});

type FormValues = z.infer<typeof schema>;

export interface ContactSupportContext {
  invoiceId?: string;
  txHash?: string;
}

interface ContactSupportPageProps {
  context?: ContactSupportContext;
  onSuccess?: () => void;
}

export function ContactSupportPage({
  context,
  onSuccess,
}: ContactSupportPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const mutation = useCreateSupportTicket();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", subject: "", description: "" },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFileError(null);
      const incoming = Array.from(e.target.files ?? []);
      const combined = [...files, ...incoming].slice(0, MAX_FILES);

      for (const file of incoming) {
        if (file.size > MAX_FILE_SIZE) {
          setFileError(`"${file.name}" exceeds the 5 MB limit.`);
          return;
        }
        if (!ACCEPTED_MIME.includes(file.type) && !file.name.endsWith(".pdf")) {
          setFileError(`"${file.name}" is not an accepted file type.`);
          return;
        }
      }
      if (files.length + incoming.length > MAX_FILES) {
        setFileError(`You can attach up to ${MAX_FILES} files.`);
      }
      setFiles(combined);
      e.target.value = "";
    },
    [files]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const onSubmit = async (values: FormValues) => {
    setUploadProgress(10);
    try {
      await mutation.mutateAsync({
        ...values,
        files,
        invoiceId: context?.invoiceId,
        txHash: context?.txHash,
      });
      setUploadProgress(100);
      form.reset();
      setFiles([]);
      onSuccess?.();
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">Contact Support</h1>
          <p className="text-sm text-muted-foreground">
            Our team typically responds within one business day.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Hidden context fields */}
              {context?.invoiceId && (
                <input type="hidden" name="invoiceId" value={context.invoiceId} />
              )}
              {context?.txHash && (
                <input type="hidden" name="txHash" value={context.txHash} />
              )}

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="support-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Billing">Billing</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="KYC">KYC</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of your issue"
                        data-testid="support-subject"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        rows={5}
                        placeholder="Describe your issue in detail"
                        data-testid="support-description"
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Attachments{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional, max {MAX_FILES} files, 5 MB each)
                  </span>
                </p>
                <label
                  htmlFor="support-files"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  Add image or PDF
                  <input
                    id="support-files"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="sr-only"
                    disabled={files.length >= MAX_FILES}
                    onChange={handleFileChange}
                    data-testid="support-file-input"
                  />
                </label>
                {fileError && (
                  <p className="text-sm text-destructive" role="alert">
                    {fileError}
                  </p>
                )}
                {files.length > 0 && (
                  <ul className="space-y-1">
                    {files.map((file, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded border px-3 py-1.5 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Upload progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Uploading…</p>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* Context summary (visible to user) */}
              {(context?.invoiceId || context?.txHash) && (
                <div className="rounded border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {context.invoiceId && (
                    <p>Invoice: {context.invoiceId}</p>
                  )}
                  {context.txHash && (
                    <p>Transaction: {context.txHash}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full"
                data-testid="support-submit"
              >
                {mutation.isPending ? "Submitting…" : "Submit ticket"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
