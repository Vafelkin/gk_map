/**
 * Модуль обработки событий для EVE Region Map
 * Содержит обработчики событий мыши, клавиатуры и других взаимодействий
 */

import { editMode, isDragging, lastMousePos } from './data-structures.js';
import { zoomAtPoint, screenToWorld } from './viewport.js';
import { handleNodeClickForEdge } from './editor.js';

/**
 * Инициализация всех обработчиков событий
 */
export function initEventHandlers() {
  initMouseHandlers();
  initKeyboardHandlers();
  initTouchHandlers();
  initWindowHandlers();
  
  console.log('Обработчики событий инициализированы');
}

/**
 * Инициализация обработчиков мыши
 */
function initMouseHandlers() {
  const svg = document.getElementById('map');
  if (!svg) return;
  
  // Основные события мыши
  svg.addEventListener('mousedown', handleMouseDown);
  svg.addEventListener('mousemove', handleMouseMove);
  svg.addEventListener('mouseup', handleMouseUp);
  svg.addEventListener('wheel', handleWheel);
  svg.addEventListener('click', handleClick);
  
  // События для узлов
  svg.addEventListener('click', handleNodeClick, true);
  
  // Контекстное меню
  svg.addEventListener('contextmenu', handleContextMenu);
}

/**
 * Обработчик нажатия мыши
 * @param {MouseEvent} e - Событие мыши
 */
function handleMouseDown(e) {
  if (editMode) return;
  
  isDragging = true;
  lastMousePos = { x: e.clientX, y: e.clientY };
  e.preventDefault();
}

/**
 * Обработчик движения мыши
 * @param {MouseEvent} e - Событие мыши
 */
function handleMouseMove(e) {
  if (!isDragging) return;
  
  const deltaX = e.clientX - lastMousePos.x;
  const deltaY = e.clientY - lastMousePos.y;
  
  // Обновление позиции вьюпорта
  translate.x += deltaX;
  translate.y += deltaY;
  
  lastMousePos = { x: e.clientX, y: e.clientY };
  applyTransform();
}

/**
 * Обработчик отпускания мыши
 * @param {MouseEvent} e - Событие мыши
 */
function handleMouseUp(e) {
  isDragging = false;
}

/**
 * Обработчик колеса мыши для зума
 * @param {WheelEvent} e - Событие колеса мыши
 */
function handleWheel(e) {
  e.preventDefault();
  
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  zoomAtPoint(e.clientX, e.clientY, factor);
}

/**
 * Обработчик клика по карте
 * @param {MouseEvent} e - Событие мыши
 */
function handleClick(e) {
  if (editMode) {
    handleEditMapClick(e);
  }
}

/**
 * Обработчик клика по узлу
 * @param {MouseEvent} e - Событие мыши
 */
function handleNodeClick(e) {
  const nodeElement = e.target.closest('[data-id]');
  if (!nodeElement) return;
  
  e.stopPropagation();
  
  const nodeId = nodeElement.getAttribute('data-id');
  
  if (editMode && edgeCreationMode) {
    handleNodeClickForEdge(nodeId);
  } else {
    handleNodeSelection(nodeId, e.ctrlKey || e.metaKey);
  }
}

/**
 * Обработка выбора узла
 * @param {string} nodeId - ID узла
 * @param {boolean} multiSelect - Множественный выбор
 */
function handleNodeSelection(nodeId, multiSelect) {
  if (multiSelect) {
    toggleNodeSelection(nodeId);
  } else {
    selectSingleNode(nodeId);
  }
}

/**
 * Переключение выбора узла
 * @param {string} nodeId - ID узла
 */
function toggleNodeSelection(nodeId) {
  const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
  if (!nodeElement) return;
  
  if (selectedNodes.has(nodeId)) {
    selectedNodes.delete(nodeId);
    nodeElement.classList.remove('selected');
  } else {
    selectedNodes.add(nodeId);
    nodeElement.classList.add('selected');
  }
  
  updateSelectionUI();
}

/**
 * Выбор одного узла
 * @param {string} nodeId - ID узла
 */
function selectSingleNode(nodeId) {
  // Очистка предыдущего выбора
  clearAllSelections();
  
  // Выбор нового узла
  selectedNodes.add(nodeId);
  selectedNodeId = nodeId;
  
  const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
  if (nodeElement) {
    nodeElement.classList.add('selected');
  }
  
  updateSelectionUI();
}

/**
 * Очистка всех выделений
 */
function clearAllSelections() {
  selectedNodes.clear();
  selectedNodeId = null;
  
  document.querySelectorAll('.selected').forEach(node => {
    node.classList.remove('selected');
  });
  
  updateSelectionUI();
}

/**
 * Обновление UI выбора
 */
