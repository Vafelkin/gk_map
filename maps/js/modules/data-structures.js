/**
 * Структуры данных для EVE Region Map
 * Модуль содержит основные массивы данных и структуры для быстрого поиска
 */

// Основные массивы для хранения данных
export const systems = [];
export const jumps = [];

// Эффективные структуры для быстрого поиска
export const idToSystem = new Map();           // ID → система
export const adjacency = new Map();            // ID → Set<связанных_ID>

// Множества для групповых операций
export const selectedNodes = new Set();        // Выбранные узлы
export let selectedNodeId = null;              // ID выбранного узла
export let selectedNode = null;                // Выбранный узел

// Динамические теги для углов и километров
export const dynamicCornerTags = {};
export const dynamicKmTags = {};

// История действий для отмены/повтора
export const undoStack = [];
export const redoStack = [];

// Состояние редактирования
export let editMode = false;                   // Режим редактирования
export let nodeCreationMode = false;           // Режим создания узла
export let edgeCreationMode = false;           // Режим создания связи
export let tempEdge = null;                    // Временная связь при создании

// Состояние вьюпорта
export let scale = 1;                          // Текущий масштаб
export let translate = { x: 0, y: 0 };        // Текущее смещение

// Состояние перетаскивания
export let isDragging = false;                 // Флаг перетаскивания
export let lastMousePos = { x: 0, y: 0 };     // Последняя позиция мыши

// Состояние поиска
export let currentRoute = null;                // Текущий маршрут
export let highlightedNode = null;             // Подсвеченный узел

// Метрики производительности
export let renderStartTime = 0;
export let renderCount = 0;
export let totalRenderTime = 0;
export let renderTimeout = null;

/**
 * Инициализация структур данных
 */
export function initDataStructures() {
  // Очистка существующих данных
  systems.length = 0;
  jumps.length = 0;
  idToSystem.clear();
  adjacency.clear();
  selectedNodes.clear();
  selectedNodeId = null;
  selectedNode = null;
  
  // Очистка динамических тегов
  Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
  Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
  
  // Очистка истории
  undoStack.length = 0;
  redoStack.length = 0;
  
  // Сброс состояний
  editMode = false;
  nodeCreationMode = false;
  edgeCreationMode = false;
  tempEdge = null;
  scale = 1;
  translate = { x: 0, y: 0 };
  isDragging = false;
  lastMousePos = { x: 0, y: 0 };
  currentRoute = null;
  highlightedNode = null;
  
  console.log('Структуры данных инициализированы');
}

/**
 * Обновление структур для быстрого поиска
 */
export function rebuildDataStructures() {
  // Очистка существующих структур
  idToSystem.clear();
  adjacency.clear();
  
  // Построение idToSystem
  systems.forEach(system => {
    idToSystem.set(system.id, system);
    adjacency.set(system.id, new Set());
  });
  
  // Построение adjacency
  jumps.forEach(([a, b]) => {
    if (adjacency.has(a)) adjacency.get(a).add(b);
    if (adjacency.has(b)) adjacency.get(b).add(a);
  });
  
  console.log(`Структуры данных обновлены: ${systems.length} узлов, ${jumps.length} связей`);
}

/**
 * Добавление узла в структуры данных
 */
export function addSystem(system) {
  systems.push(system);
  idToSystem.set(system.id, system);
  adjacency.set(system.id, new Set());
  
  // Обновление adjacency для существующих связей
  jumps.forEach(([a, b]) => {
    if (a === system.id && adjacency.has(b)) {
      adjacency.get(b).add(system.id);
    }
    if (b === system.id && adjacency.has(a)) {
      adjacency.get(a).add(system.id);
    }
  });
}

/**
 * Удаление узла из структур данных
 */
export function removeSystem(systemId) {
  const index = systems.findIndex(s => s.id === systemId);
  if (index !== -1) {
    systems.splice(index, 1);
    idToSystem.delete(systemId);
    adjacency.delete(systemId);
    
    // Удаление связей с этим узлом
    for (let i = jumps.length - 1; i >= 0; i--) {
      const [a, b] = jumps[i];
      if (a === systemId || b === systemId) {
        jumps.splice(i, 1);
      }
    }
    
    // Обновление adjacency
    adjacency.forEach((neighbors, id) => {
      neighbors.delete(systemId);
    });
    
    // Удаление из выбранных
    selectedNodes.delete(systemId);
    if (selectedNodeId === systemId) {
      selectedNodeId = null;
      selectedNode = null;
    }
  }
}

/**
 * Добавление связи в структуры данных
 */
export function addJump(fromId, toId) {
  jumps.push([fromId, toId]);
  
  // Обновление adjacency
  if (adjacency.has(fromId)) {
    adjacency.get(fromId).add(toId);
  }
  if (adjacency.has(toId)) {
    adjacency.get(toId).add(fromId);
  }
}

/**
 * Удаление связи из структур данных
 */
export function removeJump(fromId, toId) {
  const index = jumps.findIndex(([a, b]) => 
    (a === fromId && b === toId) || (a === toId && b === fromId)
  );
  
  if (index !== -1) {
    jumps.splice(index, 1);
    
    // Обновление adjacency
    if (adjacency.has(fromId)) {
      adjacency.get(fromId).delete(toId);
    }
    if (adjacency.has(toId)) {
      adjacency.get(toId).delete(fromId);
    }
  }
}

/**
 * Получение соседей узла
 */
export function getNeighbors(systemId) {
  return adjacency.get(systemId) || new Set();
}

/**
 * Проверка существования узла
 */
export function systemExists(systemId) {
  return idToSystem.has(systemId);
}

/**
 * Получение узла по ID
 */
export function getSystemById(systemId) {
  return idToSystem.get(systemId);
}

/**
 * Получение статистики данных
 */
export function getDataStatistics() {
  return {
    systemsCount: systems.length,
    jumpsCount: jumps.length,
    selectedCount: selectedNodes.size,
    hasSelection: selectedNodes.size > 0
  };
}
