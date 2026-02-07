#!/bin/bash

# Скрипт для генерации PNG файлов из PlantUML диаграмм через Docker
# Использование: ./generate_diagrams_docker.sh
# Требования: Docker должен быть установлен и запущен

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Генерация PNG файлов из PlantUML диаграмм через Docker...${NC}"
echo ""

# Переходим в корневую директорию проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Ошибка: Docker не найден${NC}"
    echo "Установите Docker или используйте generate_diagrams.sh с локальным PlantUML"
    exit 1
fi

# Проверяем, что Docker запущен
if ! docker info &> /dev/null; then
    echo -e "${RED}Ошибка: Docker не запущен${NC}"
    echo "Запустите Docker и попробуйте снова"
    exit 1
fi

echo -e "${BLUE}Используется: Docker (plantuml/plantuml)${NC}"
echo ""

# Счетчики
success_count=0
fail_count=0

# Находим все .puml файлы, исключая template директорию
find diagrams -name "*.puml" -type f -not -path "*/template/*" | while read -r puml_file; do
    # Получаем директорию файла
    file_dir=$(dirname "$puml_file")
    file_name=$(basename "$puml_file" .puml)
    png_file="${file_dir}/${file_name}.png"
    
    echo -e "${YELLOW}Обработка: ${puml_file}${NC}"
    
    # Генерируем PNG через Docker
    # Монтируем всю директорию diagrams для правильной работы include
    if docker run --rm \
        -v "$SCRIPT_DIR:/work" \
        -w "/work" \
        plantuml/plantuml \
        -tpng "/work/$puml_file" 2>&1; then
        echo -e "${GREEN}✓ Создан: ${png_file}${NC}"
        ((success_count++))
    else
        echo -e "${RED}✗ Ошибка при обработке: ${puml_file}${NC}"
        ((fail_count++))
    fi
    
    echo ""
done

echo -e "${GREEN}Генерация завершена!${NC}"
echo "Успешно: $success_count"
if [ $fail_count -gt 0 ]; then
    echo -e "${RED}Ошибок: $fail_count${NC}"
fi
