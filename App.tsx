import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { CartProvider } from "./src/store/CartProvider";
import { FavoritesProvider } from "./src/store/FavoritesProvider";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

const theme = {
	...DefaultTheme,
	colors: { ...DefaultTheme.colors, primary: colors.brand, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
};

function Root() {
	const { ready } = useAuth();
	if (!ready) return null; // l'écran de démarrage reste affiché
	return (
		<NavigationContainer theme={theme}>
			<StatusBar style="dark" />
			<RootNavigator />
		</NavigationContainer>
	);
}

export default function App() {
	// Polices embarquées : chargement quasi instantané. En cas d'échec, police système.
	const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold });
	if (!fontsLoaded && !fontError) return null;
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<AuthProvider>
					<CartProvider>
						<FavoritesProvider>
							<Root />
						</FavoritesProvider>
					</CartProvider>
				</AuthProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
