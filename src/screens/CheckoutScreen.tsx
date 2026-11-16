import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { errorMessage } from "../api/client";
import { createCheckout, fetchCheckoutStatus, updateProfile } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../store/CartProvider";
import { Button, Card, Chip, Field, IconButton, Screen, SectionLabel, Title, TopBar, TotalRow } from "../components/ui";
import { money } from "../lib/format";
import { SHIPPING, colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

type Method = "delivery" | "pickup";
const COUNTRIES: [string, string][] = [
	["CH", "Suisse"],
	["FR", "France"],
	["BE", "Belgique"],
	["DE", "Allemagne"],
	["IT", "Italie"],
	["ES", "Espagne"],
	["AT", "Autriche"],
	["NL", "Pays-Bas"],
	["LU", "Luxembourg"],
];

export default function CheckoutScreen({ navigation }: RootScreenProps<"Checkout">) {
	const insets = useSafeAreaInsets();
	const { user, refreshUser } = useAuth();
	const cart = useCart();
	const [method, setMethod] = useState<Method>("delivery");
	const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", address: "", postal_code: "", city: "", country: "CH" });
	const [save, setSave] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;
		setForm((f) => ({
			first_name: f.first_name || user.first_name || "",
			last_name: f.last_name || user.last_name || "",
			email: user.email || f.email,
			phone: f.phone || user.phone || "",
			address: f.address || user.address || "",
			postal_code: f.postal_code || user.postal_code || "",
			city: f.city || user.city || "",
			country: (user.country || f.country || "CH").toUpperCase(),
		}));
	}, [user]);

	const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
	const country = method === "pickup" ? "CH" : form.country;
	const rule = country === "CH" ? SHIPPING.CH : SHIPPING.EU;
	const after = cart.subtotal - cart.discountAmount;
	const shipping = method === "pickup" || after >= rule.threshold ? 0 : rule.fee;
	const total = after + shipping;

	function validate(): string | null {
		if (!form.first_name.trim() || !form.last_name.trim()) return "Indiquez votre prénom et votre nom.";
		if (!form.email.includes("@")) return "Indiquez une adresse e-mail valide.";
		if (method === "delivery" && (!form.address.trim() || !form.postal_code.trim() || !form.city.trim())) return "Complétez votre adresse de livraison.";
		return null;
	}

	async function pay() {
		const problem = validate();
		if (problem) return setError(problem);
		setError(null);
		setBusy(true);
		try {
			const name = `${form.first_name.trim()} ${form.last_name.trim()}`;
			const session = await createCheckout({
				items: cart.lines.map((l) => ({
					product_id: l.product_id,
					variant_id: l.variant_id || null,
					name: l.name,
					price: l.price,
					quantity: l.quantity,
					size: l.size,
					color: l.color,
				})),
				email: form.email.trim().toLowerCase(),
				shipping_country: country,
				shipping_method: method,
				discount_code: cart.discount?.code || null,
				shipping_address: {
					name,
					first_name: form.first_name.trim(),
					last_name: form.last_name.trim(),
					line1: form.address.trim(),
					address: form.address.trim(),
					postal_code: form.postal_code.trim(),
					city: form.city.trim(),
					country,
					phone: form.phone.trim(),
				},
			});

			if (user && save && method === "delivery") {
				updateProfile({
					first_name: form.first_name.trim(),
					last_name: form.last_name.trim(),
					phone: form.phone.trim() || null,
					address: form.address.trim(),
					postal_code: form.postal_code.trim(),
					city: form.city.trim(),
					country,
				})
					.then(refreshUser)
					.catch(() => {});
			}

			const result = await WebBrowser.openAuthSessionAsync(session.url, "baume-shop://checkout");
			if (result.type === "success" && result.url.includes("checkout/success")) {
				return finish(session.session_id);
			}
			// Paiement peut-être terminé même si le retour automatique n'a pas eu lieu.
			const status = await fetchCheckoutStatus(session.session_id).catch(() => null);
			if (status?.payment_status === "paid") return finish(session.session_id);
		} catch (e) {
			setError(errorMessage(e, "Impossible de préparer le paiement."));
		} finally {
			setBusy(false);
		}
	}

	function finish(sessionId: string) {
		cart.clear();
		navigation.reset({ index: 1, routes: [{ name: "Tabs" }, { name: "Confirmation", params: { sessionId } }] });
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour au panier" onPress={() => navigation.goBack()} />} />
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<Title size={26}>Livraison</Title>
					<Steps />

					<Option
						on={method === "delivery"}
						icon="cube-outline"
						title="À domicile"
						sub={country === "CH" ? "Suisse · 2 à 3 jours ouvrés" : "Europe · 3 à 5 jours ouvrés"}
						price={after >= rule.threshold ? "Offerte" : money(rule.fee)}
						onPress={() => setMethod("delivery")}
					/>
					<Option
						on={method === "pickup"}
						icon="storefront-outline"
						title="Retrait à la boutique"
						sub="Rue du Rhône 15, Genève · prêt sous 24 h"
						price="Gratuit"
						onPress={() => setMethod("pickup")}
					/>

					<SectionLabel>Vos coordonnées</SectionLabel>
					<View style={{ flexDirection: "row", gap: 10 }}>
						<Field label="Prénom" value={form.first_name} onChangeText={set("first_name")} autoComplete="given-name" style={{ flex: 1 }} />
						<Field label="Nom" value={form.last_name} onChangeText={set("last_name")} autoComplete="family-name" style={{ flex: 1 }} />
					</View>
					<Field label="E-mail" value={form.email} onChangeText={set("email")} editable={!user} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
					<Field label="Téléphone (facultatif)" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" />

					{method === "delivery" ? (
						<>
							<SectionLabel>Adresse de livraison</SectionLabel>
							<Field label="Adresse" value={form.address} onChangeText={set("address")} autoComplete="street-address" textContentType="fullStreetAddress" />
							<View style={{ flexDirection: "row", gap: 10 }}>
								<Field label="NPA" value={form.postal_code} onChangeText={set("postal_code")} keyboardType="number-pad" autoComplete="postal-code" style={{ width: 110 }} />
								<Field label="Ville" value={form.city} onChangeText={set("city")} style={{ flex: 1 }} />
							</View>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
								{COUNTRIES.map(([code, label]) => (
									<Chip key={code} label={label} active={form.country === code} onPress={() => set("country")(code)} />
								))}
							</ScrollView>
							{user ? (
								<View style={styles.save}>
									<Text style={{ flex: 1, fontSize: 14, color: colors.text }}>Enregistrer cette adresse dans mon compte</Text>
									<Switch value={save} onValueChange={setSave} trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.white} />
								</View>
							) : null}
						</>
					) : null}

					<Card style={styles.totals}>
						<TotalRow label="Sous-total" value={money(cart.subtotal)} />
						{cart.discountAmount ? <TotalRow label="Réduction (estimation)" value={`− ${money(cart.discountAmount)}`} color={colors.success} /> : null}
						<TotalRow label="Livraison" value={shipping ? money(shipping) : "Offerte"} />
						<View style={{ height: 1, backgroundColor: colors.border }} />
						<TotalRow label="Total" value={money(total)} strong />
						<Text style={styles.small}>Livraison offerte dès 60 CHF en Suisse · Europe 12.90 CHF (offerte dès 90 CHF).</Text>
					</Card>
					{error ? <Text style={styles.error}>{error}</Text> : null}
				</ScrollView>
			</KeyboardAvoidingView>
			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
				<Button title={`Payer ${money(total)}`} variant="dark" icon="lock-closed" onPress={pay} loading={busy} />
				<Text style={styles.secure}>Paiement sécurisé par Stripe : Apple Pay ou carte bancaire.</Text>
			</View>
		</Screen>
	);
}

