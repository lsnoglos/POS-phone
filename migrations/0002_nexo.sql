-- NEXO POS schema. Money is integer cents. Stock quantities are whole units.

create table if not exists businesses (
  id text primary key,
  owner_user_id text not null,
  name text not null,
  address text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  logo text,
  currency text not null default 'NIO',
  country text not null default 'Nicaragua',
  timezone text not null default 'America/Managua',
  business_type text not null default 'pulperia',
  invoice_prefix text not null default 'FAC',
  next_invoice integer not null default 1,
  receipt_prefix text not null default 'REC',
  next_receipt integer not null default 1,
  quote_prefix text not null default 'COT',
  next_quote integer not null default 1,
  tax_rate_bps integer not null default 0,
  credit_days integer not null default 30,
  allow_negative_stock boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id text not null,
  role text not null,
  display_name text not null default '',
  caps text[],
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists memberships_user_idx on memberships (user_id);

create table if not exists branches (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  is_default boolean not null default false
);

create table if not exists invites (
  code text primary key,
  business_id text not null references businesses(id) on delete cascade,
  role text not null,
  created_by text not null,
  expires_at timestamptz not null,
  used_by text,
  used_at timestamptz
);

create table if not exists categories (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

create table if not exists suppliers (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  contact text not null default '',
  phone text not null default '',
  address text not null default '',
  tax_id text not null default '',
  terms text not null default '',
  balance_cents bigint not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  tax_id text not null default '',
  photo text,
  credit_limit_cents bigint not null default 0,
  balance_cents bigint not null default 0,
  price_tier text not null default 'retail',
  blocked boolean not null default false,
  notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists customers_biz_idx on customers (business_id);

create table if not exists products (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  description text not null default '',
  photo text,
  category_id text,
  subcategory text not null default '',
  brand text not null default '',
  sku text not null default '',
  barcode text not null default '',
  cost_cents bigint not null default 0,
  price_cents bigint not null default 0,
  wholesale_cents bigint not null default 0,
  promo_cents bigint,
  promo_until date,
  volume_prices jsonb not null default '[]'::jsonb,
  tax_exempt boolean not null default false,
  regulated boolean not null default false,
  min_qty integer not null default 0,
  unit text not null default 'unidad',
  supplier_id text,
  expires_on date,
  lot_code text not null default '',
  location text not null default '',
  active boolean not null default true,
  favorite boolean not null default false,
  parent_id text,
  variant_label text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_biz_idx on products (business_id);
create index if not exists products_barcode_idx on products (business_id, barcode);

create table if not exists stocks (
  product_id text not null references products(id) on delete cascade,
  branch_id text not null,
  qty integer not null default 0,
  primary key (product_id, branch_id)
);

create table if not exists inventory_movements (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null,
  branch_id text not null,
  qty integer not null,
  reason text not null,
  ref_type text not null default '',
  ref_id text not null default '',
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists movements_biz_idx on inventory_movements (business_id, created_at desc);

create table if not exists sales (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  branch_id text not null,
  number text not null,
  kind text not null default 'sale',
  reverses_id text,
  client_id text not null default '',
  customer_id text,
  cashier_id text not null,
  subtotal_cents bigint not null,
  discount_cents bigint not null,
  tax_cents bigint not null,
  total_cents bigint not null,
  cost_cents bigint not null,
  credit_cents bigint not null default 0,
  cash_tendered_cents bigint not null default 0,
  change_cents bigint not null default 0,
  due_on date,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create unique index if not exists sales_client_uidx on sales (business_id, client_id) where client_id <> '';
create index if not exists sales_biz_created_idx on sales (business_id, created_at desc);

create table if not exists sale_items (
  id text primary key,
  sale_id text not null references sales(id) on delete cascade,
  product_id text not null,
  name text not null,
  qty integer not null,
  unit_price_cents bigint not null,
  discount_cents bigint not null,
  tax_cents bigint not null,
  line_total_cents bigint not null,
  unit_cost_cents bigint not null,
  extended_cost_cents bigint not null,
  returned_qty integer not null default 0,
  note text not null default ''
);

create table if not exists sale_payments (
  id text primary key,
  sale_id text not null references sales(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  method text not null,
  amount_cents bigint not null,
  reference text not null default '',
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists parked_sales (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  branch_id text not null,
  user_id text not null,
  label text not null default '',
  cart jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists credit_payments (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  customer_id text not null,
  amount_cents bigint not null,
  method text not null,
  reference text not null default '',
  receipt_number text not null,
  note text not null default '',
  reverses_id text,
  client_id text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists credit_client_uidx on credit_payments (business_id, client_id) where client_id <> '';

create table if not exists purchases (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  branch_id text not null,
  supplier_id text,
  number text not null default '',
  subtotal_cents bigint not null,
  freight_cents bigint not null default 0,
  total_cents bigint not null,
  method text not null,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists purchase_items (
  id text primary key,
  purchase_id text not null references purchases(id) on delete cascade,
  product_id text not null,
  name text not null,
  qty integer not null,
  unit_cost_cents bigint not null
);

create table if not exists expenses (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  branch_id text,
  account_key text not null,
  amount_cents bigint not null,
  method text not null,
  payee text not null default '',
  note text not null default '',
  receipt text,
  spent_on date not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists cash_sessions (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  branch_id text not null,
  user_id text not null,
  opening_cents bigint not null,
  closing_cents bigint,
  expected_cents bigint,
  difference_cents bigint,
  status text not null,
  note text not null default '',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists cash_open_idx on cash_sessions (business_id, branch_id, user_id, status);

create table if not exists cash_movements (
  id text primary key,
  session_id text not null references cash_sessions(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  kind text not null,
  amount_cents bigint not null,
  note text not null default '',
  ref_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists loans (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  direction text not null,
  counterparty text not null,
  principal_cents bigint not null,
  balance_cents bigint not null,
  rate_bps integer not null default 0,
  rate_type text not null default 'simple',
  start_date date not null,
  term_months integer not null default 1,
  frequency text not null default 'mensual',
  installment_cents bigint not null default 0,
  collateral text not null default '',
  note text not null default '',
  method text not null default 'cash',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists loan_payments (
  id text primary key,
  loan_id text not null references loans(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  principal_cents bigint not null,
  interest_cents bigint not null,
  method text not null,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists ledger_accounts (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null,
  parent_id text,
  system_key text,
  active boolean not null default true,
  unique (business_id, code)
);
create index if not exists ledger_key_idx on ledger_accounts (business_id, system_key);

create table if not exists journal_entries (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  entry_date date not null,
  memo text not null,
  source text not null,
  source_id text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists journal_biz_idx on journal_entries (business_id, entry_date);

create table if not exists journal_lines (
  id text primary key,
  entry_id text not null references journal_entries(id) on delete cascade,
  account_id text not null,
  debit_cents bigint not null default 0,
  credit_cents bigint not null default 0
);

create table if not exists period_locks (
  business_id text not null references businesses(id) on delete cascade,
  year integer not null,
  month integer not null,
  locked_by text not null,
  locked_at timestamptz not null default now(),
  primary key (business_id, year, month)
);

create table if not exists audit_log (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  user_id text not null,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_biz_idx on audit_log (business_id, created_at desc);

create table if not exists quotes (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  customer_id text,
  number text not null,
  note text not null default '',
  total_cents bigint not null,
  status text not null default 'open',
  cart jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
