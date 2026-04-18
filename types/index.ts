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
  id: string;
  amount_required: number | string | null;
  ingredients: {
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
