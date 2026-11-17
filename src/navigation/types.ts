import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Product } from "../api/types";

export type TabParamList = {
	Home: undefined;
	Shop: { mode?: "besoin" | "produit" } | undefined;
	Cart: undefined;
	Loyalty: undefined;
	Account: undefined;
};

export type RootStackParamList = {
	Tabs: NavigatorScreenParams<TabParamList> | undefined;
	Welcome: undefined;
	Login: { mode?: "login" | "register"; reason?: string } | undefined;
	ForgotPassword: { email?: string } | undefined;
	Category: { kind: "besoin" | "produit"; slug: string; name?: string };
	Product: { slug: string; product?: Product };
	Search: undefined;
	Checkout: undefined;
	Confirmation: { sessionId: string };
	Orders: undefined;
	OrderDetail: { orderId: string };
	ReturnRequest: { orderId: string; label?: string };
	Settings: undefined;
	Security: undefined;
	Profile: undefined;
	Favorites: undefined;
	Chat: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ReactNavigation {
		interface RootParamList extends RootStackParamList {}
	}
}
