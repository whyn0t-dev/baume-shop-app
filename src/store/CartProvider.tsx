import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product, Variant } from "../api/types";
import { num, productName } from "../lib/format";

const KEY = "shop_cart_v1";

export type CartLine = {
	key: string;
	product_id: string;
	slug: string;
	variant_id?: string | null;
	name: string;
	size?: string | null;
	color?: string | null;
	image?: string | null;
	price: number;
	quantity: number;
	preorder?: boolean;
};

export type CartDiscount = { code: string; type: string; value: number; min: number; label?: string };

type CartValue = {
	lines: CartLine[];
	discount: CartDiscount | null;
	setDiscount: (d: CartDiscount | null) => void;
	discountAmount: number;
	count: number;
	subtotal: number;
	add: (p: Product, opts?: { variant?: Variant | null; size?: string | null; color?: string | null; quantity?: number }) => void;
	setQuantity: (key: string, qty: number) => void;
	remove: (key: string) => void;
	clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
	const [lines, setLines] = useState<CartLine[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [discount, setDiscount] = useState<CartDiscount | null>(null);

	useEffect(() => {
		AsyncStorage.getItem(KEY)
			.then((raw) => {
				if (raw) setLines(JSON.parse(raw));
			})
			.catch(() => {})
			.finally(() => setLoaded(true));
	}, []);

	useEffect(() => {
		if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(lines)).catch(() => {});
	}, [lines, loaded]);

	const add: CartValue["add"] = useCallback((p, opts = {}) => {
		const variant = opts.variant || null;
		const key = `${p.id}:${variant?.id || ""}:${opts.size || ""}:${opts.color || ""}`;
		const qty = Math.max(1, opts.quantity || 1);
		setLines((prev) => {
			const found = prev.find((l) => l.key === key);
			if (found) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + qty) } : l));
			return [
				...prev,
				{
					key,
					product_id: p.id,
					slug: p.slug,
					variant_id: variant?.id || null,
					name: productName(p),
					size: opts.size || null,
					color: opts.color || null,
					image: p.image || null,
					price: num(variant?.price ?? p.price),
					quantity: qty,
					preorder: Boolean(p.preorder),
				},
			];
		});
	}, []);

	const setQuantity = useCallback((key: string, qty: number) => {
		setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, qty) } : l))));
	}, []);

	const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
	const clear = useCallback(() => {
		setLines([]);
		setDiscount(null);
	}, []);

	const value = useMemo(() => {
		const count = lines.reduce((s, l) => s + l.quantity, 0);
		const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
		// Estimation affichée ; le montant exact est recalculé par le serveur au paiement.
		let discountAmount = 0;
		if (discount && subtotal >= discount.min) {
			discountAmount = discount.type.toLowerCase().includes("percent") ? (subtotal * discount.value) / 100 : discount.value;
			discountAmount = Math.min(subtotal, Math.round(discountAmount * 100) / 100);
		}
		return { lines, count, subtotal, add, setQuantity, remove, clear, discount, setDiscount, discountAmount };
	}, [lines, add, setQuantity, remove, clear, discount]);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart doit être utilisé dans CartProvider");
	return ctx;
}
