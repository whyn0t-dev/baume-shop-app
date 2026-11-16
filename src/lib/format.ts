import type { Order, Product } from "../api/types";

export function num(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

export function money(value: unknown): string {
	return `${num(value).toFixed(2)} CHF`;
}

/** Prix court pour les cartes produit : « 39 CHF » ou « 39.50 CHF ». */
export function price(value: unknown): string {
	const n = num(value);
	return `${Number.isInteger(n) ? n : n.toFixed(2)} CHF`;
}

export function productName(p: Pick<Product, "name" | "title">): string {
	return p.name || p.title || "Produit";
}

export function shortDate(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" });
}

export function longDate(value?: string | null): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
}

export function normalize(value: unknown): string {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
}

export function orderLabel(o: Pick<Order, "id" | "order_number">): string {
	return o.order_number ? `#${o.order_number}` : `#${o.id.slice(0, 8).toUpperCase()}`;
}

export const ORDER_STATUS: Record<string, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
	pending: { label: "En attente", tone: "warning" },
	paid: { label: "Confirmée", tone: "info" },
	processing: { label: "En préparation", tone: "info" },
	shipped: { label: "Expédiée", tone: "info" },
	delivered: { label: "Livrée", tone: "success" },
	cancelled: { label: "Annulée", tone: "danger" },
	refunded: { label: "Remboursée", tone: "neutral" },
	partially_refunded: { label: "Remboursée en partie", tone: "neutral" },
};

export function orderStatus(status: string) {
	return ORDER_STATUS[status] || { label: status, tone: "neutral" as const };
}

export function initials(first?: string | null, last?: string | null, email?: string | null): string {
	const s = `${(first || "").trim()[0] || ""}${(last || "").trim()[0] || ""}`.toUpperCase();
	return s || (email || "?")[0].toUpperCase();
}
