-- Создаём таблицу задач при первом запуске
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,         -- автоматический уникальный номер
  title VARCHAR(255) NOT NULL,   -- название задачи
  description TEXT,              -- описание (необязательно)
  done BOOLEAN DEFAULT FALSE,    -- выполнена или нет
  created_at TIMESTAMP DEFAULT NOW()  -- дата создания
);