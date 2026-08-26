"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminInvoices,
  approveAdminInvoice,
  rejectAdminInvoice,
  AdminInvoiceRow,
} from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentPreview } from "@/components/invoices/DocumentPreview";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle } from "lucide-react";

export function AdminInvoicesReview() {
  usePageTitle("Admin Invoice Review");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [rejectingInvoiceId, setRejectingInvoiceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["admin-invoices-pending", jwt],
    queryFn: ({ pageParam }) =>
      fetchAdminInvoices("pending", pageParam as string | undefined, jwt ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!jwt,
  });

  const approveMutation = useMutation({
    mutationFn: (invoiceId: string) => approveAdminInvoice(invoiceId, jwt ?? undefined),
    onSuccess: (_, invoiceId) => {
      toast.success("Invoice approved successfully");
      queryClient.setQueryData(["admin-invoices-pending", jwt], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            invoices: page.invoices.filter((inv: AdminInvoiceRow) => inv.invoiceId !== invoiceId),
          })),
        };
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve invoice");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      rejectAdminInvoice(invoiceId, reason, jwt ?? undefined),
    onSuccess: (_, variables) => {
      toast.success("Invoice rejected successfully");
      setRejectingInvoiceId(null);
      setRejectionReason("");
      queryClient.setQueryData(["admin-invoices-pending", jwt], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            invoices: page.invoices.filter(
              (inv: AdminInvoiceRow) => inv.invoiceId !== variables.invoiceId
            ),
          })),
        };
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject invoice");
    },
  });

  const allInvoices = data?.pages.flatMap((p) => p.invoices) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="admin-invoices-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-red-500">
        Error loading pending invoices. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Pending Invoice Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {allInvoices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" data-testid="empty-pending-invoices">
              No pending invoices to review.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="admin-invoices-table">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Seller Name</th>
                    <th className="p-3 font-medium">Invoice ID</th>
                    <th className="p-3 font-medium">Face Value</th>
                    <th className="p-3 font-medium">Submitted At</th>
                    <th className="p-3 font-medium">Document</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allInvoices.map((inv) => (
                    <tr key={inv.invoiceId} className="hover:bg-muted/30" data-testid={`invoice-row-${inv.invoiceId}`}>
                      <td className="p-3 font-medium">{inv.sellerName}</td>
                      <td className="p-3 text-muted-foreground">{inv.invoiceId}</td>
                      <td className="p-3 font-semibold">{inv.faceValue.toLocaleString()} XLM</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(inv.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocUrl(inv.documentUrl || "/sample.pdf")}
                          data-testid={`view-doc-btn-${inv.invoiceId}`}
                        >
                          <FileText className="size-4 mr-1" />
                          View Document
                        </Button>
                      </td>
                      <td className="p-3 text-right">
                        {rejectingInvoiceId === inv.invoiceId ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              placeholder="Reason for rejection…"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="h-8 w-48 text-xs"
                              data-testid={`reject-reason-input-${inv.invoiceId}`}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!rejectionReason.trim() || rejectMutation.isPending}
                              onClick={() =>
                                rejectMutation.mutate({
                                  invoiceId: inv.invoiceId,
                                  reason: rejectionReason,
                                })
                              }
                              data-testid={`confirm-reject-btn-${inv.invoiceId}`}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRejectingInvoiceId(null);
                                setRejectionReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(inv.invoiceId)}
                              data-testid={`approve-btn-${inv.invoiceId}`}
                            >
                              <CheckCircle className="size-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setRejectingInvoiceId(inv.invoiceId);
                                setRejectionReason("");
                              }}
                              data-testid={`reject-btn-${inv.invoiceId}`}
                            >
                              <XCircle className="size-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="load-more-btn"
              >
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Modal */}
      {selectedDocUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="document-modal"
        >
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Document Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDocUrl(null)}>
                Close
              </Button>
            </div>
            <DocumentPreview documentUrl={selectedDocUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
