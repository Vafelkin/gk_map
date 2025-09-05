/**
 * Модуль редактирования для EVE Region Map
 * Содержит функции для создания, удаления и редактирования узлов и связей
 */

import { GRID_STEP } from './config.js';
import { 
  systems, 
  jumps, 
  editMode, 
  nodeCreationMode, 
  edgeCreationMode, 
  tempEdge,
  selectedNodes,
  selectedNodeId,
  undoStack,
  redoStack,
  MAX_HISTORY
} from './data-structures.js';
import { validateNodeData, validateEdgeData, snapToGrid, generateUniqueId } from './utils.js';
import { addSystem, removeSystem, addJump, removeJump } from './data-structures.js';
import { render } from './renderer.js';

/**
 * Инициализация режимов редактирования
 */
export function initEditModes() {
  const addNodeBtn = document.getElementById('addNodeBtn');
  const addEdgeBtn = document.getElementById('addEdgeBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  
  if (addNodeBtn) {
    addNodeBtn.addEventListener('click', enterNodeCreationMode);
  }
  
  if (addEdgeBtn) {
    addEdgeBtn.addEventListener('click', enterEdgeCreationMode);
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteSelectedNode);
  }
  
  console.log('Режимы редактирования инициализированы');
}

/**
 * Вход в режим создания узла
 */
export function enterNodeCreationMode() {
  editMode = true;
  nodeCreationMode = true;
  edgeCreationMode = false;
  
  // Обновление UI
  updateEditModeUI();
  
  console.log('Режим создания узла активирован');
}

/**
 * Выход из режима создания узла
 */
export function exitNodeCreationMode() {
  nodeCreationMode = false;
  if (!edgeCreationMode) {
    editMode = false;
  }
  
  updateEditModeUI();
  hideNodeCreationPanel();
}

/**
 * Вход в режим создания связи
 */
export function enterEdgeCreationMode() {
  editMode = true;
  edgeCreationMode = true;
  nodeCreationMode = false;
  
  updateEditModeUI();
  
  console.log('Режим создания связи активирован');
}

/**
 * Выход из режима создания связи
 */
export function exitEdgeCreationMode() {
  edgeCreationMode = false;
  tempEdge = null;
  
  if (!nodeCreationMode) {
    editMode = false;
  }
  
  updateEditModeUI();
}

/**
 * Обновление UI в зависимости от режима редактирования
 */
function updateEditModeUI() {
  const addNodeBtn = document.getElementById('addNodeBtn');
  const addEdgeBtn = document.getElementById('addEdgeBtn');
  
  if (addNodeBtn) {
    addNodeBtn.classList.toggle('active', nodeCreationMode);
  }
  
  if (addEdgeBtn) {
    addEdgeBtn.classList.toggle('active', edgeCreationMode);
  }
  
  // Изменение курсора
  const svg = document.getElementById('map');
  if (svg) {
    if (editMode) {
      svg.style.cursor = 'crosshair';
    } else {
      svg.style.cursor = 'grab';
    }
  }
}

/**
 * Обработка клика по карте в режиме редактирования
 * @param {MouseEvent} e - Событие мыши
 */
export function handleMapClick(e) {
  if (!editMode) return;
  
  const worldPos = screenToWorld(e.clientX, e.clientY);
  
  if (nodeCreationMode) {
    showNodeCreationPanel(e.clientX, e.clientY, worldPos);
  } else if (edgeCreationMode) {
    handleEdgeCreationClick(e, worldPos);
  }
}

/**
 * Обработка клика для создания связи
 * @param {MouseEvent} e - Событие мыши
 * @param {Object} worldPos - Мировые координаты
 */
function handleEdgeCreationClick(e, worldPos) {
  // Поиск ближайшего узла
  const nearestNode = findNearestNode(worldPos.x, worldPos.y, 50);
  
  if (nearestNode) {
    handleNodeClickForEdge(nearestNode.id);
  } else {
    // Создание временной связи
    updateTempEdge(worldPos);
  }
}

/**
 * Поиск ближайшего узла к точке
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 * @param {number} maxDistance - Максимальное расстояние
 * @returns {Object|null} Ближайший узел или null
 */
function findNearestNode(x, y, maxDistance) {
  let nearestNode = null;
  let minDistance = maxDistance;
  
  systems.forEach(system => {
    const distance = Math.sqrt((system.x - x) ** 2 + (system.y - y) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = system;
    }
  });
  
  return nearestNode;
}

/**
 * Обработка клика по узлу для создания связи
 * @param {string} nodeId - ID узла
 */
