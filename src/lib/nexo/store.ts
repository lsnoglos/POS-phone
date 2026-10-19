import type { Sql } from "@/lib/db";
import { withTx } from "./tx";
import type { Business, Product, VolumePrice } from "./types";
import {
  ROLES,
  asTextArray,
  assertCap,
  audit,
  bizClock,
  cleanPhoto,
  db,
  member,
  movement,
  num,
  postJournal,
  seedAccounts,
  setStock,
  stockOf,
} from "./access";

const TYPES = new Set([
  "pulperia",
  "farmacia",
  "ferreteria",
  "ropa",
  "minimercado",
  "libreria",
  "repuestos",
  "distribuidora",
  "otro",
]);

function volumes(value: unknown): VolumePrice[] {
  const raw = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(raw)) return [];
  const out: VolumePrice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { minQty?: unknown; priceCents?: unknown };
    const minQty = num(row.minQty);
    const priceCents = num(row.priceCents);
    if (minQty >= 2 && priceCents >= 0) out.push({ minQty, priceCents });
  }
  return out.slice(0, 8);
}

async function branchesOf(sql: Sql, businessId: string) {
  const rows = await sql<{ id: string; name: string; is_default: boolean }>`
    select id, name, is_default from branches where business_id = ${businessId} order by is_default desc, name`;
  return rows.map((row) => ({ id: row.id, name: row.name, isDefault: Boolean(row.is_default) }));
}

function mapBusiness(
  row: {
    id: string;
    name: string;
    address: string;
    phone: string;
    tax_id: string;
    logo: string | null;
    use_logo_colors?: boolean;
    accent_color?: string;
    currency: string;
    country: string;
    timezone: string;
    business_type: string;
    invoice_prefix: string;
    tax_rate_bps: number;
    credit_days: number;
    allow_negative_stock: boolean;
    is_demo: boolean;
    role: string;
    caps: unknown;
  },
  branches: Business["branches"],
): Business {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    taxId: row.tax_id,
    logo: row.logo,
    useLogoColors: Boolean(row.use_logo_colors),
    accentColor: String(row.accent_color ?? ""),
    currency: row.currency,
    country: row.country,
    timezone: row.timezone,
    businessType: row.business_type,
    invoicePrefix: row.invoice_prefix,
    taxRateBps: num(row.tax_rate_bps),
    creditDays: num(row.credit_days),
    allowNegativeStock: Boolean(row.allow_negative_stock),
    isDemo: Boolean(row.is_demo),
    role: row.role,
    caps: asTextArray(row.caps),
    branches,
  };
}

let brandColumns = false;

async function ensureBrandColumns(sql: Sql) {
  if (brandColumns) return;
  await sql`alter table businesses add column if not exists use_logo_colors boolean not null default false`;
  await sql`alter table businesses add column if not exists accent_color text not null default ''`;
  brandColumns = true;
}

function cleanAccent(value: string | undefined) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "";
}

export async function listBusinesses(userId: string): Promise<Business[]> {
  const sql = await db();
  await ensureBrandColumns(sql);
  const rows = await sql<{
    id: string;
    name: string;
    address: string;
    phone: string;
    tax_id: string;
    logo: string | null;
    use_logo_colors?: boolean;
    accent_color?: string;
    currency: string;
    country: string;
    timezone: string;
    business_type: string;
    invoice_prefix: string;
    tax_rate_bps: number;
    credit_days: number;
    allow_negative_stock: boolean;
    is_demo: boolean;
    role: string;
    caps: unknown;
  }>`
    select b.*, m.role, m.caps
    from memberships m
    join businesses b on b.id = m.business_id
    where m.user_id = ${userId}
    order by b.created_at`;
  const out: Business[] = [];
  for (const row of rows) out.push(mapBusiness(row, await branchesOf(sql, row.id)));
  return out;
}

