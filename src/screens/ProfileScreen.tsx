import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { updateProfile } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";
import { Button, Card, Field, IconButton, Screen, SectionLabel, Title, TopBar } from "../components/ui";
import { colors, font, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

export default function ProfileScreen({ navigation }: RootScreenProps<"Profile">) {
	const { user, refreshUser } = useAuth();
	const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", address: "", postal_code: "", city: "", country: "CH" });
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!user) return;
		setForm({
			first_name: user.first_name || "",
			last_name: user.last_name || "",
			phone: user.phone || "",
			address: user.address || "",
			postal_code: user.postal_code || "",
			city: user.city || "",
			country: (user.country || "CH").toUpperCase(),
		});
	}, [user]);

	const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

	async function save() {
		setBusy(true);
		try {
			await updateProfile({
				first_name: form.first_name.trim() || null,
				last_name: form.last_name.trim() || null,
				phone: form.phone.trim() || null,
				address: form.address.trim() || null,
				postal_code: form.postal_code.trim() || null,
				city: form.city.trim() || null,
				country: form.country.trim().toUpperCase() || "CH",
			});
			await refreshUser();
			Alert.alert("Enregistré", "Vos informations sont à jour.");
			navigation.goBack();
		} catch (e) {
			Alert.alert("Enregistrement impossible", errorMessage(e));
		} finally {
			setBusy(false);
		}
	}

	if (!user) return null;

	return (
		<Screen edges={["top", "bottom"]}>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<Title size={26}>Mes informations</Title>
					<View style={{ flexDirection: "row", gap: 10 }}>
						<Field label="Prénom" value={form.first_name} onChangeText={set("first_name")} style={{ flex: 1 }} />
						<Field label="Nom" value={form.last_name} onChangeText={set("last_name")} style={{ flex: 1 }} />
					</View>
					<Field label="E-mail" value={user.email} editable={false} />
					<Text style={styles.note}>Pour changer d'adresse e-mail, utilisez la page Compte du site.</Text>
					<Field label="Téléphone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" />

					<SectionLabel>Adresse de livraison</SectionLabel>
					<Card style={{ padding: space.lg, gap: 12 }}>
						<Field label="Adresse" value={form.address} onChangeText={set("address")} autoComplete="street-address" />
						<View style={{ flexDirection: "row", gap: 10 }}>
							<Field label="NPA" value={form.postal_code} onChangeText={set("postal_code")} keyboardType="number-pad" style={{ width: 110 }} />
							<Field label="Ville" value={form.city} onChangeText={set("city")} style={{ flex: 1 }} />
						</View>
						<Field label="Pays (code)" value={form.country} onChangeText={set("country")} autoCapitalize="characters" maxLength={2} />
					</Card>
					<Text style={styles.note}>Le retrait gratuit à la boutique de Genève (Rue du Rhône 15) se choisit au moment de commander.</Text>
					<Button title="Enregistrer" onPress={save} loading={busy} />
				</ScrollView>
			</KeyboardAvoidingView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	note: { fontSize: font.small, color: colors.textMuted, lineHeight: 17 },
});
