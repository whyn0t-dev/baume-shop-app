import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../store/CartProvider";
import type { RootStackParamList, TabParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import ShopScreen from "../screens/ShopScreen";
import CartScreen from "../screens/CartScreen";
import LoyaltyScreen from "../screens/LoyaltyScreen";
import AccountScreen from "../screens/AccountScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import CategoryScreen from "../screens/CategoryScreen";
import ProductScreen from "../screens/ProductScreen";
import SearchScreen from "../screens/SearchScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import ConfirmationScreen from "../screens/ConfirmationScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import ReturnRequestScreen from "../screens/ReturnRequestScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FavoritesScreen from "../screens/FavoritesScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [React.ComponentProps<typeof Ionicons>["name"], React.ComponentProps<typeof Ionicons>["name"]]> = {
	Home: ["home", "home-outline"],
	Shop: ["grid", "grid-outline"],
	Cart: ["bag-handle", "bag-handle-outline"],
	Loyalty: ["card", "card-outline"],
	Account: ["person", "person-outline"],
};

function Tabs() {
	const cart = useCart();
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: colors.brand,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
				tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
				tabBarIcon: ({ focused, color, size }) => <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />,
			})}
		>
			<Tab.Screen name="Home" component={HomeScreen} options={{ title: "Accueil" }} />
			<Tab.Screen name="Shop" component={ShopScreen} options={{ title: "Shop" }} />
			<Tab.Screen
				name="Cart"
				component={CartScreen}
				options={{ title: "Panier", tabBarBadge: cart.count || undefined, tabBarBadgeStyle: { backgroundColor: colors.brand, fontSize: 10 } }}
			/>
			<Tab.Screen name="Loyalty" component={LoyaltyScreen} options={{ title: "Fidélité" }} />
			<Tab.Screen name="Account" component={AccountScreen} options={{ title: "Compte" }} />
		</Tab.Navigator>
	);
}

export default function RootNavigator() {
	const { user, welcomeSeen } = useAuth();
	const showWelcome = !user && !welcomeSeen;
	return (
		<Stack.Navigator
			initialRouteName={showWelcome ? "Welcome" : "Tabs"}
			screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
		>
			<Stack.Screen name="Tabs" component={Tabs} />
			<Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: "fade", gestureEnabled: false }} />
			<Stack.Screen name="Login" component={LoginScreen} options={{ presentation: "modal" }} />
			<Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
			<Stack.Screen name="Category" component={CategoryScreen} />
			<Stack.Screen name="Product" component={ProductScreen} />
			<Stack.Screen name="Search" component={SearchScreen} options={{ animation: "fade" }} />
			<Stack.Screen name="Checkout" component={CheckoutScreen} />
			<Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ gestureEnabled: false }} />
			<Stack.Screen name="Orders" component={OrdersScreen} />
			<Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
			<Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} />
			<Stack.Screen name="Settings" component={SettingsScreen} />
			<Stack.Screen name="Profile" component={ProfileScreen} />
			<Stack.Screen name="Favorites" component={FavoritesScreen} />
		</Stack.Navigator>
	);
}
