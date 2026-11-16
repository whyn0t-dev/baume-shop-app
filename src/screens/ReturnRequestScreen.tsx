import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { createReturnRequest, fetchOrder, ReturnReason } from "../api/endpoints";
import type { Order } from "../api/types";
import { Button, Card, IconButton, Loading, Screen, SectionLabel, Title, TopBar } from "../components/ui";
import { money, num } from "../lib/format";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const REASONS: [ReturnReason, string][] = [
	["defective", "Produit défectueux"],
	["wrong_item", "Mauvais article reçu"],
	["not_as_described", "Non conforme à la description"],
	["changed_mind", "Changement d'avis"],
	["other", "Autre raison"],
];

export default function ReturnRequestScreen({ navigation, route }: RootScreenProps<"ReturnRequest">) {
	const [order, setOrder] = useState<Order | null>(null);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [reason, setReason] = useState<ReturnReason | null>(null);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		fetchOrder(route.params.orderId)
			.then((o) => {
				setOrder(o);
				setSelected(new Set((o.order_items || []).map((_, i) => i)));
			})
			.catch((e) => Alert.alert("Erreur", errorMessage(e)));
	}, [route.params.orderId]);

	function toggle(i: number) {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(i) ? next.delete(i) : next.add(i);
			return next;
		});
	}

	async function submit() {
		if (!order) return;
		if (!selected.size) return Alert.alert("Choisissez au moins un article");
		if (!reason) return Alert.alert("Indiquez le motif du retour");
		const items = (order.order_items || []).filter((_, i) => selected.has(i)).map((it) => `${it.product_title || "Article"}${it.variant_title ? ` (${it.variant_title})` : ""} × ${it.quantity}`);
		const text = `Articles concernés : ${items.join(", ")}.${message.trim() ? `\n\n${message.trim()}` : ""}`;
		setBusy(true);
		try {
			await createReturnRequest({ order_id: order.id, reason, message: text });
			Alert.alert("Demande envoyée", "Nous vous répondons sous 48 h ouvrées. Un e-mail de confirmation vient de vous être envoyé.", [
				{ text: "OK", onPress: () => navigation.goBack() },
			]);
		} catch (e) {
			Alert.alert("Envoi impossible", errorMessage(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			{!order ? (
				<Loading />
			) : (
				<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
						<View style={{ gap: 4 }}>
							<Title size={26}>Demande de retour</Title>
							<Text style={styles.muted}>Commande {route.params.label} · 30 jours pour changer d'avis</Text>
						</View>
						<SectionLabel>Articles à retourner</SectionLabel>
						<Card>
							{(order.order_items || []).map((it, i) => {
								const on = selected.has(i);
								return (
									<Pressable key={it.id || i} onPress={() => toggle(i)} style={[styles.row, i > 0 && styles.border]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
										<View style={[styles.check, on && { backgroundColor: colors.brand, borderColor: colors.brand }]}>{on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}</View>
										<Text style={[styles.strong, { flex: 1 }]}>
											{it.product_title}
											{it.variant_title ? ` · ${it.variant_title}` : ""}
										</Text>
										<Text style={styles.muted}>{money(it.total_price ?? num(it.unit_price) * it.quantity)}</Text>
									</Pressable>
								);
							})}
						</Card>
						<SectionLabel>Motif</SectionLabel>
						<Card>
							{REASONS.map(([key, label], i) => (
								<Pressable key={key} onPress={() => setReason(key)} style={[styles.row, i > 0 && styles.border]} accessibilityRole="radio" accessibilityState={{ checked: reason === key }}>
									<View style={[styles.radio, reason === key && { borderColor: colors.brand }]}>{reason === key ? <View style={styles.radioDot} /> : null}</View>
									<Text style={styles.body}>{label}</Text>
								</Pressable>
							))}
						</Card>
						<SectionLabel>Précisions (facultatif)</SectionLabel>
						<TextInput value={message} onChangeText={setMessage} placeholder="Décrivez le problème en quelques mots…" placeholderTextColor={colors.textFaint} multiline style={styles.textarea} />
						<Text style={styles.muted}>Produits non ouverts uniquement (hors protections internes, pour raisons d'hygiène). Réponse sous 48 h ouvrées.</Text>
						<Button title="Envoyer la demande" onPress={submit} loading={busy} />
					</ScrollView>
				</KeyboardAvoidingView>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	muted: { fontSize: font.label, color: colors.textMuted, lineHeight: 19 },
	strong: { fontSize: 14, fontWeight: "600", color: colors.text },
	body: { fontSize: 14, color: colors.text },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.lg, paddingVertical: 12 },
	border: { borderTopWidth: 1, borderTopColor: colors.border },
	check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
	radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
	textarea: { minHeight: 100, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, fontSize: font.body, color: colors.text, textAlignVertical: "top" },
});
