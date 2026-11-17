import React from "react";
import { FlatList, Text, View } from "react-native";
import { useFavorites } from "../store/FavoritesProvider";
import { Button, EmptyState, IconButton, ProductCard, Screen, Title, TopBar } from "../components/ui";
import { FadeIn, stagger } from "../components/motion";
import { colors, font, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

export default function FavoritesScreen({ navigation }: RootScreenProps<"Favorites">) {
	const { favorites } = useFavorites();
	return (
		<Screen>
			<TopBar
				left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />}
				right={favorites.length ? <Text style={{ fontSize: font.label, color: colors.textMuted }}>{favorites.length} produit{favorites.length > 1 ? "s" : ""}</Text> : null}
			/>
			<FlatList
				data={favorites}
				numColumns={2}
				keyExtractor={(p) => p.id}
				columnWrapperStyle={{ gap: 16 }}
				contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 18 }}
				ListHeaderComponent={<Title size={26}>Mes favoris</Title>}
				ListEmptyComponent={
					<EmptyState icon="heart-outline" title="Aucun favori" text="Touchez le cœur d'un produit pour le retrouver ici.">
						<Button title="Découvrir le shop" onPress={() => navigation.navigate("Tabs", { screen: "Shop" })} />
					</EmptyState>
				}
				renderItem={({ item, index }) => (
					<FadeIn delay={stagger(index, 50, 6)} style={{ flex: 1 }}>
						<ProductCard product={item} onPress={() => navigation.navigate("Product", { slug: item.slug, product: item })} />
					</FadeIn>
				)}
			/>
		</Screen>
	);
}
