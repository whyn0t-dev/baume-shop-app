import { api } from "./client";
import type { Category, ChatMessage, CheckoutSession, CheckoutStatus, Conversation, Loyalty, Order, Product, ProductImage, User, Variant } from "./types";

const arr = <T,>(data: any): T[] => (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);

// ── Catalogue ──────────────────────────────────────────────────────────────
export type ProductQuery = {
	category?: string;
	need?: string;
	search?: string;
	size?: string;
	max_price?: number;
	available?: boolean;
	bestseller?: boolean;
	featured?: boolean;
	limit?: number;
};

export async function fetchProducts(params: ProductQuery = {}) {
	const res = await api.get("/products", { params: { limit: 200, ...params } });
	return arr<Product>(res.data);
}

export async function fetchProduct(slug: string) {
	const res = await api.get(`/products/${encodeURIComponent(slug)}`);
	return res.data as Product;
}

export async function fetchVariants(productId: string) {
	const res = await api.get(`/products/${productId}/variants`);
	return arr<Variant>(res.data);
}

export async function fetchProductImages(productId: string) {
	const res = await api.get(`/products/${productId}/images`);
	return arr<ProductImage>(res.data);
}

export async function fetchCategories(kind: "besoin" | "produit") {
	const res = await api.get("/categories", { params: { kind } });
	return arr<Category>(res.data);
}

export async function fetchCategory(kind: "besoin" | "produit", slug: string) {
	const res = await api.get(`/categories/${kind}/${slug}`);
	return res.data as Category;
}

// ── Compte ─────────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
	const res = await api.post("/auth/login", { email, password });
	return res.data as { user: User; access_token: string; refresh_token: string };
}

export async function register(payload: { email: string; password: string; first_name?: string; last_name?: string }) {
	const res = await api.post("/auth/register", payload);
	return res.data as { user: User };
}

export async function forgotPassword(email: string) {
	await api.post("/auth/forgot-password", { email });
}

export async function fetchMe() {
	const res = await api.get("/me");
	return res.data as User;
}

export async function updateProfile(payload: Partial<Pick<User, "first_name" | "last_name" | "phone" | "address" | "postal_code" | "city" | "country">>) {
	const res = await api.patch("/auth/me", payload);
	return res.data;
}

export async function fetchMyOrders() {
	const res = await api.get("/orders/mine");
	return arr<Order>(res.data);
}

export async function fetchOrder(orderId: string) {
	const res = await api.get(`/orders/${orderId}`);
	return res.data as Order;
}

export type ReturnReason = "defective" | "wrong_item" | "not_as_described" | "changed_mind" | "other";

export async function createReturnRequest(payload: { order_id: string; reason: ReturnReason; message: string }) {
	const res = await api.post("/returns", { ...payload, images: [] });
	return res.data;
}

// ── Fidélité ───────────────────────────────────────────────────────────────
export async function fetchLoyalty() {
	const res = await api.get("/loyalty/me");
	return res.data as Loyalty;
}

export async function convertPoints(points: number) {
	const res = await api.post("/loyalty/convert", { points });
	return res.data as { code?: string; reward?: number; [k: string]: any };
}

// ── Codes promo ────────────────────────────────────────────────────────────
export type Discount = { code: string; type: string; value: number | string; min_order_amount?: number | string | null };

export async function fetchDiscount(code: string) {
	const res = await api.get(`/discounts/${encodeURIComponent(code.trim().toUpperCase())}`);
	return res.data as Discount;
}

// ── Paiement (Stripe Checkout, même route que le site) ─────────────────────
export type CheckoutPayload = {
	items: { product_id: string; variant_id?: string | null; name: string; price: number; quantity: number; size?: string | null; color?: string | null }[];
	email?: string;
	shipping_country: string;
	shipping_address: Record<string, any>;
	shipping_method?: "delivery" | "pickup";
	discount_code?: string | null;
};

export async function createCheckout(payload: CheckoutPayload) {
	const res = await api.post("/checkout/session", {
		...payload,
		origin_url: "https://baumeshop-v2.weblax.fr",
		// Le backend renvoie vers l'app (schéma baume-shop://) une fois le paiement terminé.
		success_url: "baume-shop://checkout/success",
		cancel_url: "baume-shop://checkout/cancel",
	});
	return res.data as CheckoutSession;
}

export async function fetchCheckoutStatus(sessionId: string) {
	const res = await api.get(`/checkout/status/${sessionId}`);
	return res.data as CheckoutStatus;
}

// ── Messagerie avec l'équipe Baume (même système que la bulle du site) ─────
export async function fetchConversations() {
	const res = await api.get("/conversations/mine");
	return arr<Conversation>(res.data);
}

export async function startConversation(content: string) {
	const res = await api.post("/conversations", { content });
	return res.data as Conversation;
}

export async function fetchMessages(conversationId: string) {
	const res = await api.get(`/conversations/${conversationId}/messages`);
	return arr<ChatMessage>(res.data);
}

export async function sendMessage(conversationId: string, content: string) {
	const res = await api.post(`/conversations/${conversationId}/messages`, { content });
	return res.data as ChatMessage;
}

export async function setTyping(conversationId: string, typing: boolean) {
	await api.patch(`/conversations/${conversationId}/typing`, { role: typing ? "customer" : null });
}

export async function fetchUnreadCount() {
	const res = await api.get("/conversations/unread-count");
	return Number(res.data?.unread || 0);
}
