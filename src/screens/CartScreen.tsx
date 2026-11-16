import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { errorMessage } from "../api/client";
import { fetchDiscount, fetchLoyalty } from "../api/endpoints";
import type { LoyaltyCode } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../store/CartProvider";
import { Button, Card, EmptyState, ProductImage, Screen, Title, TopBar, TotalRow } from "../components/ui";
import { money, num } from "../lib/format";
import { SHIPPING, colors, font, radius, space } from "../theme";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Cart">, NativeStackScreenProps<RootStackParamList>>;

export default function CartScreen({ navigation }: Props) {
	const cart = useCart();
	const { user } = useAuth();
	const [code, setCode] = useState("");
	const [checking, setChecking] = useState(false);
	const [vouchers, setVouchers] = useState<LoyaltyCode[]>([]);

	useEffect(() => {
		if (!user) return setVouchers([]);
		fetchLoyalty()
			.then((l) => setVouchers((l.generated_codes || []).filter((v) => !v.used)))
			.catch(() => {});
	}, [user]);

	async function applyCode(raw: string, label?: string) {
		const value = raw.trim().toUpperCase();
		if (!value) return;
		setChecking(true);
		try {
			const d = await fetchDiscount(value);
			cart.setDiscount({ code: d.code, type: d.type, value: num(d.value), min: num(d.min_order_amount), label });
			setCode("");
		} catch (e) {
			Alert.alert("Code non valable", errorMessage(e, "Ce code promo n'est pas valable."));
		} finally {
			setChecking(false);
		}
	}

	if (!cart.lines.length) {
		return (
			<Screen>
				<TopBar left={<Title size={26}>Panier</Title>} />
				<EmptyState icon="bag-handle-outline" title="Votre panier est vide" text="Trouvez les produits adaptés à vos besoins, nos expertes les ont sélectionnés pour vous.">
					<Button title="Découvrir le shop" onPress={() => navigation.navigate("Tabs", { screen: "Shop" })} />
					<Button title="Voir mes favoris" variant="secondary" onPress={() => navigation.navigate("Favorites")} />
				</EmptyState>
			</Screen>
		);
	}

	const after = cart.subtotal - cart.discountAmount;
	const shipping = after >= SHIPPING.CH.threshold ? 0 : SHIPPING.CH.fee;
	const missing = SHIPPING.CH.threshold - after;
	const total = after + shipping;

	return (
		<Screen>
			<TopBar left={<Title size={26}>Panier</Title>} right={<Text style={styles.muted}>{cart.count} article{cart.count > 1 ? "s" : ""}</Text>} />
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{cart.lines.map((l) => (
					<Card key={l.key} style={styles.line}>
						<Pressable onPress={() => navigation.navigate("Product", { slug: l.slug })} style={{ width: 64 }}>
							<ProductImage uri={l.image} height={72} radius={12} />
						</Pressable>
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.name} numberOfLines={2}>
								{l.name}
							</Text>
							<Text style={styles.muted}>
								{[l.size && `Taille ${l.size}`, l.color, l.preorder && "Précommande"].filter(Boolean).join(" · ") || "Taille unique"}
							</Text>
							<Text style={styles.price}>{money(l.price * l.quantity)}</Text>
						</View>
						<View style={styles.stepper}>
							<Pressable onPress={() => cart.setQuantity(l.key, l.quantity - 1)} style={styles.stepBtn} accessibilityLabel={l.quantity === 1 ? "Retirer l'article" : "Diminuer"}>
								<Ionicons name={l.quantity === 1 ? "trash-outline" : "remove"} size={15} color={colors.text} />
							</Pressable>
							<Text style={styles.qty}>{l.quantity}</Text>
							<Pressable onPress={() => cart.setQuantity(l.key, l.quantity + 1)} style={styles.stepBtn} accessibilityLabel="Augmenter">
								<Ionicons name="add" size={15} color={colors.text} />
							</Pressable>
						</View>
					</Card>
				))}

				{cart.discount ? (
					<View style={styles.discountOn}>
						<Ionicons name="pricetag" size={20} color={colors.brand} />
						<View style={{ flex: 1 }}>
							<Text style={styles.name}>{cart.discount.label || `Code ${cart.discount.code}`}</Text>
							<Text style={styles.muted}>
								{cart.subtotal < cart.discount.min ? `Valable dès ${money(cart.discount.min)} d'achat` : `− ${money(cart.discountAmount)} (estimation)`}
							</Text>
						</View>
						<Pressable onPress={() => cart.setDiscount(null)} hitSlop={8}>
							<Text style={styles.link}>Retirer</Text>
						</Pressable>
					</View>
				) : (
					<>
						{vouchers.map((v) => (
							<Pressable key={v.code} style={styles.voucher} onPress={() => applyCode(v.code, `Bon fidélité ${v.reward ? `de ${v.reward} CHF` : ""}`.trim())}>
								<Ionicons name="gift-outline" size={20} color={colors.brand} />
								<Text style={[styles.name, { flex: 1 }]}>Utiliser mon bon fidélité{v.reward ? ` de ${v.reward} CHF` : ""}</Text>
								<Text style={styles.link}>Appliquer</Text>
							</Pressable>
						))}
						<View style={styles.codeRow}>
							<TextInput
								value={code}
								onChangeText={setCode}
								placeholder="Code promo"
								placeholderTextColor={colors.textFaint}
								autoCapitalize="characters"
								autoCorrect={false}
								style={styles.codeInput}
								onSubmitEditing={() => applyCode(code)}
							/>
							<Button title="OK" small variant="secondary" onPress={() => applyCode(code)} loading={checking} disabled={!code.trim()} />
						</View>
					</>
				)}

				<Card style={styles.totals}>
					<TotalRow label="Sous-total" value={money(cart.subtotal)} />
					{cart.discountAmount ? <TotalRow label="Réduction" value={`− ${money(cart.discountAmount)}`} color={colors.success} /> : null}
					<TotalRow label="Livraison (Suisse)" value={shipping ? money(shipping) : "Offerte"} />
					<View style={{ height: 1, backgroundColor: colors.border }} />
					<TotalRow label="Total estimé" value={money(total)} strong />
					{missing > 0 ? (
						<Text style={styles.muted}>Plus que {money(missing)} pour la livraison offerte en Suisse.</Text>
					) : null}
					<Text style={styles.muted}>{user ? `+${Math.floor(after)} points fidélité avec cette commande` : "Connectez-vous pour gagner des points fidélité."}</Text>
				</Card>
			</ScrollView>
			<View style={styles.footer}>
				<Button title="Commander" onPress={() => navigation.navigate("Checkout")} />
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: 10 },
	line: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
	name: { fontSize: 14, fontWeight: "600", color: colors.text },
	muted: { fontSize: font.small, color: colors.textMuted },
	price: { fontSize: 14, fontWeight: "600", color: colors.brand },
	stepper: { flexDirection: "row", alignItems: "center", height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 2 },
	stepBtn: { width: 30, height: 32, alignItems: "center", justifyContent: "center" },
	qty: { minWidth: 14, textAlign: "center", fontSize: font.label, fontWeight: "600" },
	voucher: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.taupe, backgroundColor: colors.surface },
	discountOn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.sand },
	codeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
	codeInput: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 14, color: colors.text },
	link: { fontSize: font.label, fontWeight: "600", color: colors.brand },
	totals: { padding: space.lg, gap: 8 },
	footer: { paddingHorizontal: space.xl, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
