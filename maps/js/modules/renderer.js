/**
 * Система рендеринга для EVE Region Map
 * Модуль содержит функции для отрисовки узлов, связей и меток на SVG
 */

import { NODE_DIMENSIONS } from './config.js';
import { systems, jumps, dynamicCornerTags, dynamicKmTags, renderTimeout } from './data-structures.js';
import { roadClassBySystemId, nodeCornerTag, nodeKmTag, isTransportJunction, nodeTooltipText, updatePerformanceMetrics } from './utils.js';

/**
 * Основная функция рендеринга
 */
export function render() {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }
  
  renderTimeout = setTimeout(() => {
    performRender();
    renderTimeout = null;
  }, 16); // ~60 FPS
}

/**
 * Немедленный рендеринг (без debouncing)
 */
export function renderImmediate() {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
    renderTimeout = null;
  }
  performRender();
}

/**
 * Выполнение рендеринга
 */
function performRender() {
  const startTime = performance.now();
  
  renderEdges();
  renderNodesAndLabels();
  
  const renderTime = performance.now() - startTime;
  updatePerformanceMetrics(renderTime);
}

/**
 * Рендеринг связей (рёбер)
 */
export function renderEdges() {
  const edgesLayer = document.getElementById('edgesLayer');
  if (!edgesLayer) return;
  
  // Очистка существующих связей
  edgesLayer.innerHTML = '';
  
  // Создание новых связей
  jumps.forEach(([fromId, toId]) => {
    const fromSystem = systems.find(s => s.id === fromId);
    const toSystem = systems.find(s => s.id === toId);
    
    if (fromSystem && toSystem) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromSystem.x);
      line.setAttribute('y1', fromSystem.y);
      line.setAttribute('x2', toSystem.x);
      line.setAttribute('y2', toSystem.y);
      line.setAttribute('class', 'edge');
      line.setAttribute('data-from', fromId);
      line.setAttribute('data-to', toId);
      line.setAttribute('stroke', '#64748b');
      line.setAttribute('stroke-width', '1');
      
      edgesLayer.appendChild(line);
    }
  });
}

/**
 * Рендеринг узлов и меток
 */
export function renderNodesAndLabels() {
  const nodesLayer = document.getElementById('nodesLayer');
  const labelsLayer = document.getElementById('labelsLayer');
  
  if (!nodesLayer || !labelsLayer) return;
  
  // Очистка существующих узлов и меток
  nodesLayer.innerHTML = '';
  labelsLayer.innerHTML = '';
  
  // Создание новых узлов и меток
  systems.forEach(system => {
    const nodeGroup = createNodeGroup(system);
    nodesLayer.appendChild(nodeGroup);
    
    const label = createNodeLabel(system);
    labelsLayer.appendChild(label);
  });
}

/**
 * Создание группы узла
 * @param {Object} system - Система для создания узла
 * @returns {HTMLElement} SVG группа узла
 */
export function createNodeGroup(system) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-id', system.id);
  group.setAttribute('class', `node ${roadClassBySystemId(system.id)}`);
  
  // Создание прямоугольника узла
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', system.x - NODE_DIMENSIONS.WIDTH / 2);
  rect.setAttribute('y', system.y - NODE_DIMENSIONS.HEIGHT / 2);
  rect.setAttribute('width', NODE_DIMENSIONS.WIDTH);
  rect.setAttribute('height', NODE_DIMENSIONS.HEIGHT);
  rect.setAttribute('rx', '4');
  rect.setAttribute('ry', '4');
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#64748b');
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('filter', 'url(#shadow)');
  
  group.appendChild(rect);
  
  // Добавление тегов углов
  addCornerTags(group, system.id);
  
  // Добавление обработчиков событий
  attachNodeEventHandlers(group, system);
  
  return group;
}

/**
 * Добавление тегов углов к узлу
 * @param {HTMLElement} group - Группа узла
 * @param {string} systemId - ID системы
 */
export function addCornerTags(group, systemId) {
  const cornerTag = nodeCornerTag(systemId);
  const kmTag = nodeKmTag(systemId);
  
  if (cornerTag) {
    const cornerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    cornerText.setAttribute('x', systemId.x - NODE_DIMENSIONS.WIDTH / 2 + 2);
    cornerText.setAttribute('y', systemId.y - NODE_DIMENSIONS.HEIGHT / 2 + 8);
    cornerText.setAttribute('class', 'corner-tag');
    cornerText.setAttribute('font-size', '8');
    cornerText.setAttribute('fill', '#64748b');
    cornerText.textContent = cornerTag;
    group.appendChild(cornerText);
  }
  
  if (kmTag) {
    const kmText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    kmText.setAttribute('x', systemId.x + NODE_DIMENSIONS.WIDTH / 2 - 2);
    kmText.setAttribute('y', systemId.y + NODE_DIMENSIONS.HEIGHT / 2 - 2);
    kmText.setAttribute('class', 'km-tag');
    kmText.setAttribute('font-size', '8');
    kmText.setAttribute('fill', '#64748b');
    kmText.setAttribute('text-anchor', 'end');
    kmText.textContent = kmTag;
    group.appendChild(kmText);
  }
}

