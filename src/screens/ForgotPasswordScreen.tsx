import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { forgotPassword } from "../api/endpoints";
import { Button, Field, IconButton, Screen, Title, TopBar } from "../components/ui";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

export default function ForgotPasswordScreen({ navigation, route }: RootScreenProps<"ForgotPassword">) {
	const [email, setEmail] = useState(route.params?.email || "");
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		if (!email.includes("@")) return setError("Indiquez une adresse e-mail valide.");
		setBusy(true);
		setError(null);
		try {
			await forgotPassword(email.trim().toLowerCase());
			setSent(true);
		} catch (e) {
			setError(errorMessage(e, "Envoi impossible pour le moment."));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			<View style={styles.content}>
				<Title>Mot de passe oublié</Title>
				<Text style={styles.text}>Indiquez l'e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.</Text>
				<Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
				{error ? <Text style={{ color: colors.danger, fontSize: font.label }}>{error}</Text> : null}
				<Button title="Envoyer le lien" onPress={submit} loading={busy} />
				{sent ? (
					<View style={styles.sent}>
						<Ionicons name="mail-outline" size={20} color={colors.success} />
						<View style={{ flex: 1, gap: 2 }}>
							<Text style={styles.sentTitle}>E-mail envoyé</Text>
							<Text style={styles.sentText}>Si un compte existe avec cette adresse, vous allez recevoir le lien. Pensez à vérifier vos courriers indésirables.</Text>
						</View>
					</View>
				) : null}
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: 24, gap: 16 },
	text: { fontSize: font.body, lineHeight: 22, color: colors.textMuted },
	sent: { flexDirection: "row", gap: 12, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.successBg },
	sentTitle: { fontSize: 14, fontWeight: "700", color: "#1F5C38" },
	sentText: { fontSize: font.label, lineHeight: 19, color: "#1F5C38" },
});
