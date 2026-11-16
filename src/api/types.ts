export type User = {
	id: string;
	email: string;
	first_name?: string | null;
	last_name?: string | null;
	phone?: string | null;
	address?: string | null;
	postal_code?: string | null;
	city?: string | null;
	country?: string | null;
	role?: string | null;
	created_at?: string | null;
};

export type Product = {
	id: string;
	slug: string;
	name?: string | null;
	title?: string | null;
	tagline?: string | null;
	description?: string | null;
	price: number | string;
	compare_price?: number | string | null;
	image?: string | null;
	product_category?: string | null;
	needs?: string[] | null;
	sizes?: string[] | null;
	colors?: string[] | null;
	available?: boolean | null;
	stock?: number | null;
	bestseller?: boolean | null;
	featured?: boolean | null;
	preorder?: boolean | null;
	preorder_shipping_date?: string | null;
	preorder_message?: string | null;
	benefits?: string[] | null;
	how_to_use?: string | null;
	composition?: string | null;
	care_instructions?: string | null;
	shipping_returns?: string | null;
	rating?: number | null;
	reviews_count?: number | null;
	created_at?: string | null;
};

export type Variant = {
	id: string;
	product_id: string;
	title?: string | null;
	option1?: string | null;
	option2?: string | null;
	option3?: string | null;
	price?: number | string | null;
	stock?: number | null;
	available?: boolean | null;
	active?: boolean | null;
	sku?: string | null;
};

export type ProductImage = { id?: string; public_url?: string | null; storage_path?: string | null; url?: string | null; position?: number | null };

export type Category = { id?: string; kind: string; slug: string; name: string; description?: string | null; image?: string | null };

export type OrderItem = {
	id?: string;
	product_id?: string | null;
	variant_id?: string | null;
	product_title?: string | null;
	variant_title?: string | null;
	quantity: number;
	unit_price?: number | string | null;
	total_price?: number | string | null;
};

export type Order = {
	id: string;
	order_number?: string | number | null;
	status: string;
	currency?: string | null;
	subtotal?: number | string | null;
	shipping_total?: number | string | null;
	discount_total?: number | string | null;
	discount_code?: string | null;
	total?: number | string | null;
	email?: string | null;
	created_at: string;
	shipping_address?: Record<string, any> | null;
	carrier?: string | null;
	tracking_number?: string | null;
	tracking_url?: string | null;
	order_items?: OrderItem[];
};

export type LoyaltyCode = { code: string; reward?: number | string | null; used?: boolean; created_at?: string | null; points_spent?: number | null };
export type LoyaltyTransaction = { id?: string; points?: number; reason?: string | null; type?: string | null; created_at?: string | null };
export type LoyaltyThreshold = { points: number; reward: number; label: string };

export type Loyalty = {
	points: number;
	total_earned: number;
	total_spent: number;
	generated_codes: LoyaltyCode[];
	transactions: LoyaltyTransaction[];
	next_threshold: LoyaltyThreshold | null;
	thresholds: LoyaltyThreshold[];
};

export type CheckoutSession = { url: string; session_id: string; total: number };

export type CheckoutStatus = {
	payment_status?: string;
	status?: string;
	order_id?: string | null;
	order_number?: string | number | null;
	order_ready?: boolean;
	[key: string]: any;
};

export type Conversation = {
	id: string;
	status: "open" | "locked" | string;
	last_message_at?: string | null;
	created_at?: string | null;
	admin_typing_at?: string | null;
	locked_at?: string | null;
};

export type ChatMessage = {
	id: string;
	conversation_id: string;
	sender_id?: string | null;
	sender_role: "customer" | "admin" | string;
	content: string;
	created_at: string;
	read_at?: string | null;
};
