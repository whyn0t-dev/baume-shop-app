import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { useAuth, type MfaStep } from "../auth/AuthProvider";
import { Button, Field, IconButton, Screen, Segmented, Title, TopBar } from "../components/ui";
import { animateLayout } from "../components/motion";
import { colors, font, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

export default function LoginScreen({ navigation, route }: RootScreenProps<"Login">) {
	const { signIn, signUp, completeMfa } = useAuth();
	// Étape du code à 6 chiffres (double authentification active sur le compte).
	const [mfa, setMfa] = useState<MfaStep | null>(null);
	const [code, setCode] = useState("");
	const [mode, setMode] = useState<"login" | "register">(route.params?.mode || "login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		setError(null);
		if (!email.includes("@")) return setError("Indiquez une adresse e-mail valide.");
		if (password.length < (mode === "register" ? 8 : 1)) {
			return setError(mode === "register" ? "Le mot de passe doit contenir au moins 8 caractères." : "Indiquez votre mot de passe.");
		}
		setBusy(true);
		try {
			if (mode === "login") {
				const step = await signIn(email, password);
				if (step) {
					animateLayout();
					setMfa(step);
					setCode("");
					return;
				}
				navigation.goBack();
			} else {
				const result = await signUp({ email, password, first_name: firstName.trim() || undefined, last_name: lastName.trim() || undefined });
				if (result === "signedIn") navigation.goBack();
				else {
					Alert.alert("Confirmez votre e-mail", "Nous vous avons envoyé un lien de confirmation. Ouvrez-le, puis connectez-vous.");
					setMode("login");
				}
			}
		} catch (e) {
			setError(errorMessage(e, mode === "login" ? "Connexion impossible." : "Inscription impossible."));
		} finally {
			setBusy(false);
		}
	}

	async function submitCode() {
		const digits = code.replace(/\D/g, "");
		if (!mfa) return;
		if (digits.length !== 6) return setError("Saisissez les 6 chiffres affichés dans votre application.");
		setError(null);
		setBusy(true);
		try {
			await completeMfa(mfa, digits);
			navigation.goBack();
		} catch (e) {
			const expired = (e as { response?: { status?: number } })?.response?.status === 401;
			setError(errorMessage(e, "Code refusé."));
			setCode("");
			if (expired) {
				animateLayout();
				setMfa(null);
				setPassword("");
			}
		} finally {
			setBusy(false);
		}
	}

	if (mfa) {
		return (
			<Screen edges={["top", "bottom"]}>
				<TopBar left={<IconButton icon="close" label="Fermer" onPress={() => navigation.goBack()} />} />
				<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
						<Title>Code de sécurité</Title>
						<Text style={styles.reason}>
							Ouvrez votre application d'authentification et saisissez le code à 6 chiffres affiché pour Baume.
						</Text>
						<Field
							label="Code à 6 chiffres"
							value={code}
							onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
							keyboardType="number-pad"
							textContentType="oneTimeCode"
							autoComplete="one-time-code"
							autoFocus
							maxLength={6}
							onSubmitEditing={submitCode}
							style={{}}
						/>
						{error ? <Text style={styles.error}>{error}</Text> : null}
						<Button title="Valider" onPress={submitCode} loading={busy} disabled={code.length !== 6} />
						<Pressable
							onPress={() => {
								animateLayout();
								setMfa(null);
								setCode("");
								setError(null);
							}}
							hitSlop={8}
							style={{ alignSelf: "center" }}
						>
							<Text style={styles.link}>Revenir à la connexion</Text>
						</Pressable>
						<Text style={styles.legal}>Téléphone perdu ? Écrivez-nous depuis le site : nous réinitialiserons la double authentification.</Text>
					</ScrollView>
				</KeyboardAvoidingView>
			</Screen>
		);
	}

	return (
		<Screen edges={["top", "bottom"]}>
			<TopBar left={<IconButton icon="close" label="Fermer" onPress={() => navigation.goBack()} />} />
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<Title>{mode === "login" ? "Bon retour parmi nous" : "Bienvenue chez Baume"}</Title>
					{route.params?.reason ? <Text style={styles.reason}>{route.params.reason}</Text> : null}
					<Segmented
						value={mode}
						onChange={(m) => {
							// Les champs propres à l'inscription apparaissent / disparaissent en douceur.
							animateLayout();
							setMode(m);
							setError(null);
						}}
						options={[
							{ key: "login", label: "Se connecter" },
							{ key: "register", label: "Créer un compte" },
						]}
					/>
					{mode === "register" ? (
						<View style={{ flexDirection: "row", gap: 10 }}>
							<Field label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" style={{ flex: 1 }} />
							<Field label="Nom" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" style={{ flex: 1 }} />
						</View>
					) : null}
					<Field
						label="E-mail"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="email-address"
						autoComplete="email"
						textContentType="username"
					/>
					<Field
						label="Mot de passe"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoComplete={mode === "login" ? "current-password" : "new-password"}
						textContentType={mode === "login" ? "password" : "newPassword"}
						onSubmitEditing={submit}
						returnKeyType="go"
					/>
					{mode === "login" ? (
						<Pressable onPress={() => navigation.navigate("ForgotPassword", { email })} hitSlop={8} style={{ alignSelf: "flex-end" }}>
							<Text style={styles.link}>Mot de passe oublié ?</Text>
						</Pressable>
					) : null}
					{error ? <Text style={styles.error}>{error}</Text> : null}
					<Button title={mode === "login" ? "Se connecter" : "Créer mon compte"} onPress={submit} loading={busy} />
					<Text style={styles.legal}>En continuant, vous acceptez les conditions générales et la politique de confidentialité de Baume.</Text>
				</ScrollView>
			</KeyboardAvoidingView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: 24, paddingBottom: space.xxl, gap: 16 },
	reason: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
	link: { fontSize: font.label, fontWeight: "600", color: colors.brand },
	error: { fontSize: font.label, color: colors.danger },
	legal: { fontSize: font.small, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
});
