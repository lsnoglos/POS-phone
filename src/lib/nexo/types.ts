export type VolumePrice = { minQty: number; priceCents: number };

export type Business = {
  id: string;
  name: string;
  address: string;
  phone: string;
  taxId: string;
  logo: string | null;
  useLogoColors: boolean;
  accentColor: string;
  currency: string;
  country: string;
  timezone: string;
  businessType: string;
  invoicePrefix: string;
  taxRateBps: number;
  creditDays: number;
  allowNegativeStock: boolean;
  isDemo: boolean;
  role: string;
  caps: string[] | null;
  branches: { id: string; name: string; isDefault: boolean }[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  photo: string | null;
  categoryId: string | null;
  categoryName: string;
  subcategory: string;
  brand: string;
  sku: string;
  barcode: string;
  costCents: number;
  priceCents: number;
  wholesaleCents: number;
  promoCents: number | null;
  promoUntil: string | null;
  volumePrices: VolumePrice[];
  taxExempt: boolean;
  regulated: boolean;
  minQty: number;
  unit: string;
  supplierId: string | null;
  expiresOn: string | null;
  lotCode: string;
  location: string;
  active: boolean;
  favorite: boolean;
  parentId: string | null;
  variantLabel: string;
  isDemo: boolean;
  stock: number;
};

export type CartLineDraft = {
  productId: string;
  qty: number;
  unitPriceCents: number;
  discountCents: number;
  note?: string;
  priceTouched?: boolean;
};

export type PaymentDraft = {
  method: "cash" | "transfer" | "card" | "credit";
  amountCents: number;
  reference?: string;
  confirmed?: boolean;
};

export type CheckoutInput = {
  businessId: string;
  branchId: string;
  clientId: string;
  customerId: string | null;
  orderDiscountCents: number;
  cashTenderedCents: number;
  note: string;
  lines: CartLineDraft[];
  payments: PaymentDraft[];
};

export type SaleDoc = {
  id: string;
  number: string;
  kind: string;
  createdAt: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  costCents: number;
  creditCents: number;
  cashTenderedCents: number;
  changeCents: number;
  note: string;
  customerName: string;
  cashierName: string;
  items: {
    id: string;
    productId: string;
    name: string;
    qty: number;
    returnedQty: number;
    unitPriceCents: number;
    discountCents: number;
    taxCents: number;
    lineTotalCents: number;
    note: string;
  }[];
  payments: { id: string; method: string; amountCents: number; reference: string; status: string }[];
  business: {
    name: string;
    address: string;
    phone: string;
    taxId: string;
    logo: string | null;
    currency: string;
  };
};