export async function createBusiness(
  userId: string,
  input: {
    name: string;
    address: string;
    phone: string;
    taxId: string;
    businessType: string;
    currency: string;
    timezone: string;
    displayName: string;
    logo: string | null;
    useLogoColors?: boolean;
    accentColor?: string;
    isDemo?: boolean;
  },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Escriba el nombre del negocio");
  if (!TYPES.has(input.businessType)) throw new Error("Tipo de negocio no válido");
  const currency = input.currency === "USD" ? "USD" : "NIO";
  const accent = cleanAccent(input.accentColor);
  const useColors = Boolean(input.useLogoColors && input.logo && accent);
  return withTx(async (sql) => {
    await ensureBrandColumns(sql);
    const id = crypto.randomUUID();
    const branchId = crypto.randomUUID();
    await sql`
      insert into businesses (
        id, owner_user_id, name, address, phone, tax_id, logo, currency, timezone, business_type, is_demo,
        use_logo_colors, accent_color
      ) values (
        ${id}, ${userId}, ${name}, ${input.address.trim()}, ${input.phone.trim()}, ${input.taxId.trim()},
        ${cleanPhoto(input.logo, "El logotipo")}, ${currency}, ${input.timezone || "America/Managua"},
        ${input.businessType}, ${Boolean(input.isDemo)}, ${useColors}, ${accent}
      )`;
    await sql`
      insert into memberships (id, business_id, user_id, role, display_name)
      values (${crypto.randomUUID()}, ${id}, ${userId}, 'owner', ${input.displayName.trim() || "Propietario"})`;
    await sql`
      insert into branches (id, business_id, name, is_default) values (${branchId}, ${id}, 'Principal', true)`;
    await seedAccounts(sql, id);
    await audit(sql, id, userId, "crear", "negocio", id, name);
    return id;
  });
}

export async function updateBusiness(
  userId: string,
  input: {
    businessId: string;
    name: string;
    address: string;
    phone: string;
    taxId: string;
    businessType: string;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    taxRateBps: number;
    creditDays: number;
    allowNegativeStock: boolean;
    logo: string | null;
    useLogoColors?: boolean;
    accentColor?: string;
  },
) {
  if (!TYPES.has(input.businessType)) throw new Error("Tipo de negocio no válido");
  if (input.taxRateBps < 0 || input.taxRateBps > 3000) throw new Error("La tasa de impuesto debe estar entre 0% y 30%");
  const prefix = input.invoicePrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "FAC";
  const accent = cleanAccent(input.accentColor);
  const useColors = Boolean(input.useLogoColors && input.logo && accent);
  return withTx(async (sql) => {
    await ensureBrandColumns(sql);
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "settings");
    await sql`
      update businesses set
        name = ${input.name.trim()},
        address = ${input.address.trim()},
        phone = ${input.phone.trim()},
        tax_id = ${input.taxId.trim()},
        logo = ${cleanPhoto(input.logo, "El logotipo")},
        currency = ${input.currency === "USD" ? "USD" : "NIO"},
        timezone = ${input.timezone || "America/Managua"},
        business_type = ${input.businessType},
        invoice_prefix = ${prefix},
        tax_rate_bps = ${input.taxRateBps},
        credit_days = ${Math.min(180, Math.max(0, input.creditDays))},
        allow_negative_stock = ${input.allowNegativeStock},
        use_logo_colors = ${useColors},
        accent_color = ${accent}
      where id = ${input.businessId}`;
    await audit(sql, input.businessId, userId, "actualizar", "negocio", input.businessId, "Configuración");
    return true;
  });
}

export async function deleteBusiness(userId: string, businessId: string, confirmName: string) {
  return withTx(async (sql) => {
    const rows = await sql<{ name: string; owner_user_id: string }>`
      select name, owner_user_id from businesses where id = ${businessId}`;
    const row = rows[0];
    if (!row) throw new Error("Negocio no encontrado");
    if (row.owner_user_id !== userId) throw new Error("Solo el propietario puede eliminar el negocio");
    if (row.name.trim() !== confirmName.trim()) throw new Error("Escriba el nombre exacto para confirmar");
    await sql`delete from businesses where id = ${businessId}`;
    return true;
  });
}

export async function listMembers(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<{ id: string; user_id: string; role: string; display_name: string; caps: unknown }>`
    select id, user_id, role, display_name, caps from memberships where business_id = ${businessId} order by created_at`;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    caps: asTextArray(row.caps),
  }));
}

export async function createInvite(userId: string, businessId: string, role: string) {
  if (!(ROLES as readonly string[]).includes(role)) throw new Error("Rol no válido");
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "team");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    await sql`
      insert into invites (code, business_id, role, created_by, expires_at)
      values (${code}, ${businessId}, ${role}, ${userId}, now() + interval '7 days')`;
    await audit(sql, businessId, userId, "invitar", "equipo", code, role);
    return code;
  });
}

