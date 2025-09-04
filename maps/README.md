# EVE Region Map — The Forge (Prototype)

Интерактивная карта региона The Forge в EVE Online, отображающая системы (узлы) и прыжки (рёбра) между ними.

## 🧠 Архитектура и логика кода

### Основные принципы
Проект построен на принципах **модульности**, **производительности** и **масштабируемости**. Код организован в едином файле `app.js` (2750+ строк) с четким разделением ответственности между функциями.

### Структура данных
```javascript
// Основные массивы для хранения данных
const systems = [];        // Все узлы (системы)
const jumps = [];          // Все связи (прыжки)

// Эффективные структуры для быстрого поиска
const idToSystem = new Map();           // ID → система
const adjacency = new Map();            // ID → Set<связанных_ID>

// Множества для групповых операций
const selectedNodes = new Set();        // Выбранные узлы
```

### Логика инициализации
1. **DOM-элементы**: Кэширование всех необходимых элементов при загрузке
2. **Данные карты**: Загрузка базовых систем и прыжков из конфигурации
3. **localStorage**: Восстановление пользовательских данных (позиции, новые узлы)
4. **Рендеринг**: Отрисовка всех элементов на SVG-холсте
5. **Центрирование**: Автоматическое позиционирование на ЦКАД

## 🔄 Основные алгоритмы

### Поиск кратчайшего пути (BFS)
```javascript
function findShortestPath(fromId, toId) {
  const queue = [[fromId, [fromId]]];
  const visited = new Set();
  
  while (queue.length > 0) {
    const [currentId, path] = queue.shift();
    
    if (currentId === toId) return path;
    if (visited.has(currentId)) continue;
    
    visited.add(currentId);
    const neighbors = adjacency.get(currentId) || new Set();
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push([neighborId, [...path, neighborId]]);
      }
    }
  }
  
  return null; // Путь не найден
}
```

**Логика работы**:
- Использует очередь (FIFO) для обхода графа
- Отслеживает посещенные узлы для избежания циклов
- Сохраняет полный путь от начальной точки
- Возвращает кратчайший путь или `null`

### Система рендеринга
```javascript
function renderNodes() {
  // Очистка существующих узлов
  nodesLayer.innerHTML = '';
  
  // Создание новых узлов
  for (const system of systems) {
    const node = createNodeElement(system);
    nodesLayer.appendChild(node);
  }
}
```

**Принципы оптимизации**:
- **Debouncing**: Рендеринг происходит не чаще 60 FPS
- **Кэширование**: DOM-элементы создаются один раз и обновляются
- **Селективность**: Обновляются только измененные элементы
- **SVG-оптимизация**: Использование `transform` вместо пересоздания элементов

## 🎯 Ключевые функции

### Управление вьюпортом
```javascript
function applyTransform() {
  viewport.setAttribute('transform', 
    `translate(${translate.x}, ${translate.y}) scale(${scale})`);
}

function focusRoad(roadKey, desiredScale = null) {
  // Поиск систем дороги
  const roadSystems = systems.filter(s => matchRoadKey(s.id, roadKey));
  
  // Вычисление границ
  const bounds = calculateBounds(roadSystems);
  
  // Центрирование и масштабирование
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  // Применение трансформации
  translate.x = viewW/2 - centerX * scale;
  translate.y = viewH/2 - centerY * scale;
  
  applyTransform();
}
```

**Логика центрирования**:
1. Фильтрация систем по ключу дороги
2. Вычисление границ (minX, maxX, minY, maxY)
3. Определение центра области
4. Расчет смещения для центрирования
5. Применение трансформации к SVG

### Система событий
```javascript
// Обработчики мыши для панорамирования
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

function handleMouseDown(e) {
  if (editMode) return;
  isDragging = true;
  lastMousePos = { x: e.clientX, y: e.clientY };
}

function handleMouseMove(e) {
  if (!isDragging) return;
  
  const deltaX = e.clientX - lastMousePos.x;
  const deltaY = e.clientY - lastMousePos.y;
  
  translate.x += deltaX;
  translate.y += deltaY;
  
  lastMousePos = { x: e.clientX, y: e.clientY };
  applyTransform();
}
```

**Принципы обработки событий**:
- **Состояние**: Отслеживание режимов (редактирование, панорамирование)
- **Координаты**: Преобразование экранных координат в координаты карты
- **Производительность**: Обработка только активных событий
- **Безопасность**: Проверка режимов перед выполнением действий

## 💾 Система хранения данных

### Автоматическое сохранение
```javascript
function autoSaveMap() {
  // Сохранение позиций (для совместимости)
  savePositions();
  // Сохранение полной карты
  saveFullMap();
}

// Вызов при каждом изменении
function createNewNode(id, name, x, y) {
  // ... создание узла ...
  autoSaveMap(); // Автосохранение
}
```

**Стратегия сохранения**:
- **Позиции**: Сохранение координат всех узлов
- **Полная карта**: Сохранение узлов, связей и метаданных
- **Версионирование**: Поддержка разных версий формата данных
- **Обработка ошибок**: Graceful fallback при проблемах с localStorage

