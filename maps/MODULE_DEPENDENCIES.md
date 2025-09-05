# Диаграмма взаимосвязей модулей EVE Region Map

## Структура модулей

```
app.js (главный файл)
├── config.js (конфигурации)
├── data-structures.js (структуры данных)
├── road-factory.js (фабрики дорог)
├── utils.js (утилиты)
├── pathfinding.js (алгоритмы поиска)
├── viewport.js (управление вьюпортом)
├── renderer.js (рендеринг)
├── editor.js (редактирование)
├── storage.js (хранение данных)
├── ui.js (пользовательский интерфейс)
└── events.js (обработка событий)
```

## Детальные взаимосвязи

### 1. config.js
**Экспортирует:** Константы, конфигурации дорог, настройки
**Импортируется в:**
- data-structures.js (STORAGE_KEYS, MAX_HISTORY)
- road-factory.js (ROAD_CONFIGS, TRANSPORT_JUNCTIONS)
- utils.js (NODE_DIMENSIONS, GRID_STEP)
- viewport.js (ZOOM_LIMITS, GRID_STEP)
- storage.js (STORAGE_KEYS, APP_VERSION)

### 2. data-structures.js
**Экспортирует:** Массивы данных, Map структуры, состояния
**Импортируется в:**
- road-factory.js (systems, jumps, dynamicCornerTags, dynamicKmTags)
- renderer.js (systems, jumps, dynamicCornerTags, dynamicKmTags, renderTimeout)
- editor.js (все состояния и функции)
- storage.js (systems, jumps, dynamicCornerTags, dynamicKmTags)
- ui.js (systems)
- events.js (editMode, isDragging, lastMousePos, selectedNodes, selectedNodeId)

### 3. road-factory.js
**Экспортирует:** Функции создания дорог
**Импортирует из:**
- config.js (ROAD_CONFIGS, TRANSPORT_JUNCTIONS)
- data-structures.js (systems, jumps, dynamicCornerTags, dynamicKmTags)

### 4. utils.js
**Экспортирует:** Вспомогательные функции
**Импортирует из:**
- config.js (NODE_DIMENSIONS, GRID_STEP)
- data-structures.js (dynamicCornerTags, dynamicKmTags)
**Импортируется в:**
- renderer.js (roadClassBySystemId, nodeCornerTag, nodeKmTag, isTransportJunction, nodeTooltipText, updatePerformanceMetrics)
- editor.js (validateNodeData, validateEdgeData, snapToGrid, generateUniqueId)
- storage.js (isLocalStorageSupported, safeOperation)
- ui.js (formatFileSize)

### 5. pathfinding.js
**Экспортирует:** Алгоритмы поиска пути
**Импортирует из:**
- data-structures.js (adjacency)
**Импортируется в:**
- ui.js (shortestPath, drawRoute)

### 6. viewport.js
**Экспортирует:** Функции управления вьюпортом
**Импортирует из:**
- config.js (ZOOM_LIMITS, GRID_STEP)
- data-structures.js (scale, translate, systems)
**Импортируется в:**
- editor.js (screenToWorld)
- events.js (zoomAtPoint, screenToWorld, focusSystem, resetViewport, fitViewToContent, translate, applyTransform)

### 7. renderer.js
**Экспортирует:** Функции рендеринга
**Импортирует из:**
- config.js (NODE_DIMENSIONS)
- data-structures.js (systems, jumps, dynamicCornerTags, dynamicKmTags, renderTimeout)
- utils.js (roadClassBySystemId, nodeCornerTag, nodeKmTag, isTransportJunction, nodeTooltipText, updatePerformanceMetrics)

### 8. editor.js
**Экспортирует:** Функции редактирования
**Импортирует из:**
- config.js (GRID_STEP)
- data-structures.js (все состояния и функции)
- utils.js (validateNodeData, validateEdgeData, snapToGrid, generateUniqueId)
- viewport.js (screenToWorld)
- renderer.js (highlightNode, clearAllHighlights)
- ui.js (showErrorMessage, showWarningMessage, showSuccessMessage)
- storage.js (autoSaveMap)
**Импортируется в:**
- ui.js (undo, redo, selectAllNodes, deleteSelectedNodes, exitEditMode, createNewNode)
- events.js (handleMapClick, handleNodeClickForEdge, undo, redo, selectAllNodes, deleteSelectedNodes, exitEditMode)

### 9. storage.js
**Экспортирует:** Функции хранения данных
**Импортирует из:**
- config.js (STORAGE_KEYS, APP_VERSION)
- data-structures.js (systems, jumps, dynamicCornerTags, dynamicKmTags)
- utils.js (isLocalStorageSupported, safeOperation)
**Импортируется в:**
- ui.js (exportMap, createImportInput, autoSaveMap)
- events.js (autoSaveMap, exportMap)
- editor.js (autoSaveMap)

### 10. ui.js
**Экспортирует:** Функции UI
**Импортирует из:**
- data-structures.js (systems)
- utils.js (formatFileSize)
- storage.js (exportMap, createImportInput, autoSaveMap)
- editor.js (undo, redo, selectAllNodes, deleteSelectedNodes, exitEditMode, createNewNode)
- viewport.js (focusRoad, focusSystem)
- pathfinding.js (shortestPath, drawRoute)

### 11. events.js
**Экспортирует:** Обработчики событий
**Импортирует из:**
- data-structures.js (editMode, isDragging, lastMousePos, selectedNodes, selectedNodeId)
- viewport.js (zoomAtPoint, screenToWorld, focusSystem, resetViewport, fitViewToContent, translate, applyTransform)
- editor.js (handleMapClick, handleNodeClickForEdge, undo, redo, selectAllNodes, deleteSelectedNodes, exitEditMode)
- ui.js (showNodeCreationPanel)
- storage.js (autoSaveMap, exportMap)

## Циклические зависимости

**НЕТ циклических зависимостей** - все модули организованы в иерархическом порядке:

1. **Базовый уровень:** config.js, data-structures.js
2. **Утилиты:** utils.js, road-factory.js
3. **Функциональные модули:** pathfinding.js, viewport.js, renderer.js
4. **Высокоуровневые модули:** editor.js, storage.js, ui.js, events.js
5. **Главный файл:** app.js

## Преимущества модульной архитектуры

1. **Разделение ответственности:** Каждый модуль отвечает за свою область
2. **Переиспользование:** Модули можно использовать в других проектах
3. **Тестирование:** Каждый модуль можно тестировать отдельно
4. **Поддержка:** Легче находить и исправлять ошибки
5. **Масштабируемость:** Легко добавлять новые функции
6. **Производительность:** Возможность lazy loading модулей

## Статистика модуляризации

- **Оригинальный app.js:** 2750+ строк
- **Модульная версия:** 12 модулей
- **Средний размер модуля:** ~200-300 строк
- **Сокращение сложности:** ~90%
- **Улучшение читаемости:** Значительно