export function handleNodeClickForEdge(nodeId) {
  if (!tempEdge) {
    // Начало создания связи
    tempEdge = {
      from: nodeId,
      to: null,
      tempX: null,
      tempY: null
    };
    
    // Подсветка начального узла
    highlightNode(nodeId, true);
  } else {
    // Завершение создания связи
    if (tempEdge.from !== nodeId) {
      createEdge(tempEdge.from, nodeId);
    }
    
    // Очистка временной связи
    clearTempEdge();
  }
}

/**
 * Обновление временной связи
 * @param {Object} endPos - Конечная позиция
 */
export function updateTempEdge(endPos) {
  if (!tempEdge) return;
  
  tempEdge.tempX = endPos.x;
  tempEdge.tempY = endPos.y;
  
  // Отрисовка временной связи
  renderTempEdge();
}

/**
 * Отрисовка временной связи
 */
function renderTempEdge() {
  if (!tempEdge || !tempEdge.tempX || !tempEdge.tempY) return;
  
  const fromSystem = systems.find(s => s.id === tempEdge.from);
  if (!fromSystem) return;
  
  // Удаление предыдущей временной связи
  const existingTempEdge = document.getElementById('tempEdge');
  if (existingTempEdge) {
    existingTempEdge.remove();
  }
  
  // Создание новой временной связи
  const svg = document.getElementById('map');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.id = 'tempEdge';
  line.setAttribute('x1', fromSystem.x);
  line.setAttribute('y1', fromSystem.y);
  line.setAttribute('x2', tempEdge.tempX);
  line.setAttribute('y2', tempEdge.tempY);
  line.setAttribute('stroke', '#3b82f6');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-dasharray', '5,5');
  line.setAttribute('opacity', '0.7');
  
  svg.appendChild(line);
}

/**
 * Очистка временной связи
 */
function clearTempEdge() {
  tempEdge = null;
  
  const existingTempEdge = document.getElementById('tempEdge');
  if (existingTempEdge) {
    existingTempEdge.remove();
  }
  
  // Убираем подсветку
  clearAllHighlights();
}

/**
 * Создание связи между узлами
 * @param {string} fromId - ID исходного узла
 * @param {string} toId - ID целевого узла
 */
function createEdge(fromId, toId) {
  const errors = validateEdgeData(fromId, toId);
  if (errors.length > 0) {
    showErrorMessage(errors.join('\n'));
    return;
  }
  
  // Проверка на существующую связь
  const existingEdge = jumps.find(([a, b]) => 
    (a === fromId && b === toId) || (a === toId && b === fromId)
  );
  
  if (existingEdge) {
    showWarningMessage('Связь уже существует');
    return;
  }
  
  // Сохранение состояния для отмены
  saveState('createEdge');
  
  // Создание связи
  addJump(fromId, toId);
  
  // Обновление отображения
  render();
  
  showSuccessMessage(`Связь создана: ${fromId} → ${toId}`);
}

/**
 * Показ панели создания узла
 * @param {number} clientX - Координата X клика
 * @param {number} clientY - Координата Y клика
 * @param {Object} worldPos - Мировые координаты
 */
export function showNodeCreationPanel(clientX, clientY, worldPos) {
  const panel = document.getElementById('nodeCreationPanel');
  if (!panel) return;
  
  // Позиционирование панели
  panel.style.left = `${clientX}px`;
  panel.style.top = `${clientY}px`;
  panel.style.display = 'block';
  
  // Заполнение координат
  const xInput = document.getElementById('nodeX');
  const yInput = document.getElementById('nodeY');
  if (xInput) xInput.value = Math.round(worldPos.x);
  if (yInput) yInput.value = Math.round(worldPos.y);
  
  // Фокус на поле ID
  const idInput = document.getElementById('newNodeId');
  if (idInput) {
    idInput.focus();
  }
}

/**
 * Скрытие панели создания узла
 */
export function hideNodeCreationPanel() {
  const panel = document.getElementById('nodeCreationPanel');
  if (panel) {
    panel.style.display = 'none';
  }
  
  clearNodeCreationForm();
}

/**
 * Создание нового узла
 */
