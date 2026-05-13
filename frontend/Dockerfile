# Берём образ Nginx — это лёгкий веб-сервер для отдачи статических файлов (HTML/CSS/JS)
FROM nginx:alpine

# alpine — минимальная версия Linux, очень маленький размер образа

# Копируем наш HTML файл в папку, из которой Nginx отдаёт файлы
COPY index.html /usr/share/nginx/html/index.html

# Nginx слушает порт 80 по умолчанию
EXPOSE 80