export async function acceptInvite(userId: string, code: string, displayName: string) {
  const clean = code.trim().toUpperCase();
  return withTx(async (sql) => {
    const rows = await sql<{ business_id: string; role: string; used_by: string | null; expires_at: string }>`
      select business_id, role, used_by, expires_at from invites where code = ${clean} for update`;
    const invite = rows[0];
    if (!invite) throw new Error("Código inválido");
    if (invite.used_by) throw new Error("Ese código ya fue usado");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("El código venció");
    const existing = await sql`select id from memberships where business_id = ${invite.business_id} and user_id = ${userId}`;
    if (existing.length) throw new Error("Usted ya pertenece a ese negocio");
    await sql`
      insert into memberships (id, business_id, user_id, role, display_name)
      values (${crypto.randomUUID()}, ${invite.business_id}, ${userId}, ${invite.role}, ${displayName.trim() || "Empleado"})`;
    await sql`update invites set used_by = ${userId}, used_at = now() where code = ${clean}`;
    await audit(sql, invite.business_id, userId, "unirse", "equipo", userId, invite.role);
    return invite.business_id;
  });
}

export async function updateMemberCaps(userId: string, businessId: string, memberId: string, caps: string[]) {
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "team");
    const rows = await sql<{ role: string }>`
      select role from memberships where id = ${memberId} and business_id = ${businessId}`;
    if (!rows[0]) throw new Error("Empleado no encontrado");
    if (rows[0].role === "owner") throw new Error("Los permisos del propietario no se editan");
    await sql.query(`update memberships set caps = $1::text[] where id = $2 and business_id = $3`, [
      caps,
      memberId,
      businessId,
    ]);
    await audit(sql, businessId, userId, "permisos", "equipo", memberId, caps.join(","));
    return true;
  });
}

export async function createBranch(userId: string, businessId: string, name: string) {
  const label = name.trim();
  if (label.length < 2) throw new Error("Escriba el nombre de la sucursal");
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "settings");
    const id = crypto.randomUUID();
    await sql`insert into branches (id, business_id, name, is_default) values (${id}, ${businessId}, ${label}, false)`;
    const products = await sql<{ id: string }>`select id from products where business_id = ${businessId}`;
    for (const product of products) {
      await sql`
        insert into stocks (product_id, branch_id, qty) values (${product.id}, ${id}, 0)
        on conflict do nothing`;
    }
    await audit(sql, businessId, userId, "crear", "sucursal", id, label);
    return id;
  });
}

export async function transferStock(
  userId: string,
  input: { businessId: string; fromBranchId: string; toBranchId: string; productId: string; qty: number; note: string },
) {
  if (input.fromBranchId === input.toBranchId) throw new Error("Elija sucursales distintas");
  if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error("Cantidad inválida");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "stock");
    const from = await stockOf(sql, input.productId, input.fromBranchId);
    if (from == null) throw new Error("El producto no está en la sucursal de origen");
    if (from < input.qty) throw new Error(`Existencia insuficiente (${from})`);
    await stockOf(sql, input.productId, input.toBranchId);
    await setStock(sql, input.productId, input.fromBranchId, from - input.qty);
    const destRows = await sql<{ qty: number }>`
      select qty from stocks where product_id = ${input.productId} and branch_id = ${input.toBranchId}`;
    const dest = destRows[0] ? num(destRows[0].qty) : 0;
    await setStock(sql, input.productId, input.toBranchId, dest + input.qty);
    const ref = crypto.randomUUID();
    await movement(sql, input.businessId, input.productId, input.fromBranchId, -input.qty, "Traslado", "transfer", ref, input.note, userId);
    await movement(sql, input.businessId, input.productId, input.toBranchId, input.qty, "Traslado", "transfer", ref, input.note, userId);
    await audit(sql, input.businessId, userId, "trasladar", "inventario", input.productId, `${input.qty}`);
    return true;
  });
}

function mapProduct(row: Record<string, unknown>, stock: number): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    photo: (row.photo as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    categoryName: String(row.category_name ?? ""),
    subcategory: String(row.subcategory ?? ""),
    brand: String(row.brand ?? ""),
    sku: String(row.sku ?? ""),
    barcode: String(row.barcode ?? ""),
    costCents: num(row.cost_cents),
    priceCents: num(row.price_cents),
    wholesaleCents: num(row.wholesale_cents),
    promoCents: row.promo_cents == null ? null : num(row.promo_cents),
    promoUntil: row.promo_until ? String(row.promo_until).slice(0, 10) : null,
    volumePrices: volumes(row.volume_prices),
    taxExempt: Boolean(row.tax_exempt),
    regulated: Boolean(row.regulated),
    minQty: num(row.min_qty),
    unit: String(row.unit ?? "unidad"),
    supplierId: (row.supplier_id as string | null) ?? null,
    expiresOn: row.expires_on ? String(row.expires_on).slice(0, 10) : null,
    lotCode: String(row.lot_code ?? ""),
    location: String(row.location ?? ""),
    active: Boolean(row.active),
    favorite: Boolean(row.favorite),
    parentId: (row.parent_id as string | null) ?? null,
    variantLabel: String(row.variant_label ?? ""),
    isDemo: Boolean(row.is_demo),
    stock,
  };
}