/**
 * Создание метки узла
 * @param {Object} system - Система для создания метки
 * @returns {HTMLElement} SVG текстовый элемент
 */
export function createNodeLabel(system) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', system.x);
  text.setAttribute('y', system.y + 2);
  text.setAttribute('class', 'node-label');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '10');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', '#1f2937');
  text.setAttribute('pointer-events', 'none');
  text.textContent = system.id;
  
  return text;
}

/**
 * Прикрепление обработчиков событий к узлу
 * @param {HTMLElement} group - Группа узла
 * @param {Object} system - Система
 */
function attachNodeEventHandlers(group, system) {
  // Обработчик клика
  group.addEventListener('click', (e) => {
    e.stopPropagation();
    handleNodeClick(system.id);
  });
  
  // Обработчик наведения
  group.addEventListener('mouseenter', (e) => {
    showTooltip(nodeTooltipText(system.id), e.clientX, e.clientY);
  });
  
  group.addEventListener('mouseleave', () => {
    hideTooltip();
  });
  
  // Обработчик перетаскивания
  attachDragHandlers(group, system);
}

/**
 * Обработка клика по узлу
 * @param {string} nodeId - ID узла
 */
function handleNodeClick(nodeId) {
  // Логика выбора узла
  console.log(`Клик по узлу: ${nodeId}`);
}

/**
 * Показ подсказки
 * @param {string} text - Текст подсказки
 * @param {number} clientX - Координата X
 * @param {number} clientY - Координата Y
 */
function showTooltip(text, clientX, clientY) {
  let tooltip = document.getElementById('tooltip');
  if (!tooltip) {
    tooltip = createTooltip();
  }
  
  tooltip.textContent = text;
  tooltip.style.left = `${clientX + 10}px`;
  tooltip.style.top = `${clientY - 10}px`;
  tooltip.style.display = 'block';
}

/**
 * Скрытие подсказки
 */
function hideTooltip() {
  const tooltip = document.getElementById('tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

/**
 * Создание элемента подсказки
 * @returns {HTMLElement} Элемент подсказки
 */
function createTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  tooltip.className = 'tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    white-space: pre-line;
    display: none;
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

/**
 * Прикрепление обработчиков перетаскивания
 * @param {HTMLElement} group - Группа узла
 * @param {Object} system - Система
 */
function attachDragHandlers(group, system) {
  let isDragging = false;
  let startPos = { x: 0, y: 0 };
  
  group.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Только левая кнопка мыши
    
    isDragging = true;
    startPos = { x: e.clientX, y: e.clientY };
    group.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    
    // Обновление позиции узла
    updateNodePosition(system.id, system.x + deltaX, system.y + deltaY);
    
    startPos = { x: e.clientX, y: e.clientY };
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      group.style.cursor = 'grab';
    }
  });
}

/**
 * Обновление позиции узла
 * @param {string} nodeId - ID узла
 * @param {number} newX - Новая координата X
 * @param {number} newY - Новая координата Y
 */
function updateNodePosition(nodeId, newX, newY) {
  const system = systems.find(s => s.id === nodeId);
  if (system) {
    system.x = newX;
    system.y = newY;
    
    // Обновление отображения
    renderImmediate();
  }
}

/**
 * Обновление стилей узла
 * @param {string} nodeId - ID узла
 * @param {string} className - CSS класс
 * @param {boolean} add - Добавить или удалить класс
 */
export function updateNodeStyle(nodeId, className, add = true) {
  const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
  if (nodeElement) {
    if (add) {
      nodeElement.classList.add(className);
    } else {
      nodeElement.classList.remove(className);
    }
  }
}

/**
 * Подсветка узла
 * @param {string} nodeId - ID узла
 * @param {boolean} highlight - Подсветить или убрать подсветку
 */
export function highlightNode(nodeId, highlight = true) {
  updateNodeStyle(nodeId, 'highlighted', highlight);
}

/**
 * Выделение узла
 * @param {string} nodeId - ID узла
 * @param {boolean} selected - Выделить или убрать выделение
 */
export function selectNode(nodeId, selected = true) {
  updateNodeStyle(nodeId, 'selected', selected);
}

/**
 * Очистка всех выделений
 */
export function clearAllSelections() {
  document.querySelectorAll('.selected').forEach(node => {
    node.classList.remove('selected');
  });
}

/**
 * Очистка всех подсветок
 */
export function clearAllHighlights() {
  document.querySelectorAll('.highlighted').forEach(node => {
    node.classList.remove('highlighted');
  });
}