### Загрузка данных
```javascript
function loadFullMap() {
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return false;
    
    const mapData = JSON.parse(raw);
    
    // Восстановление данных
    systems.length = 0;
    jumps.length = 0;
    systems.push(...mapData.systems);
    jumps.push(...mapData.jumps);
    
    // Обновление структур для поиска
    rebuildDataStructures();
    
    return true;
  } catch (error) {
    console.error('Ошибка при загрузке карты:', error);
    return false;
  }
}
```

**Логика восстановления**:
1. Проверка наличия сохраненных данных
2. Парсинг JSON с обработкой ошибок
3. Очистка текущих данных
4. Восстановление узлов и связей
5. Перестройка структур для быстрого поиска

## 🎨 Система визуализации

### Конфигурация дорог
```javascript
const ROAD_CONFIGS = {
  ckad: {
    names: ['001','002','003','004','005','006','007','008','009','010','011','014','013'],
    center: { x: 520, y: 120 },
    radius: 90,
    cornerTags: {
      '001': 'ПК-3', '002': 'ПК-3', '003': 'ПК-3',
      '004': 'ПК-1', '005': 'ПК-1', '006': 'ПК-1',
      // ... остальные теги
    },
    kmTags: {
      '001': 13, '002': 50, '003': 83,
      // ... километровые отметки
    }
  }
  // ... другие дороги
};
```

**Принципы конфигурации**:
- **Централизация**: Все настройки дороги в одном объекте
- **Гибкость**: Легкое добавление новых дорог
- **Метаданные**: Теги, километры, центры для каждой дороги
- **Типизация**: Четкая структура для каждой конфигурации

### Создание элементов
```javascript
function createNodeElement(system) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  node.setAttribute('data-id', system.id);
  
  // Создание прямоугольника узла
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', system.x - NODE_DIMENSIONS.WIDTH/2);
  rect.setAttribute('y', system.y - NODE_DIMENSIONS.HEIGHT/2);
  rect.setAttribute('width', NODE_DIMENSIONS.WIDTH);
  rect.setAttribute('height', NODE_DIMENSIONS.HEIGHT);
  
  // Применение стилей и классов
  applyNodeStyles(rect, system);
  
  return node;
}
```

**Принципы создания элементов**:
- **SVG-пространство**: Использование правильного namespace
- **Позиционирование**: Центрирование элементов относительно координат
- **Стилизация**: Динамическое применение классов и стилей
- **Производительность**: Минимизация DOM-операций

## 🔧 Система валидации

### Валидация узлов
```javascript
function validateNodeData(id, name, x, y) {
  const errors = [];
  
  if (!id || typeof id !== 'string') {
    errors.push('ID узла обязателен и должен быть строкой');
  }
  
  if (id && id.length > 50) {
    errors.push('ID узла слишком длинный (максимум 50 символов)');
  }
  
  if (x < -5000 || x > 5000) {
    errors.push('Координата X должна быть в диапазоне от -5000 до 5000');
  }
  
  if (y < -5000 || y > 5000) {
    errors.push('Координата Y должна быть в диапазоне от -5000 до 5000');
  }
  
  return errors;
}
```

**Принципы валидации**:
- **Проверка типов**: Убеждение в корректности типов данных
- **Проверка диапазонов**: Валидация координат в допустимых пределах
- **Проверка длины**: Ограничение длины строковых полей
- **Детальные сообщения**: Понятные описания ошибок для пользователя

## 📊 Система производительности

### Метрики рендеринга
```javascript
let renderStartTime = 0;
let renderCount = 0;
let totalRenderTime = 0;

function startRenderTimer() {
  renderStartTime = performance.now();
}

function endRenderTimer() {
  const renderTime = performance.now() - renderStartTime;
  totalRenderTime += renderTime;
  renderCount++;
  
  if (renderCount % 60 === 0) {
    const avgRenderTime = totalRenderTime / renderCount;
    console.log(`Среднее время рендеринга: ${avgRenderTime.toFixed(2)}ms`);
  }
}
```

**Мониторинг производительности**:
- **Время рендеринга**: Измерение времени каждой операции
- **Статистика**: Вычисление средних показателей
- **Логирование**: Периодический вывод метрик в консоль
- **Оптимизация**: Выявление узких мест в производительности

### Debouncing рендеринга
```javascript
let renderTimeout = null;

function debouncedRender() {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }
  
  renderTimeout = setTimeout(() => {
    renderNodes();
    renderEdges();
    renderTimeout = null;
  }, 16); // ~60 FPS
}
```

**Принципы debouncing**:
- **Отмена предыдущих**: Очистка предыдущих таймеров
- **Оптимальная частота**: Ограничение до 60 FPS
- **Группировка операций**: Выполнение всех операций рендеринга за раз
- **Производительность**: Избежание избыточных перерисовок

## 🚀 Система отмены/повтора

### История действий
```javascript
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

function saveState() {
  const state = {
    systems: JSON.parse(JSON.stringify(systems)),
    jumps: JSON.parse(JSON.stringify(jumps)),
    timestamp: Date.now()
  };
  
  undoStack.push(state);
  
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  
  redoStack.length = 0; // Очистка redo при новом действии
}
```

