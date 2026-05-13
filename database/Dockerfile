# Берём официальный образ PostgreSQL версии 15
FROM postgres:15

# Копируем наш SQL-файл в специальную папку.
# Все .sql файлы в этой папке PostgreSQL выполнит автоматически при первом старте
COPY init.sql /docker-entrypoint-initdb.d/init.sql