function Steps() {
	const steps = ["Panier", "Livraison", "Paiement"];
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
			{steps.map((s, i) => (
				<React.Fragment key={s}>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
						<View style={[styles.stepDot, i <= 1 && { backgroundColor: colors.brand }]}>
							<Text style={[styles.stepNum, i <= 1 && { color: colors.white }]}>{i + 1}</Text>
						</View>
						<Text style={[styles.stepLabel, i <= 1 && { color: colors.brand }]}>{s}</Text>
					</View>
					{i < 2 ? <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} /> : null}
				</React.Fragment>
			))}
		</View>
	);
}

function Option({ on, icon, title, sub, price, onPress }: { on: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; sub: string; price: string; onPress: () => void }) {
	return (
		<Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.option, on && { borderColor: colors.brand, borderWidth: 2 }]}>
			<View style={[styles.radio, on && { borderColor: colors.brand }]}>{on ? <View style={styles.radioDot} /> : null}</View>
			<View style={{ flex: 1, gap: 2 }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
					<Ionicons name={icon} size={18} color={colors.brand} />
					<Text style={{ fontSize: font.body, fontWeight: "600", color: colors.text }}>{title}</Text>
				</View>
				<Text style={styles.small}>{sub}</Text>
			</View>
			<Text style={{ fontSize: 14, fontWeight: "600", color: colors.brand }}>{price}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: 14 },
	stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
	stepNum: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
	stepLabel: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
	option: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
	radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 1 },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
	save: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
	totals: { padding: space.lg, gap: 8 },
	small: { fontSize: font.small, color: colors.textMuted, lineHeight: 17 },
	error: { fontSize: font.label, color: colors.danger },
	footer: { paddingHorizontal: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 6 },
	secure: { fontSize: font.small, color: colors.textMuted, textAlign: "center" },
});