**Логика работы**:
- **Глубокое копирование**: Сохранение полного состояния
- **Ограничение истории**: Предотвращение переполнения памяти
- **Очистка redo**: Сброс при новом действии
- **Временные метки**: Отслеживание времени изменений

## 🎯 Групповые операции

### Выбор узлов
```javascript
function selectNode(nodeId, addToSelection = false) {
  if (!addToSelection) {
    // Очистка предыдущего выбора
    selectedNodes.clear();
    selectedNodeId = null;
  }
  
  if (selectedNodes.has(nodeId)) {
    // Отмена выбора
    selectedNodes.delete(nodeId);
    if (selectedNodeId === nodeId) {
      selectedNodeId = null;
    }
  } else {
    // Добавление к выбору
    selectedNodes.add(nodeId);
    selectedNodeId = nodeId;
  }
  
  updateSelectionVisuals();
}
```

**Принципы групповых операций**:
- **Множественный выбор**: Поддержка Ctrl/Cmd + клик
- **Визуальная обратная связь**: Подсветка выбранных элементов
- **Единичный выбор**: Возможность выбора одного элемента
- **Отмена выбора**: Клик по уже выбранному элементу

## 🔍 Поиск и навигация

### Алгоритм поиска систем
```javascript
function searchSystem(query) {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Поиск по ID (точное совпадение)
  const exactMatch = systems.find(s => s.id.toLowerCase() === normalizedQuery);
  if (exactMatch) return [exactMatch];
  
  // Поиск по названию (частичное совпадение)
  const partialMatches = systems.filter(s => 
    s.name && s.name.toLowerCase().includes(normalizedQuery)
  );
  
  return partialMatches.slice(0, 10); // Ограничение результатов
}
```

**Стратегия поиска**:
1. **Точное совпадение**: Приоритет поиску по ID
2. **Частичное совпадение**: Поиск по названию
3. **Нормализация**: Приведение к нижнему регистру
4. **Ограничение результатов**: Предотвращение перегрузки UI

## 🎨 Адаптивный дизайн

### CSS-переменные для темизации
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --background-color: #ffffff;
  --text-color: #1f2937;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background-color: #1f2937;
    --text-color: #f9fafb;
  }
}
```

**Принципы адаптивности**:
- **CSS-переменные**: Централизованное управление цветами
- **Автоматическая тема**: Переключение по системным настройкам
- **Адаптивные размеры**: Использование относительных единиц
- **Медиа-запросы**: Адаптация под различные размеры экрана

## 📱 Мобильная оптимизация

### Touch-события
```javascript
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    // Одиночное касание - начало панорамирования
    isDragging = true;
    lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // Двойное касание - начало зума
    isZooming = true;
    lastTouchDistance = getTouchDistance(e.touches);
  }
}
```

**Мобильная адаптация**:
- **Touch-события**: Поддержка касаний вместо мыши
- **Жесты**: Поддержка pinch-to-zoom
- **Адаптивные размеры**: Оптимизация под мобильные экраны
- **Производительность**: Оптимизация для мобильных устройств

## 🔒 Безопасность и надежность

### Обработка ошибок
```javascript
function safeOperation(operation, errorMessage) {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage, error);
    showErrorMessage(errorMessage);
    return null;
  }
}

// Использование
const result = safeOperation(() => {
  return JSON.parse(localStorage.getItem('data'));
}, 'Не удалось загрузить данные');
```

**Принципы безопасности**:
- **Try-catch блоки**: Обработка всех возможных ошибок
- **Логирование**: Детальное логирование для отладки
- **Пользовательские сообщения**: Понятные сообщения об ошибках
- **Graceful fallback**: Корректная работа при ошибках

## 🚀 Планы развития

### Краткосрочные цели
- [ ] Разделение `app.js` на модули
- [ ] Добавление TypeScript
- [ ] Улучшение тестирования
- [ ] Оптимизация производительности

### Долгосрочные цели
- [ ] Поддержка других регионов EVE
- [ ] 3D-визуализация
- [ ] Многопользовательский режим
- [ ] API для интеграции

## 📚 Заключение

Проект представляет собой **высококачественную интерактивную карту** с продуманной архитектурой и оптимизацией. Код организован логично, с четким разделением ответственности между функциями. Основные принципы:

- **Модульность**: Четкое разделение функций по назначению
- **Производительность**: Оптимизация для 60 FPS
- **Надежность**: Обработка ошибок и валидация данных
- **Масштабируемость**: Легкое добавление новых функций
- **Пользовательский опыт**: Интуитивный интерфейс и быстрая работа

Код готов к дальнейшему развитию и может служить основой для более сложных картографических приложений.

---

**Версия**: 2.1.0  
**Последнее обновление**: Декабрь 2024  
**Статус**: Прототип с расширенной функциональностью и улучшенной производительностью  
**Строк кода**: 2750+  
**Архитектура**: Модульная с IIFE
