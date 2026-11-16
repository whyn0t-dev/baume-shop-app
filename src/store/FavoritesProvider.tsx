import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product } from "../api/types";

// Favoris enregistrés sur le téléphone (le site n'a pas encore de favoris côté serveur).
const KEY = "shop_favorites_v1";

type FavValue = {
	favorites: Product[];
	isFavorite: (id: string) => boolean;
	toggle: (p: Product) => void;
};

const FavContext = createContext<FavValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
	const [favorites, setFavorites] = useState<Product[]>([]);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		AsyncStorage.getItem(KEY)
			.then((raw) => raw && setFavorites(JSON.parse(raw)))
			.catch(() => {})
			.finally(() => setLoaded(true));
	}, []);

	useEffect(() => {
		if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(favorites)).catch(() => {});
	}, [favorites, loaded]);

	const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);
	const toggle = useCallback((p: Product) => {
		setFavorites((prev) => (prev.some((f) => f.id === p.id) ? prev.filter((f) => f.id !== p.id) : [p, ...prev]));
	}, []);

	const value = useMemo(() => ({ favorites, isFavorite, toggle }), [favorites, isFavorite, toggle]);
	return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites() {
	const ctx = useContext(FavContext);
	if (!ctx) throw new Error("useFavorites doit être utilisé dans FavoritesProvider");
	return ctx;
}
