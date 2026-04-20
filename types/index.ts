export interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stock: number | string;
  low_stock_threshold: number | string | null;
  average_price: number | string | null;
}

export interface IngredientOption {
  id: string;
  name: string;
  unit: string | null;
  average_price?: number | string | null;
  stock?: number | string | null;
}

export interface PurchasePoint {
  date: string | number | Date;
  price: number | string;
  quantity: number | string;
  purchase_unit?: string | null;
  unit_conversion?: number | string | null;
}

export interface RecipeItemRow {
  id?: string;
  ingredient_id?: string;
  amount_required: number | string | null;
  ingredients?: {
    name: string;
    unit: string | null;
    average_price: number | string | null;
    stock: number | string | null;
  } | null;
}

export interface ProductRow {
  id: string;
  name: string;
  price: number | string | null;
  operational_cost_buffer: number | string | null;
  is_percentage_buffer: boolean | null;
  recipe_items: RecipeItemRow[] | null;
}

export interface RecipeInput {
  name: string;
  price: number;
  operational_cost_buffer: number;
  is_percentage_buffer: boolean;
  items: { ingredient_id: string; amount_required: number }[];
}

// Recap & Analytics Types
export interface SaleRow {
  id: string;
  date: string;
  total_price: number | string;
  total_hpp: number | string;
}

export interface SaleItemRow {
  sale_id: string;
  product_id: string;
  quantity: number | string;
  price: number | string;
  hpp: number | string;
  products: { name: string } | null;
}

export interface PurchaseRow {
  id: string;
  date: string;
  price: number | string;
  quantity: number | string;
  supplier: string | null;
  ingredients: { name: string; category: string | null; unit?: string | null } | null;
}

export interface PurchaseLogRow extends Omit<PurchaseRow, 'ingredients'> {
  evidence_url: string | null;
  purchase_unit: string | null;
  unit_conversion: number | string | null;
  ingredients: { name: string; unit: string | null } | null;
}

export interface PeriodStats {
  revenue: number;
  hpp: number;
  grossProfit: number;
  expenses: number;
  netCashflow: number;
  orders: number;
  purchaseCount: number;
  margin: number;
}

export interface ChartPoint {
  date: string;
  revenue: number;
  hpp: number;
  profit: number;
  expenses: number;
  cashflow: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

export type RecapTab = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ChartMode = 'revenue' | 'cashflow';

// POS Specific Types
export interface POSRecipeItem {
  ingredient_id: string;
  amount_required: number;
  ingredient_name?: string;
  ingredient_unit?: string | null;
  ingredient_stock?: number;
}

export interface POSProduct {
  id: string;
  name: string;
  price: number;
  hpp: number;
  recipe_items?: POSRecipeItem[] | null;
}

export type CartItem = POSProduct & { qty: number };

export interface SaleCartItem {
  id: string;
  price: number;
  hpp: number;
  qty: number;
  recipe_items?: POSRecipeItem[] | null;
}

// Auth & Profiles
export type UserRole = 'admin' | 'warehouse' | 'cashier' | 'waiter';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

// Professional System Additions
export interface Table {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved';
  created_at: string;
}

export interface Order {
  id: string;
  table_id: string | null;
  waiter_id: string | null;
  customer_name: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'cash' | 'qris' | 'debit' | 'credit' | null;
  total_price: number;
  total_hpp: number;
  created_at: string;
  completed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  hpp: number;
  created_at: string;
}
