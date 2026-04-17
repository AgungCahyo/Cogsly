-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: ingredients
create table ingredients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  unit text not null,
  category text not null,
  stock numeric default 0,
  low_stock_threshold numeric default 0,
  average_price numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: purchases
create table purchases (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references ingredients(id) not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  supplier text not null,
  price numeric not null,
  quantity numeric not null,
  evidence_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: products
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price numeric not null,
  operational_cost_buffer numeric default 0,
  is_percentage_buffer boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: recipe_items
create table recipe_items (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) not null,
  ingredient_id uuid references ingredients(id) not null,
  amount_required numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: sales
create table sales (
  id uuid default uuid_generate_v4() primary key,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  total_price numeric not null,
  total_hpp numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: sale_items
create table sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references sales(id) not null,
  product_id uuid references products(id) not null,
  quantity numeric not null,
  price numeric not null,
  hpp numeric not null
);

-- Create a storage bucket for receipts
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true);

-- Enable RLS and create basic permissive policies for development
alter table ingredients enable row level security;
alter table purchases enable row level security;
alter table products enable row level security;
alter table recipe_items enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

create policy "Allow all CRUD on ingredients" on ingredients for all using (true) with check (true);
create policy "Allow all CRUD on purchases" on purchases for all using (true) with check (true);
create policy "Allow all CRUD on products" on products for all using (true) with check (true);
create policy "Allow all CRUD on recipe_items" on recipe_items for all using (true) with check (true);
create policy "Allow all CRUD on sales" on sales for all using (true) with check (true);
create policy "Allow all CRUD on sale_items" on sale_items for all using (true) with check (true);

create policy "Allow public uploads to receipts" on storage.objects for insert with check (bucket_id = 'receipts');
create policy "Allow public access to receipts" on storage.objects for select using (bucket_id = 'receipts');
create policy "Allow updates to receipts" on storage.objects for update using (bucket_id = 'receipts');
create policy "Allow deletes to receipts" on storage.objects for delete using (bucket_id = 'receipts');
