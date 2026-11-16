import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchCheckoutStatus } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { Button, Card } from "../components/ui";
import { colors, font, fonts, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

// La commande est créée par le serveur après la confirmation Stripe :
// on vérifie son statut quelques secondes avant de proposer le suivi.
export default function ConfirmationScreen({ navigation, route }: RootScreenProps<"Confirmation">) {
	const { user } = useAuth();
	const [orderId, setOrderId] = useState<string | null>(null);
	const [amount, setAmount] = useState<number | null>(null);
	const tries = useRef(0);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const check = async () => {
			try {
				const s = await fetchCheckoutStatus(route.params.sessionId);
				if (s.amount_total) setAmount(Number(s.amount_total) / 100);
				if (s.order_ready && s.order_id) return setOrderId(s.order_id);
			} catch {}
			if (tries.current++ < 10) timer = setTimeout(check, 2500);
		};
		check();
		return () => clearTimeout(timer);
	}, [route.params.sessionId]);

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<View style={styles.content}>
				<View style={styles.check}>
					<Ionicons name="checkmark" size={44} color={colors.background} />
				</View>
				<Text style={styles.title}>{user?.first_name ? `Merci ${user.first_name} !` : "Merci !"}</Text>
				<Text style={styles.text}>Votre paiement est confirmé. Un e-mail récapitulatif vient de vous être envoyé.</Text>
				<Card style={{ alignSelf: "stretch", marginTop: space.xl }}>
					<View style={styles.row}>
						<Ionicons name="cube-outline" size={20} color={colors.brand} />
						<View style={{ flex: 1 }}>
							<Text style={styles.rowTitle}>{orderId ? "Commande enregistrée" : "Enregistrement de la commande…"}</Text>
							<Text style={styles.rowSub}>Vous serez prévenue à chaque étape de la livraison.</Text>
						</View>
					</View>
					{user && amount ? (
						<View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
							<Ionicons name="card-outline" size={20} color={colors.brand} />
							<View style={{ flex: 1 }}>
								<Text style={styles.rowTitle}>+{Math.floor(amount)} points fidélité</Text>
								<Text style={styles.rowSub}>Ajoutés à votre carte dès la confirmation de la commande.</Text>
							</View>
						</View>
					) : null}
				</Card>
			</View>
			<View style={styles.actions}>
				{user ? (
					<Button
						title="Suivre ma commande"
						onPress={() => (orderId ? navigation.replace("OrderDetail", { orderId }) : navigation.replace("Orders"))}
					/>
				) : null}
				<Button title="Continuer mes achats" variant="secondary" onPress={() => navigation.navigate("Tabs", { screen: "Home" })} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.background },
	content: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 80 },
	check: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
	title: { marginTop: 24, fontFamily: fonts.display, fontSize: 30, color: colors.brand, textAlign: "center" },
	text: { marginTop: 10, fontSize: font.body, lineHeight: 22, color: colors.textMuted, textAlign: "center" },
	row: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg },
	rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
	rowSub: { fontSize: font.label, color: colors.textMuted },
	actions: { paddingHorizontal: 24, paddingBottom: space.lg, gap: 10 },
});