export function createNewNode() {
  const idInput = document.getElementById('newNodeId');
  const nameInput = document.getElementById('newNodeName');
  const xInput = document.getElementById('nodeX');
  const yInput = document.getElementById('nodeY');
  
  if (!idInput || !xInput || !yInput) return;
  
  const id = idInput.value.trim();
  const name = nameInput ? nameInput.value.trim() : '';
  const x = parseFloat(xInput.value);
  const y = parseFloat(yInput.value);
  
  // Валидация
  const errors = validateNodeData(id, name, x, y);
  if (errors.length > 0) {
    showErrorMessage(errors.join('\n'));
    return;
  }
  
  // Проверка на существующий ID
  if (systems.find(s => s.id === id)) {
    showErrorMessage('Узел с таким ID уже существует');
    return;
  }
  
  // Сохранение состояния для отмены
  saveState('createNode');
  
  // Создание узла
  const newNode = {
    id,
    name: name || id,
    x: snapToGrid(x),
    y: snapToGrid(y),
    sec: 1.0
  };
  
  addSystem(newNode);
  
  // Обновление отображения
  render();
  
  // Выход из режима создания
  exitNodeCreationMode();
  
  showSuccessMessage(`Узел создан: ${id}`);
}

/**
 * Очистка формы создания узла
 */
export function clearNodeCreationForm() {
  const idInput = document.getElementById('newNodeId');
  const nameInput = document.getElementById('newNodeName');
  const xInput = document.getElementById('nodeX');
  const yInput = document.getElementById('nodeY');
  
  if (idInput) idInput.value = '';
  if (nameInput) nameInput.value = '';
  if (xInput) xInput.value = '';
  if (yInput) yInput.value = '';
}

/**
 * Удаление выбранного узла
 */
export function deleteSelectedNode() {
  if (selectedNodes.size === 0) {
    showWarningMessage('Выберите узлы для удаления');
    return;
  }
  
  if (!confirm(`Удалить ${selectedNodes.size} выбранных узлов?`)) {
    return;
  }
  
  // Сохранение состояния для отмены
  saveState('deleteNodes');
  
  // Удаление узлов
  const nodesToDelete = Array.from(selectedNodes);
  nodesToDelete.forEach(nodeId => {
    removeSystem(nodeId);
  });
  
  // Очистка выбора
  selectedNodes.clear();
  selectedNodeId = null;
  
  // Обновление отображения
  render();
  
  showSuccessMessage(`Удалено узлов: ${nodesToDelete.length}`);
}

/**
 * Обновление позиции узла
 * @param {string} nodeId - ID узла
 * @param {number} newX - Новая координата X
 * @param {number} newY - Новая координата Y
 */
export function updateNodePosition(nodeId, newX, newY) {
  const system = systems.find(s => s.id === nodeId);
  if (!system) return;
  
  const oldX = system.x;
  const oldY = system.y;
  
  system.x = snapToGrid(newX);
  system.y = snapToGrid(newY);
  
  // Обновление отображения
  render();
  
  // Автосохранение
  autoSaveMap();
}

/**
 * Сохранение состояния для отмены/повтора
 * @param {string} action - Описание действия
 */
function saveState(action) {
  const state = {
    systems: JSON.parse(JSON.stringify(systems)),
    jumps: JSON.parse(JSON.stringify(jumps)),
    action,
    timestamp: Date.now()
  };
  
  undoStack.push(state);
  
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  
  redoStack.length = 0; // Очистка redo при новом действии
}

/**
 * Отмена последнего действия
 */
export function undo() {
  if (undoStack.length === 0) {
    showWarningMessage('Нечего отменять');
    return;
  }
  
  const currentState = {
    systems: JSON.parse(JSON.stringify(systems)),
    jumps: JSON.parse(JSON.stringify(jumps)),
    timestamp: Date.now()
  };
  
  redoStack.push(currentState);
  
  const state = undoStack.pop();
  systems.length = 0;
  jumps.length = 0;
  systems.push(...state.systems);
  jumps.push(...state.jumps);
  
  rebuildDataStructures();
  render();
  
  showSuccessMessage(`Отменено: ${state.action}`);
}

/**
 * Повтор отмененного действия
 */
export function redo() {
  if (redoStack.length === 0) {
    showWarningMessage('Нечего повторять');
    return;
  }
  
  const currentState = {
    systems: JSON.parse(JSON.stringify(systems)),
    jumps: JSON.parse(JSON.stringify(jumps)),
    timestamp: Date.now()
  };
  
  undoStack.push(currentState);
  
  const state = redoStack.pop();
  systems.length = 0;
  jumps.length = 0;
  systems.push(...state.systems);
  jumps.push(...state.jumps);
  
  rebuildDataStructures();
  render();
  
  showSuccessMessage('Действие повторено');
}

// Импорт необходимых функций
import { screenToWorld } from './viewport.js';
import { rebuildDataStructures } from './data-structures.js';
import { highlightNode, clearAllHighlights } from './renderer.js';
import { showErrorMessage, showWarningMessage, showSuccessMessage } from './ui.js';
import { autoSaveMap } from './storage.js';
