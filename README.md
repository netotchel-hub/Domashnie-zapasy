# 🍞 Домашние запасы - Telegram Mini App

Telegram Mini App магазин продуктов с доставкой.

## 🚀 Быстрый старт

### 1. Настройка базы данных (Supabase)
1. Создайте проект на [supabase.com](https://supabase.com)
2. В SQL Editor выполните:
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  composition TEXT NOT NULL,
  weight TEXT NOT NULL,
  price DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_tg_id BIGINT,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_street TEXT NOT NULL,
  delivery_house TEXT NOT NULL,
  delivery_apartment TEXT,
  order_items JSONB NOT NULL,
  total_amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'новый',
  agreement_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавьте ваши товары
INSERT INTO products (category, name, composition, weight, price) VALUES
('выпечка', 'Батон', 'мука, вода, подсолнечное масло, сахар, дрожжи, соль', '280 грамм', 85),
('выпечка', 'Плетёнка с маком', 'мука, вода, подсолнечное масло, сахар, дрожжи, соль, мак', '280 грамм', 95);
