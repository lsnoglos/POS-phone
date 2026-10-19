import { createContext, useContext } from "react";
import type { Business } from "@/lib/nexo/types";

export type Area = "inicio" | "venta" | "inventario" | "finanzas" | "mas";

export type NexoContext = {
  displayName: string;
  businesses: Business[];
  business: Business;
  branchId: string;
  setBranch: (id: string) => void;
  selectBusiness: (id: string) => void;
  area: Area;
  screen: string;
  go: (area: Area, screen?: string) => void;
};

export const NexoCtx = createContext<NexoContext | null>(null);

export function useNexo() {
  const value = useContext(NexoCtx);
  if (!value) throw new Error("NEXO no está listo");
  return value;
}
