import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { fetchOrder, fetchProduct, fetchProducts } from "../api/endpoints";
import type { Order } from "../api/types";
import { useCart } from "../store/CartProvider";
import { Badge, Button, Card, ErrorBanner, IconButton, Screen, SkeletonRows, Title, TopBar, TotalRow } from "../components/ui";
import { FadeIn } from "../components/motion";
import { haptic } from "../lib/haptics";
import { longDate, money, num, orderLabel, orderStatus } from "../lib/format";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const STEPS = [
	{ key: "paid", label: "Commandée" },
	{ key: "processing", label: "Préparée" },
	{ key: "shipped", label: "Expédiée" },
	{ key: "delivered", label: "Livrée" },
];
const RANK: Record<string, number> = { paid: 0, processing: 1, shipped: 2, delivered: 3 };

export function OrderSteps({ order }: { order: Order }) {
	const rank = RANK[order.status] ?? -1;
	if (rank < 0) return null;
	return (
		<View>
			{STEPS.map((s, i) => {
				const done = i <= rank;
				// Les étapes franchies s'allument l'une après l'autre jusqu'au statut actuel.
				return (
					<FadeIn key={s.key} delay={i * 90} offset={6} style={{ flexDirection: "row", gap: 12 }}>
						<View style={{ alignItems: "center" }}>
							<View style={[styles.stepDot, done && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
								{done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
							</View>
							{i < STEPS.length - 1 ? <View style={[styles.stepLine, i < rank && { backgroundColor: colors.brand }]} /> : null}
						</View>
						<Text style={[styles.stepLabel, done && { color: colors.text, fontWeight: "600" }]}>{s.label}</Text>
					</FadeIn>
				);
			})}
		</View>
	);
}

export default function OrderDetailScreen({ navigation, route }: RootScreenProps<"OrderDetail">) {
	const cart = useCart();
	const [order, setOrder] = useState<Order | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [reordering, setReordering] = useState(false);

	const load = useCallback(async () => {
		try {
			setOrder(await fetchOrder(route.params.orderId));
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger cette commande."));
		}
	}, [route.params.orderId]);

	useEffect(() => {
		load();
	}, [load]);

	if (!order) {
		return (
			<Screen>
				<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
				<ErrorBanner message={error} onRetry={load} />
				{!error ? (
					<View style={{ paddingHorizontal: space.xl }}>
						<SkeletonRows count={3} height={90} />
					</View>
				) : null}
			</Screen>
		);
	}
	const o = order;
	const st = orderStatus(o.status);
	const addr = o.shipping_address || {};
	const pickup = Boolean(addr.pickup);
	const returnable = ["paid", "processing", "shipped", "delivered"].includes(o.status);

	async function reorder() {
		setReordering(true);
		let added = 0;
		for (const it of o.order_items || []) {
			if (!it.product_id) continue;
			try {
				// Le panier a besoin du slug et de l'état actuel du produit.
				const res = await fetchProductById(it.product_id);
				if (res) {
					cart.add(res, { quantity: it.quantity, size: it.variant_title || null, variant: it.variant_id ? ({ id: it.variant_id, product_id: it.product_id, price: it.unit_price } as any) : null });
					added++;
				}
			} catch {}
		}
		setReordering(false);
		if (added) {
			haptic.success();
			navigation.navigate("Tabs", { screen: "Cart" });
		} else {
			haptic.warning();
			Alert.alert("Indisponible", "Ces articles ne sont plus disponibles à la vente.");
		}
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} right={<Badge label={st.label} tone={st.tone} />} />
			<ScrollView contentContainerStyle={styles.content}>
				<View style={{ gap: 4 }}>
					<Title size={26}>Commande {orderLabel(o)}</Title>
					<Text style={styles.muted}>Passée le {longDate(o.created_at)}</Text>
				</View>

				{RANK[o.status] !== undefined ? (
					<Card style={{ padding: space.lg, gap: 14 }}>
						<OrderSteps order={o} />
						{o.tracking_number ? (
							<View style={styles.tracking}>
								<Ionicons name="cube-outline" size={20} color={colors.brand} />
								<View style={{ flex: 1 }}>
									<Text style={styles.strong}>{o.carrier || "Transporteur"}</Text>
									<Text style={styles.mono}>{o.tracking_number}</Text>
								</View>
								{o.tracking_url ? (
									<Pressable onPress={() => Linking.openURL(o.tracking_url!)} hitSlop={8}>
										<Text style={styles.link}>Suivre</Text>
									</Pressable>
								) : null}
							</View>
						) : null}
					</Card>
				) : null}

				<Card>
					{(o.order_items || []).map((it, i) => (
						<View key={it.id || i} style={[styles.item, i > 0 && styles.border]}>
							<View style={{ flex: 1 }}>
								<Text style={styles.strong}>{it.product_title || "Article"}</Text>
								<Text style={styles.muted}>
									{it.variant_title ? `${it.variant_title} · ` : ""}× {it.quantity}
								</Text>
							</View>
							<Text style={styles.strong}>{money(it.total_price ?? num(it.unit_price) * it.quantity)}</Text>
						</View>
					))}
					<View style={[styles.border, { padding: space.lg, gap: 6 }]}>
						<TotalRow label="Sous-total" value={money(o.subtotal)} />
						{num(o.discount_total) ? <TotalRow label={`Réduction${o.discount_code ? ` (${o.discount_code})` : ""}`} value={`− ${money(o.discount_total)}`} color={colors.success} /> : null}
						<TotalRow label="Livraison" value={num(o.shipping_total) ? money(o.shipping_total) : "Offerte"} />
						<TotalRow label="Total" value={money(o.total)} strong />
					</View>
				</Card>

				{addr && (addr.line1 || addr.address || pickup) ? (
					<Card style={styles.addr}>
						<Ionicons name={pickup ? "storefront-outline" : "location-outline"} size={20} color={colors.brand} />
						<View style={{ flex: 1 }}>
							<Text style={styles.strong}>{pickup ? "Retrait à la boutique" : "Livraison à domicile"}</Text>
							<Text style={styles.muted}>{[addr.line1 || addr.address, [addr.postal_code, addr.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</Text>
						</View>
					</Card>
				) : null}

				<Button title="Racheter ces articles" onPress={reorder} loading={reordering} />
				{returnable ? (
					<Button title="Demander un retour" icon="return-down-back-outline" variant="secondary" onPress={() => navigation.navigate("ReturnRequest", { orderId: o.id, label: orderLabel(o) })} />
				) : null}
			</ScrollView>
		</Screen>
	);
}

// Les commandes ne contiennent que l'identifiant du produit : on retrouve sa fiche par la liste.
async function fetchProductById(id: string) {
	const all = await fetchProducts();
	const p = all.find((x) => x.id === id);
	return p ? await fetchProduct(p.slug).catch(() => p) : null;
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	muted: { fontSize: font.label, color: colors.textMuted },
	strong: { fontSize: 14, fontWeight: "600", color: colors.text },
	mono: { fontSize: font.small, color: colors.textMuted, fontFamily: "Menlo" },
	link: { fontSize: font.label, fontWeight: "600", color: colors.brand },
	item: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg },
	border: { borderTopWidth: 1, borderTopColor: colors.border },
	addr: { flexDirection: "row", gap: 12, padding: space.lg },
	tracking: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.background },
	stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
	stepLine: { width: 2, height: 18, backgroundColor: colors.border },
	stepLabel: { fontSize: 14, color: colors.textMuted, paddingTop: 2 },
});
