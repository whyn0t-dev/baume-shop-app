import React, { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { confirmMfaEnroll, disableMfa, fetchMfaStatus, startMfaEnroll } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { Button, Card, ErrorBanner, Field, IconButton, Loading, Screen, Title, TopBar } from "../components/ui";
import { FadeIn, animateLayout } from "../components/motion";
import { haptic } from "../lib/haptics";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

type Enroll = { factor_id: string; secret: string; uri: string };

const groupSecret = (s: string) => s.replace(/(.{4})/g, "$1 ").trim();
const onlyDigits = (t: string) => t.replace(/\D/g, "").slice(0, 6);

function dateFR(v?: string | null) {
	if (!v) return null;
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
}

// Double authentification : réglage du compte, valable aussi sur le site et l'app de caisse.
export default function SecurityScreen({ navigation }: RootScreenProps<"Security">) {
	const { replaceTokens } = useAuth();
	const [status, setStatus] = useState<{ enabled: boolean; since?: string | null } | null>(null);
	const [enroll, setEnroll] = useState<Enroll | null>(null);
	const [disabling, setDisabling] = useState(false);
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setStatus(await fetchMfaStatus());
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger ce réglage."));
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	async function begin() {
		setBusy(true);
		setError(null);
		try {
			const data = await startMfaEnroll();
			animateLayout();
			setEnroll({ factor_id: data.factor_id, secret: data.secret, uri: data.uri });
			setCode("");
		} catch (e) {
			setError(errorMessage(e, "Activation impossible pour le moment."));
		} finally {
			setBusy(false);
		}
	}

	async function confirm() {
		if (!enroll || code.length !== 6) return;
		setBusy(true);
		setError(null);
		try {
			const res = await confirmMfaEnroll(enroll.factor_id, code);
			await replaceTokens(res);
			haptic.success();
			animateLayout();
			setEnroll(null);
			setCode("");
			setStatus({ enabled: true, since: new Date().toISOString() });
			Alert.alert("Double authentification activée", "Le code vous sera demandé à chaque connexion, dans les apps comme sur le site.");
		} catch (e) {
			haptic.warning();
			setCode("");
			setError(errorMessage(e, "Code refusé."));
		} finally {
			setBusy(false);
		}
	}

	async function disable() {
		if (code.length !== 6) return;
		setBusy(true);
		setError(null);
		try {
			const res = await disableMfa(code);
			await replaceTokens(res);
			haptic.success();
			animateLayout();
			setDisabling(false);
			setCode("");
			setStatus({ enabled: false });
		} catch (e) {
			haptic.warning();
			setCode("");
			setError(errorMessage(e, "Code refusé."));
		} finally {
			setBusy(false);
		}
	}

	async function openInApp() {
		if (!enroll) return;
		try {
			await Linking.openURL(enroll.uri);
		} catch {
			Alert.alert("Aucune application trouvée", "Installez une application d'authentification, ou saisissez la clé à la main.");
		}
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<Title size={26}>Double authentification</Title>
					<Text style={styles.intro}>
						En plus de votre mot de passe, un code à 6 chiffres généré par une application sur votre téléphone vous est demandé à la
						connexion. Le réglage vaut pour toutes les apps Baume et le site.
					</Text>
					<ErrorBanner message={error} onRetry={status === null ? load : undefined} />

					{status === null ? (
						!error ? <Loading /> : null
					) : status.enabled ? (
						<FadeIn>
							<Card style={styles.card}>
								<View style={styles.row}>
									<Ionicons name="shield-checkmark" size={22} color={colors.success} />
									<Text style={styles.strong}>
										Activée{dateFR(status.since) ? ` depuis le ${dateFR(status.since)}` : ""}
									</Text>
								</View>
								{disabling ? (
									<>
										<Field
											label="Code de votre application, pour confirmer"
											value={code}
											onChangeText={(t) => setCode(onlyDigits(t))}
											keyboardType="number-pad"
											textContentType="oneTimeCode"
											maxLength={6}
											autoFocus
										/>
										<Button title="Désactiver" variant="danger" onPress={disable} loading={busy} disabled={code.length !== 6} />
										<Button
											title="Annuler"
											variant="secondary"
											onPress={() => {
												animateLayout();
												setDisabling(false);
												setCode("");
												setError(null);
											}}
										/>
									</>
								) : (
									<Button
										title="Désactiver"
										icon="shield-outline"
										variant="secondary"
										onPress={() => {
											animateLayout();
											setDisabling(true);
										}}
									/>
								)}
							</Card>
						</FadeIn>
					) : enroll ? (
						<FadeIn style={{ gap: 14 }}>
							<Card style={styles.card}>
								<Text style={styles.step}>1. Installez une application d'authentification</Text>
								<Text style={styles.muted}>Google Authenticator, Microsoft Authenticator, 1Password ou l'app Mots de passe de l'iPhone.</Text>
							</Card>
							<Card style={styles.card}>
								<Text style={styles.step}>2. Ajoutez votre compte Baume</Text>
								<Text style={styles.muted}>
									Sur ce téléphone : touchez « Ouvrir dans l'application ». Depuis un autre appareil : scannez le QR code.
								</Text>
								<Button title="Ouvrir dans l'application" icon="open-outline" onPress={openInApp} />
								<View style={styles.qr}>
									<QRCode value={enroll.uri} size={168} color={colors.text} backgroundColor={colors.white} />
								</View>
								<Text style={styles.label}>Ou saisissez cette clé</Text>
								<Text selectable style={styles.secret}>
									{groupSecret(enroll.secret)}
								</Text>
							</Card>
							<Card style={styles.card}>
								<Text style={styles.step}>3. Saisissez le code à 6 chiffres affiché</Text>
								<Field
									label="Code"
									value={code}
									onChangeText={(t) => setCode(onlyDigits(t))}
									keyboardType="number-pad"
									textContentType="oneTimeCode"
									maxLength={6}
								/>
								<Button title="Activer" icon="shield-checkmark-outline" onPress={confirm} loading={busy} disabled={code.length !== 6} />
								<Button
									title="Annuler"
									variant="secondary"
									onPress={() => {
										animateLayout();
										setEnroll(null);
										setCode("");
										setError(null);
									}}
								/>
							</Card>
						</FadeIn>
					) : (
						<FadeIn>
							<Card style={styles.card}>
								<View style={styles.row}>
									<Ionicons name="shield-outline" size={22} color={colors.textMuted} />
									<Text style={styles.strong}>Non activée</Text>
								</View>
								<Button title="Activer la double authentification" icon="shield-checkmark-outline" onPress={begin} loading={busy} />
							</Card>
						</FadeIn>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 14 },
	intro: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
	card: { padding: space.lg, gap: 12 },
	row: { flexDirection: "row", alignItems: "center", gap: 10 },
	strong: { fontSize: font.body, fontWeight: "600", color: colors.text, flex: 1 },
	step: { fontSize: font.body, fontWeight: "700", color: colors.text },
	muted: { fontSize: font.label, lineHeight: 19, color: colors.textMuted },
	label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
	qr: { alignSelf: "center", padding: 12, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
	secret: { fontSize: 15, fontWeight: "600", letterSpacing: 1, color: colors.text, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