export async function listProducts(userId: string, businessId: string, branchId: string, query: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const q = query.trim().replace(/[%_]/g, "");
  const rows = await sql<Record<string, unknown>>`
    select p.*, coalesce(c.name, '') as category_name, coalesce(s.qty, 0) as stock_qty
    from products p
    left join categories c on c.id = p.category_id
    left join stocks s on s.product_id = p.id and s.branch_id = ${branchId}
    where p.business_id = ${businessId}
      and (${q} = '' or p.name ilike ${"%" + q + "%"} or p.barcode = ${q} or p.sku ilike ${"%" + q + "%"} or p.id::text = ${q})
    order by p.favorite desc, p.active desc, p.name
    limit 400`;
  return rows.map((row) => mapProduct(row, num(row.stock_qty)));
}

async function categoryId(sql: Sql, businessId: string, name: string) {
  const label = name.trim();
  if (!label) return null;
  const found = await sql<{ id: string }>`
    select id from categories where business_id = ${businessId} and lower(name) = lower(${label})`;
  if (found[0]) return found[0].id;
  const id = crypto.randomUUID();
  await sql`insert into categories (id, business_id, name) values (${id}, ${businessId}, ${label})`;
  return id;
}

export type ProductInput = {
  businessId: string;
  branchId: string;
  id?: string;
  name: string;
  description: string;
  photo: string | null;
  category: string;
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
  initialQty: number;
};

export async function saveProduct(userId: string, input: ProductInput) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Escriba el nombre del producto");
  if (input.priceCents < 0 || input.costCents < 0) throw new Error("Precio inválido");
  const volume = JSON.stringify(
    input.volumePrices.filter((row) => row.minQty >= 2 && row.priceCents >= 0).slice(0, 8),
  );
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "products");
    const cat = await categoryId(sql, input.businessId, input.category);
    const photo = cleanPhoto(input.photo, "La foto");
    if (input.id) {
      const owned = await sql`select id from products where id = ${input.id} and business_id = ${input.businessId}`;
      if (!owned[0]) throw new Error("Producto no encontrado");
      await sql`
        update products set
          name = ${name}, description = ${input.description.trim()}, photo = ${photo}, category_id = ${cat},
          subcategory = ${input.subcategory.trim()}, brand = ${input.brand.trim()}, sku = ${input.sku.trim()},
          barcode = ${input.barcode.trim()}, cost_cents = ${input.costCents}, price_cents = ${input.priceCents},
          wholesale_cents = ${input.wholesaleCents}, promo_cents = ${input.promoCents},
          promo_until = ${input.promoUntil || null}, volume_prices = ${volume}::jsonb,
          tax_exempt = ${input.taxExempt}, regulated = ${input.regulated}, min_qty = ${input.minQty},
          unit = ${input.unit || "unidad"}, supplier_id = ${input.supplierId}, expires_on = ${input.expiresOn || null},
          lot_code = ${input.lotCode.trim()}, location = ${input.location.trim()}, active = ${input.active},
          favorite = ${input.favorite}, parent_id = ${input.parentId}, variant_label = ${input.variantLabel.trim()},
          updated_at = now()
        where id = ${input.id}`;
      await audit(sql, input.businessId, userId, "editar", "producto", input.id, name);
      return input.id;
    }
    const id = crypto.randomUUID();
    await sql`
      insert into products (
        id, business_id, name, description, photo, category_id, subcategory, brand, sku, barcode,
        cost_cents, price_cents, wholesale_cents, promo_cents, promo_until, volume_prices, tax_exempt,
        regulated, min_qty, unit, supplier_id, expires_on, lot_code, location, active, favorite, parent_id, variant_label
      ) values (
        ${id}, ${input.businessId}, ${name}, ${input.description.trim()}, ${photo}, ${cat}, ${input.subcategory.trim()},
        ${input.brand.trim()}, ${input.sku.trim()}, ${input.barcode.trim()}, ${input.costCents}, ${input.priceCents},
        ${input.wholesaleCents}, ${input.promoCents}, ${input.promoUntil || null}, ${volume}::jsonb, ${input.taxExempt},
        ${input.regulated}, ${input.minQty}, ${input.unit || "unidad"}, ${input.supplierId}, ${input.expiresOn || null},
        ${input.lotCode.trim()}, ${input.location.trim()}, ${input.active}, ${input.favorite}, ${input.parentId},
        ${input.variantLabel.trim()}
      )`;
    const branchRows = await sql<{ id: string }>`select id from branches where business_id = ${input.businessId}`;
    for (const branch of branchRows) {
      const qty = branch.id === input.branchId ? Math.max(0, input.initialQty) : 0;
      await sql`insert into stocks (product_id, branch_id, qty) values (${id}, ${branch.id}, ${qty})`;
    }
    if (input.initialQty > 0) {
      await movement(sql, input.businessId, id, input.branchId, input.initialQty, "Inventario inicial", "product", id, "", userId);
      const value = input.initialQty * input.costCents;
      await postJournal(sql, {
        businessId: input.businessId,
        userId,
        memo: `Inventario inicial · ${name}`,
        source: "opening",
        sourceId: id,
        lines: [
          { key: "inventario", debitCents: value },
          { key: "capital", creditCents: value },
        ],
      });
    }
    await audit(sql, input.businessId, userId, "crear", "producto", id, name);
    return id;
  });
}

