import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BaumeLogo } from "../components/BaumeLogo";
import { Button } from "../components/ui";
import { useAuth } from "../auth/AuthProvider";
import { colors, font, fonts, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const POINTS: [React.ComponentProps<typeof Ionicons>["name"], string][] = [
	["grid-outline", "Des produits choisis par besoin"],
	["card-outline", "Votre carte fidélité toujours sur vous"],
	["cube-outline", "Livraison ou retrait à Genève"],
];

export default function WelcomeScreen({ navigation }: RootScreenProps<"Welcome">) {
	const { markWelcomeSeen } = useAuth();

	function go(target: "register" | "login" | "browse") {
		markWelcomeSeen();
		if (target === "browse") navigation.replace("Tabs");
		else {
			navigation.replace("Tabs");
			navigation.navigate("Login", { mode: target });
		}
	}

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<View style={styles.content}>
				<BaumeLogo width={170} color={colors.background} />
				<Text style={styles.title}>Une boutique douce et guidée, sans jugement.</Text>
				<View style={{ gap: space.lg, marginTop: space.xl }}>
					{POINTS.map(([icon, text]) => (
						<View key={text} style={styles.point}>
							<Ionicons name={icon} size={22} color={colors.taupe} />
							<Text style={styles.pointText}>{text}</Text>
						</View>
					))}
				</View>
			</View>
			<View style={styles.actions}>
				<Button title="Créer un compte" variant="light" onPress={() => go("register")} />
				<Button title="Se connecter" variant="outlineLight" onPress={() => go("login")} />
				<Pressable onPress={() => go("browse")} hitSlop={10} style={{ alignSelf: "center", padding: space.sm }}>
					<Text style={styles.skip}>Découvrir sans compte</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.brand },
	content: { flex: 1, paddingHorizontal: 28, paddingTop: 72 },
	title: { marginTop: 36, fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.background },
	point: { flexDirection: "row", alignItems: "center", gap: 12 },
	pointText: { fontSize: font.body, color: colors.background },
	actions: { paddingHorizontal: 28, paddingBottom: space.lg, gap: 10 },
	skip: { fontSize: 14, fontWeight: "600", color: colors.taupe },
});
