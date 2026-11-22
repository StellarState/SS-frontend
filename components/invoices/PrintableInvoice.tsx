"use client";
/**
 * Print-only invoice layout (issue #623)
 *
 * Rendered alongside the normal invoice view. Visible only in @media print
 * (or when window.print() triggers). Contains a header with platform name,
 * date, invoice id; structured fields; and a QR code linking to the invoice.
 */
import QRCode from "react-qr-code";

interface PrintableInvoiceProps {
  invoiceId: string;
  title: string;
  seller: string;
  amount: number;
  yieldPercentage?: number | null;
  maturityDate: string;
  status: string;
}

export function PrintableInvoice({
  invoiceId,
  title,
  seller,
  amount,
  yieldPercentage,
  maturityDate,
  status,
}: PrintableInvoiceProps) {
  const invoiceUrl = `https://app.stellarstate.io/invoices/${invoiceId}`;
  const printedAt = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="hidden print:block"
      data-testid="printable-invoice"
      aria-hidden="true"
    >
      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div>
          <p className="text-xl font-bold">StellarSettle</p>
          <p className="text-sm text-gray-600">Invoice Detail</p>
          <p className="text-sm text-gray-600">Printed: {printedAt}</p>
        </div>
        <QRCode value={invoiceUrl} size={80} />
      </div>

      <h1 className="mb-4 text-2xl font-bold">{title}</h1>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="font-medium text-gray-500">Invoice ID</dt>
          <dd className="font-mono">{invoiceId}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Status</dt>
          <dd className="capitalize">{status}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Issuer</dt>
          <dd className="font-mono">{seller}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Face Value</dt>
          <dd>{amount.toLocaleString()} XLM</dd>
        </div>
        {yieldPercentage != null && (
          <div>
            <dt className="font-medium text-gray-500">Yield</dt>
            <dd>{yieldPercentage}%</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-gray-500">Maturity Date</dt>
          <dd>
            {new Date(maturityDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-xs text-gray-500">
        View online: {invoiceUrl}
      </p>
    </div>
  );
}