export async function setFavorite(userId: string, businessId: string, productId: string, favorite: boolean) {
  const sql = await db();
  const who = await member(sql, userId, businessId);
  assertCap(who, "products");
  await sql`update products set favorite = ${favorite} where id = ${productId} and business_id = ${businessId}`;
  return true;
}

export async function adjustStock(
  userId: string,
  input: { businessId: string; branchId: string; productId: string; qtyDelta: number; reason: string; note: string },
) {
  if (!Number.isInteger(input.qtyDelta) || input.qtyDelta === 0) throw new Error("Indique la cantidad del ajuste");
  if (input.reason.trim().length < 3) throw new Error("Escriba el motivo del ajuste");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "stock");
    const clock = await bizClock(sql, input.businessId);
    const current = await stockOf(sql, input.productId, input.branchId);
    if (current == null) throw new Error("Producto no encontrado en esta sucursal");
    const next = current + input.qtyDelta;
    if (next < 0 && !clock.allowNegative) throw new Error("Esa salida dejaría la existencia en negativo");
    const products = await sql<{ name: string; cost_cents: number }>`
      select name, cost_cents from products where id = ${input.productId} and business_id = ${input.businessId}`;
    if (!products[0]) throw new Error("Producto no encontrado");
    await setStock(sql, input.productId, input.branchId, next);
    await movement(sql, input.businessId, input.productId, input.branchId, input.qtyDelta, input.reason.trim(), "adjust", input.productId, input.note.trim(), userId);
    const amount = Math.abs(input.qtyDelta) * num(products[0].cost_cents);
    const opening = input.reason.trim().toLowerCase().includes("inicial");
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: `${input.reason.trim()} · ${products[0].name}`,
      source: "adjust",
      sourceId: input.productId,
      lines:
        input.qtyDelta > 0
          ? [
              { key: "inventario", debitCents: amount },
              { key: opening ? "capital" : "otros_ingresos", creditCents: amount },
            ]
          : [
              { key: "merma", debitCents: amount },
              { key: "inventario", creditCents: amount },
            ],
    });
    await audit(sql, input.businessId, userId, "ajustar", "inventario", input.productId, `${input.qtyDelta} ${input.reason}`);
    return next;
  });
}

export async function listMovements(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<{
    id: string;
    product_id: string;
    name: string;
    qty: number;
    reason: string;
    note: string;
    created_at: string;
    branch_name: string;
  }>`
    select m.id, m.product_id, p.name, m.qty, m.reason, m.note, m.created_at, coalesce(b.name, '') as branch_name
    from inventory_movements m
    join products p on p.id = m.product_id
    left join branches b on b.id = m.branch_id
    where m.business_id = ${businessId}
    order by m.created_at desc
    limit 200`;
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    qty: num(row.qty),
    reason: row.reason,
    note: row.note,
    createdAt: row.created_at,
    branchName: row.branch_name,
  }));
}

