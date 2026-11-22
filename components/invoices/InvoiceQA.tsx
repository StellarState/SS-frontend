"use client";
/**
 * Invoice Q&A section (issue #625)
 *
 * Renders a paginated list of questions and answers on the invoice detail page.
 * Investors with KYC can ask questions; the issuer can answer each question.
 * Any participant can report a question or answer.
 */
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, ChevronDown, Flag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInvoiceQuestions,
  useAskQuestionMutation,
  useAnswerQuestionMutation,
  useReportQuestionMutation,
  type InvoiceQuestion,
  type ReportReason,
} from "@/hooks/useInvoiceQuestions";

const ANSWER_EDIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const askSchema = z.object({
  text: z
    .string()
    .min(1, "Question cannot be empty")
    .max(300, "Maximum 300 characters"),
});

const answerSchema = z.object({
  text: z
    .string()
    .min(1, "Answer cannot be empty")
    .max(1000, "Maximum 1000 characters"),
});

type AskFormValues = z.infer<typeof askSchema>;
type AnswerFormValues = z.infer<typeof answerSchema>;

interface AskQuestionFormProps {
  invoiceId: string;
  isKycApproved: boolean;
}

function AskQuestionForm({ invoiceId, isKycApproved }: AskQuestionFormProps) {
  const mutation = useAskQuestionMutation(invoiceId);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AskFormValues>({ resolver: zodResolver(askSchema) });

  const text = watch("text") ?? "";

  if (!isKycApproved) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/kyc/status" className="underline">
          Complete KYC
        </a>{" "}
        to ask a question.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => {
        mutation.mutate(values.text, { onSuccess: () => reset() });
      })}
      className="space-y-2"
    >
      <textarea
        {...register("text")}
        rows={3}
        maxLength={300}
        placeholder="Ask a question about this invoice…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{text.length}/300</span>
        {errors.text && (
          <span className="text-xs text-destructive">{errors.text.message}</span>
        )}
      </div>
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting…" : "Ask question"}
      </Button>
    </form>
  );
}

interface AnswerFormProps {
  invoiceId: string;
  questionId: string;
  onDone: () => void;
}

function AnswerForm({ invoiceId, questionId, onDone }: AnswerFormProps) {
  const mutation = useAnswerQuestionMutation(invoiceId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnswerFormValues>({ resolver: zodResolver(answerSchema) });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        mutation.mutate(
          { questionId, text: values.text },
          { onSuccess: () => onDone() }
        );
      })}
      className="mt-2 space-y-2 pl-4 border-l-2 border-muted"
    >
      <textarea
        {...register("text")}
        rows={2}
        placeholder="Write your answer…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {errors.text && (
        <span className="text-xs text-destructive">{errors.text.message}</span>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Posting…" : "Post answer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface ReportButtonProps {
  questionId: string;
}

function ReportButton({ questionId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("Spam");
  const mutation = useReportQuestionMutation();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        aria-label="Report this question"
      >
        <Flag className="h-3 w-3" />
        Report
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={reason}
        onValueChange={(v) => setReason(v as ReportReason)}
      >
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Spam">Spam</SelectItem>
          <SelectItem value="Misleading">Misleading</SelectItem>
          <SelectItem value="Inappropriate">Inappropriate</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 px-2 text-xs"
        disabled={mutation.isPending}
        onClick={() => {
          mutation.mutate(
            { questionId, reason },
            { onSuccess: () => setOpen(false) }
          );
        }}
      >
        Submit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

interface QuestionItemProps {
  question: InvoiceQuestion;
  invoiceId: string;
  isIssuer: boolean;
}

function QuestionItem({ question, invoiceId, isIssuer }: QuestionItemProps) {
  const [showAnswerForm, setShowAnswerForm] = useState(false);

  const canEditAnswer =
    question.answer?.createdAt &&
    Date.now() - new Date(question.answer.createdAt).getTime() <
      ANSWER_EDIT_WINDOW_MS;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-sm">{question.text}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(question.createdAt), {
                addSuffix: true,
              })}
            </span>
            <ReportButton questionId={question.id} />
          </div>
        </div>
        {question.answer && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Answered
          </Badge>
        )}
      </div>

      {question.answer && (
        <div className="ml-4 border-l-2 border-muted pl-3 space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Issuer: </span>
            {question.answer.text}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(question.answer.createdAt), {
                addSuffix: true,
              })}
              {question.answer.editedAt && " · edited"}
            </span>
            {isIssuer && canEditAnswer && !showAnswerForm && (
              <button
                type="button"
                onClick={() => setShowAnswerForm(true)}
                className="text-xs underline text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {isIssuer && !question.answer && !showAnswerForm && (
        <Button
          size="sm"
          variant="outline"
          className="ml-4 h-7 text-xs"
          onClick={() => setShowAnswerForm(true)}
        >
          Answer
        </Button>
      )}

      {isIssuer && showAnswerForm && (
        <AnswerForm
          invoiceId={invoiceId}
          questionId={question.id}
          onDone={() => setShowAnswerForm(false)}
        />
      )}
    </div>
  );
}

export interface InvoiceQAProps {
  invoiceId: string;
  /** Whether the viewing user has passed KYC (can ask questions). */
  isKycApproved?: boolean;
  /** Whether the viewing user is the invoice issuer (can answer questions). */
  isIssuer?: boolean;
}

export function InvoiceQA({
  invoiceId,
  isKycApproved = false,
  isIssuer = false,
}: InvoiceQAProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInvoiceQuestions(invoiceId);

  const questions =
    data?.pages.flatMap((page) => page.questions) ?? [];

  return (
    <Card data-testid="invoice-qa">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Questions &amp; Answers</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AskQuestionForm invoiceId={invoiceId} isKycApproved={isKycApproved} />

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && questions.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="qa-empty-state">
            {isIssuer
              ? "No questions yet."
              : "Be the first to ask a question."}
          </p>
        )}

        {questions.length > 0 && (
          <div className="space-y-4" data-testid="qa-question-list">
            {questions.map((q, idx) => (
              <div key={q.id}>
                {idx > 0 && <Separator className="my-3" />}
                <QuestionItem
                  question={q}
                  invoiceId={invoiceId}
                  isIssuer={isIssuer}
                />
              </div>
            ))}
          </div>
        )}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="qa-load-more"
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
