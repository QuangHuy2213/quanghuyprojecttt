BEGIN;

-- A non-cycling sequence is collision-free across concurrent inserts. Gaps after
-- rollbacks are intentional. Never truncate the suffix or reuse sequence values.
CREATE SEQUENCE public.invoice_code_sequence AS bigint NO CYCLE;

CREATE FUNCTION public.generate_invoice_code(created_at timestamptz DEFAULT CURRENT_TIMESTAMP)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
DECLARE
  suffix text := upper(to_hex(nextval('public.invoice_code_sequence'::regclass)));
BEGIN
  RETURN 'HD-' || to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD')
    || '-' || repeat('0', greatest(0, 6 - length(suffix))) || suffix;
END;
$$;

ALTER TABLE public."Invoice" ADD COLUMN "invoiceCode" text;
-- Existing Prisma timestamps are UTC timestamp-without-time-zone values.
UPDATE public."Invoice"
SET "invoiceCode" = public.generate_invoice_code("createdAt" AT TIME ZONE 'UTC');
ALTER TABLE public."Invoice"
  ALTER COLUMN "invoiceCode" SET DEFAULT public.generate_invoice_code(),
  ALTER COLUMN "invoiceCode" SET NOT NULL;
CREATE UNIQUE INDEX "Invoice_invoiceCode_key" ON public."Invoice"("invoiceCode");

COMMIT;
