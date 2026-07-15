-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "sales_order_lines" ADD COLUMN     "line_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "subtotal_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
