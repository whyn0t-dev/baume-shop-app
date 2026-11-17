import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { errorMessage } from "../api/client";
import { fetchMyOrders } from "../api/endpoints";
import type { Order } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { Badge, Button, Card, EmptyState, ErrorBanner, IconButton, Screen, SectionLabel, SkeletonRows, Title, TopBar } from "../components/ui";
import { FadeIn, PressableScale, stagger } from "../components/motion";
import { money, orderLabel, orderStatus, shortDate } from "../lib/format";
import { colors, font, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";
import { OrderSteps } from "./OrderDetailScreen";

const ACTIVE = new Set(["paid", "processing", "shipped"]);

export default function OrdersScreen({ navigation }: RootScreenProps<"Orders">) {
	const { user } = useAuth();
	const [orders, setOrders] = useState<Order[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(async () => {
		try {
			setOrders(await fetchMyOrders());
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger vos commandes."));
		} finally {
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			if (user) load();
		}, [user, load]),
	);

	const active = (orders || []).filter((o) => ACTIVE.has(o.status));
	const past = (orders || []).filter((o) => !ACTIVE.has(o.status));
	const count = (o: Order) => (o.order_items || []).reduce((s, i) => s + (i.quantity || 0), 0);

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			{!user ? (
				<EmptyState icon="cube-outline" title="Connectez-vous" text="Vos commandes apparaissent ici une fois connectée.">
					<Button title="Se connecter" onPress={() => navigation.navigate("Login", { mode: "login" })} />
				</EmptyState>
			) : (
				<FlatList
					data={past}
					keyExtractor={(o) => o.id}
					contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 10 }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
					ListHeaderComponent={
						<View style={{ gap: 12, marginBottom: 4 }}>
							<Title size={26}>Mes commandes</Title>
							<ErrorBanner message={error} onRetry={load} />
							{orders === null && !error ? <SkeletonRows count={3} /> : null}
							{active.map((o, i) => (
								<FadeIn key={o.id} delay={stagger(i, 60)}>
								<PressableScale scaleTo={0.98} onPress={() => navigation.navigate("OrderDetail", { orderId: o.id })}>
									<Card style={{ padding: space.lg, gap: 14 }}>
										<View style={styles.between}>
											<View style={{ gap: 2, flex: 1 }}>
												<Text style={styles.kicker}>En cours</Text>
												<Text style={styles.strong}>
													Commande {orderLabel(o)} · {money(o.total)}
												</Text>
											</View>
											<Badge label={orderStatus(o.status).label} tone={orderStatus(o.status).tone} />
										</View>
										<OrderSteps order={o} />
									</Card>
								</PressableScale>
								</FadeIn>
							))}
							{past.length ? <SectionLabel>Historique</SectionLabel> : null}
						</View>
					}
					ListEmptyComponent={
						orders && !active.length ? (
							<EmptyState icon="cube-outline" title="Aucune commande" text="Vos commandes en ligne et vos achats en boutique apparaîtront ici.">
								<Button title="Découvrir le shop" onPress={() => navigation.navigate("Tabs", { screen: "Shop" })} />
							</EmptyState>
						) : undefined
					}
					renderItem={({ item, index }) => (
						<FadeIn delay={stagger(index + active.length, 50)}>
						<PressableScale scaleTo={0.98} onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}>
							<Card style={styles.row}>
								<View style={{ flex: 1, gap: 4 }}>
									<Text style={styles.strong}>Commande {orderLabel(item)}</Text>
									<Text style={styles.muted}>
										{shortDate(item.created_at)} · {count(item)} article{count(item) > 1 ? "s" : ""}
									</Text>
								</View>
								<View style={{ alignItems: "flex-end", gap: 6 }}>
									<Text style={styles.strong}>{money(item.total)}</Text>
									<Badge label={orderStatus(item.status).label} tone={orderStatus(item.status).tone} />
								</View>
							</Card>
						</PressableScale>
						</FadeIn>
					)}
				/>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	between: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
	kicker: { fontSize: font.small, letterSpacing: 1.2, textTransform: "uppercase", color: colors.taupeWarm, fontWeight: "700" },
	strong: { fontSize: 15, fontWeight: "600", color: colors.text },
	muted: { fontSize: font.small, color: colors.textMuted },
	row: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg },
});