export async function bulkPrice(
  userId: string,
  input: { businessId: string; categoryId: string | null; field: "price" | "wholesale" | "cost"; percentBps: number },
) {
  if (!Number.isInteger(input.percentBps) || input.percentBps < -8000 || input.percentBps > 30000) {
    throw new Error("El porcentaje de ajuste no es válido");
  }
  const column = input.field === "wholesale" ? "wholesale_cents" : input.field === "cost" ? "cost_cents" : "price_cents";
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "products");
    const rows = await sql.query<{ id: string; amount: number }>(
      `select id, ${column} as amount from products where business_id = $1 and ($2::text is null or category_id = $2)`,
      [input.businessId, input.categoryId],
    );
    for (const row of rows) {
      const next = Math.max(0, Math.round((num(row.amount) * (10000 + input.percentBps)) / 10000));
      await sql.query(`update products set ${column} = $1, updated_at = now() where id = $2`, [next, row.id]);
    }
    await audit(sql, input.businessId, userId, "precios", "producto", input.businessId, `${input.field} ${input.percentBps}`);
    return rows.length;
  });
}

export async function importProducts(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    rows: { name: string; priceCents: number; costCents: number; qty: number; barcode: string; category: string; unit: string; minQty: number; sku: string }[];
  },
) {
  if (!input.rows.length) throw new Error("El archivo no tiene filas");
  if (input.rows.length > 400) throw new Error("Importe hasta 400 productos por vez");
  let count = 0;
  for (const row of input.rows) {
    if (!row.name?.trim()) continue;
    await saveProduct(userId, {
      businessId: input.businessId,
      branchId: input.branchId,
      name: row.name,
      description: "",
      photo: null,
      category: row.category || "",
      subcategory: "",
      brand: "",
      sku: row.sku || "",
      barcode: row.barcode || "",
      costCents: Math.max(0, row.costCents || 0),
      priceCents: Math.max(0, row.priceCents || 0),
      wholesaleCents: 0,
      promoCents: null,
      promoUntil: null,
      volumePrices: [],
      taxExempt: false,
      regulated: false,
      minQty: Math.max(0, row.minQty || 0),
      unit: row.unit || "unidad",
      supplierId: null,
      expiresOn: null,
      lotCode: "",
      location: "",
      active: true,
      favorite: false,
      parentId: null,
      variantLabel: "",
      initialQty: Math.max(0, row.qty || 0),
    });
    count += 1;
  }
  return count;
}

export async function postCount(
  userId: string,
  input: { businessId: string; branchId: string; lines: { productId: string; counted: number }[] },
) {
  let changed = 0;
  for (const line of input.lines) {
    if (!Number.isInteger(line.counted) || line.counted < 0) throw new Error("El conteo tiene una cantidad inválida");
    const sql = await db();
    await member(sql, userId, input.businessId);
    const current = num(
      (
        await sql<{ qty: number }>`
          select qty from stocks where product_id = ${line.productId} and branch_id = ${input.branchId}`
      )[0]?.qty,
    );
    const delta = line.counted - current;
    if (delta === 0) continue;
    await adjustStock(userId, {
      businessId: input.businessId,
      branchId: input.branchId,
      productId: line.productId,
      qtyDelta: delta,
      reason: "Conteo físico",
      note: `Sistema ${current}, contado ${line.counted}`,
    });
    changed += 1;
  }
  return changed;
}

export async function listCategories(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<{ id: string; name: string }>`
    select id, name from categories where business_id = ${businessId} order by name`;
  return rows;
}

export async function resolveCode(userId: string, businessId: string, branchId: string, raw: string) {
  const products = await listProducts(userId, businessId, branchId, "");
  const text = raw.trim();
  const idMatch = /^nexo:p:(.+)$/.exec(text);
  const today = new Date().toISOString().slice(0, 10);
  if (idMatch) {
    const found = products.find((product) => product.id === idMatch[1]);
    if (!found) throw new Error("Ese QR no corresponde a un producto de este negocio");
    return found;
  }
  const matches = products.filter(
    (product) =>
      product.active &&
      (product.barcode === text || product.sku.toLowerCase() === text.toLowerCase() || product.id === text),
  );
  if (!matches.length) throw new Error("No hay un producto con ese código");
  const sellable = matches
    .filter((product) => !product.expiresOn || product.expiresOn >= today)
    .filter((product) => product.stock > 0);
  const pool = sellable.length ? sellable : matches.filter((product) => !product.expiresOn || product.expiresOn >= today);
  const choice = (pool.length ? pool : matches).sort((a, b) => {
    if (a.expiresOn && b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : 1;
    if (a.expiresOn) return -1;
    return 0;
  })[0];
  return choice;
}