function updateSelectionUI() {
  const deleteBtn = document.getElementById('deleteBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  
  const hasSelection = selectedNodes.size > 0;
  
  if (deleteBtn) {
    deleteBtn.disabled = !hasSelection;
  }
  
  if (deleteSelectedBtn) {
    deleteSelectedBtn.disabled = !hasSelection;
  }
}

/**
 * Обработчик контекстного меню
 * @param {MouseEvent} e - Событие мыши
 */
function handleContextMenu(e) {
  e.preventDefault();
  
  const nodeElement = e.target.closest('[data-id]');
  if (nodeElement) {
    showNodeContextMenu(e.clientX, e.clientY, nodeElement.getAttribute('data-id'));
  } else {
    showMapContextMenu(e.clientX, e.clientY);
  }
}

/**
 * Показ контекстного меню узла
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 * @param {string} nodeId - ID узла
 */
function showNodeContextMenu(x, y, nodeId) {
  // Создание контекстного меню
  const menu = createContextMenu([
    { text: 'Центрировать', action: () => focusSystem(nodeId) },
    { text: 'Удалить', action: () => deleteNode(nodeId) },
    { text: 'Свойства', action: () => showNodeProperties(nodeId) }
  ]);
  
  showContextMenu(menu, x, y);
}

/**
 * Показ контекстного меню карты
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 */
function showMapContextMenu(x, y) {
  const worldPos = screenToWorld(x, y);
  
  const menu = createContextMenu([
    { text: 'Создать узел', action: () => showNodeCreationPanel(x, y, worldPos) },
    { text: 'Сбросить вид', action: () => resetViewport() },
    { text: 'Подогнать под содержимое', action: () => fitViewToContent() }
  ]);
  
  showContextMenu(menu, x, y);
}

/**
 * Создание контекстного меню
 * @param {Array} items - Элементы меню
 * @returns {HTMLElement} Элемент меню
 */
function createContextMenu(items) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    min-width: 150px;
  `;
  
  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.text;
    menuItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
    `;
    
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f3f4f6';
    });
    
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'white';
    });
    
    menuItem.addEventListener('click', () => {
      item.action();
      hideContextMenu();
    });
    
    menu.appendChild(menuItem);
  });
  
  return menu;
}

/**
 * Показ контекстного меню
 * @param {HTMLElement} menu - Элемент меню
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 */
function showContextMenu(menu, x, y) {
  // Скрытие предыдущего меню
  hideContextMenu();
  
  // Позиционирование
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  // Добавление в DOM
  document.body.appendChild(menu);
  
  // Скрытие при клике вне меню
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  }, 0);
}

/**
 * Скрытие контекстного меню
 */
function hideContextMenu() {
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
}

/**
 * Инициализация обработчиков клавиатуры
 */
function initKeyboardHandlers() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

/**
 * Обработчик нажатия клавиши
 * @param {KeyboardEvent} e - Событие клавиатуры
 */
function handleKeyDown(e) {
  // Горячие клавиши
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        break;
      case 's':
        e.preventDefault();
        autoSaveMap();
        break;
      case 'a':
        e.preventDefault();
        selectAllNodes();
        break;
      case 'c':
        e.preventDefault();
        exportMap();
        break;
    }
  }
  
  // Обычные клавиши
  switch (e.key) {
    case 'Escape':
      if (editMode) {
        exitEditMode();
      } else {
        clearAllSelections();
      }
      break;
    case 'Delete':
    case 'Backspace':
      if (selectedNodes.size > 0) {
        deleteSelectedNodes();
      }
      break;
    case 'F':
      focusRoad('ckad');
      break;
    case 'R':
      resetViewport();
      break;
  }
}

/**
 * Обработчик отпускания клавиши
 * @param {KeyboardEvent} e - Событие клавиатуры
 */
function handleKeyUp(e) {
  // Обработка отпускания клавиш
}

/**
 * Инициализация обработчиков касаний
 */
function initTouchHandlers() {
  const svg = document.getElementById('map');
  if (!svg) return;
  
  svg.addEventListener('touchstart', handleTouchStart, { passive: false });
  svg.addEventListener('touchmove', handleTouchMove, { passive: false });
  svg.addEventListener('touchend', handleTouchEnd, { passive: false });
}

/**
 * Обработчик начала касания
 * @param {TouchEvent} e - Событие касания
 */
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    // Одиночное касание - начало панорамирования
    isDragging = true;
    lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // Двойное касание - начало зума
    e.preventDefault();
    // Логика pinch-to-zoom
  }
}

/**
 * Обработчик движения касания
 * @param {TouchEvent} e - Событие касания
 */
function handleTouchMove(e) {
  if (e.touches.length === 1 && isDragging) {
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastMousePos.x;
    const deltaY = touch.clientY - lastMousePos.y;
    
    translate.x += deltaX;
    translate.y += deltaY;
    
    lastMousePos = { x: touch.clientX, y: touch.clientY };
    applyTransform();
  }
}

/**
 * Обработчик окончания касания
 * @param {TouchEvent} e - Событие касания
 */
function handleTouchEnd(e) {
  isDragging = false;
}

/**
 * Инициализация обработчиков окна
 */
function initWindowHandlers() {
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Обработчик изменения размера окна
 * @param {Event} e - Событие изменения размера
 */
function handleWindowResize(e) {
  // Обновление размеров вьюпорта
  fitViewToContent();
}

/**
 * Обработчик перед закрытием окна
 * @param {Event} e - Событие закрытия
 */
function handleBeforeUnload(e) {
  // Автосохранение перед закрытием
  autoSaveMap();
}

// Импорт необходимых функций
import { translate, applyTransform, focusSystem, resetViewport, fitViewToContent } from './viewport.js';
import { selectedNodes, selectedNodeId } from './data-structures.js';
import { handleMapClick as handleEditMapClick } from './editor.js';
import { showNodeCreationPanel } from './ui.js';
import { autoSaveMap, exportMap } from './storage.js';
import { undo, redo, selectAllNodes, deleteSelectedNodes, exitEditMode } from './editor.js';
