/**
 * Главный файл приложения EVE Region Map
 * Координирует работу всех модулей и инициализирует приложение
 */

import { 
  NODE_DIMENSIONS, 
  ZOOM_LIMITS, 
  GRID_STEP, 
  STORAGE_KEYS, 
  ROAD_CONFIGS, 
  TRANSPORT_JUNCTIONS,
  APP_VERSION,
  MAX_HISTORY 
} from './modules/config.js';

import { 
  systems, 
  jumps, 
  idToSystem, 
  adjacency, 
  selectedNodes, 
  selectedNodeId, 
  selectedNode,
  dynamicCornerTags, 
  dynamicKmTags,
  undoStack, 
  redoStack,
  editMode,
  nodeCreationMode,
  edgeCreationMode,
  tempEdge,
  scale,
  translate,
  isDragging,
  lastMousePos,
  currentRoute,
  highlightedNode,
  renderStartTime,
  renderCount,
  totalRenderTime,
  renderTimeout,
  initDataStructures,
  rebuildDataStructures,
  addSystem,
  removeSystem,
  addJump,
  removeJump,
  getNeighbors,
  systemExists,
  getSystemById,
  getDataStatistics
} from './modules/data-structures.js';

import { 
  createCircularRoad, 
  createTransportJunction, 
  createLinearRoad, 
  createRoadFromConfig, 
  createRoadBranch,
  createAllRoads,
  createAdditionalConnections,
  getRoadInfo,
  isPartOfRoad
} from './modules/road-factory.js';

import { 
  validateNodeData, 
  validateEdgeData, 
  clamp, 
  roadClassBySystemId, 
  nodeCornerTag, 
  nodeKmTag, 
  isTransportJunction, 
  nodeTooltipText, 
  snapToGrid, 
  updatePerformanceMetrics, 
  formatFileSize, 
  generateUniqueId, 
  isLocalStorageSupported, 
  safeOperation 
} from './modules/utils.js';

import { 
  shortestPath, 
  buildAdjacency, 
  drawRoute, 
  clearRoute, 
  paintEdge, 
  isFreeEdge,
  findAllPaths,
  findAlternativeRoutes,
  calculateDistance,
  findNearestNode,
  isNodeInRadius,
  findNodesInRadius
} from './modules/pathfinding.js';

import { 
  applyTransform, 
  zoomAtPoint, 
  screenToWorld, 
  fitViewToContent, 
  focusRoad, 
  focusSystem, 
  highlightNode, 
  resetViewport, 
  getViewportState, 
  setViewportState, 
  animateToPoint 
} from './modules/viewport.js';

import { 
  render, 
  renderImmediate, 
  renderEdges, 
  renderNodesAndLabels, 
  createNodeGroup, 
  createNodeLabel, 
  addCornerTags,
  updateNodeStyle,
  highlightNode as highlightNodeRenderer,
  selectNode,
  clearAllSelections,
  clearAllHighlights
} from './modules/renderer.js';

import { 
  initEditModes, 
  enterNodeCreationMode, 
  exitNodeCreationMode, 
  enterEdgeCreationMode, 
  exitEdgeCreationMode,
  handleMapClick as handleEditMapClick,
  handleNodeClickForEdge,
  updateTempEdge,
  showNodeCreationPanel,
  hideNodeCreationPanel,
  createNewNode,
  clearNodeCreationForm,
  deleteSelectedNode,
  updateNodePosition,
  undo,
  redo
} from './modules/editor.js';

import { 
  saveFullMap, 
  loadFullMap, 
  savePositions, 
  loadSavedPositions, 
  autoSaveMap, 
  exportMap, 
  importMap, 
  createImportInput, 
  clearAllData, 
  getStorageInfo 
} from './modules/storage.js';

import { 
  showMessage, 
  showSuccessMessage, 
  showErrorMessage, 
  showWarningMessage, 
  showInfoMessage,
  updateSystemsDatalist,
  showNodeCreationPanel as showUINodeCreationPanel,
  hideNodeCreationPanel as hideUINodeCreationPanel,
  clearNodeCreationForm as clearUINodeCreationForm,
  showMapStatistics,
  initUIHandlers
} from './modules/ui.js';

import { 
  initEventHandlers as initEventHandlersModule,
  initMouseHandlers,
  initKeyboardHandlers,
  initTouchHandlers,
  initWindowHandlers
} from './modules/events.js';

/**
 * Основная инициализация приложения
 */
function init() {
  console.log(`Инициализация EVE Region Map v${APP_VERSION}`);
  
  // Инициализация структур данных
  initDataStructures();
  
  // Создание всех дорог
  createAllRoads();
  
  // Создание дополнительных связей
  createAdditionalConnections();
  
  // Обновление структур для быстрого поиска
  rebuildDataStructures();
  
  // Инициализация UI
  initUI();
  
  // Инициализация обработчиков событий
  initEventHandlers();
  
  // Инициализация режимов редактирования
  initEditModes();
  
  // Инициализация UI обработчиков
  initUIHandlers();
  
  // Загрузка сохраненных данных
  loadSavedData();
  
  // Первоначальный рендеринг
  render();
  
  // Центрирование карты на ЦКАД
  setTimeout(() => {
    focusRoad('ckad', 0.93);
  }, 100);
  
  console.log('Приложение инициализировано');
}

/**
 * Инициализация UI элементов
 */
function initUI() {
  // Кэширование DOM элементов
  window.svg = document.getElementById('map');
  window.viewport = document.getElementById('viewport');
  window.edgesLayer = document.getElementById('edgesLayer');
  window.nodesLayer = document.getElementById('nodesLayer');
  window.labelsLayer = document.getElementById('labelsLayer');
  
  // Обновление datalist для поиска
  updateSystemsDatalist();
  
  console.log('UI элементы инициализированы');
}

/**
 * Инициализация обработчиков событий
 */
function initEventHandlers() {
  // Обработчики мыши
  const svg = document.getElementById('map');
  if (svg) {
    svg.addEventListener('mousedown', handleMapMouseDown);
    svg.addEventListener('mousemove', handleMapMouseMove);
    svg.addEventListener('mouseup', handleMapMouseUp);
    svg.addEventListener('wheel', handleMapWheel);
    svg.addEventListener('click', handleMapClick);
  }
  
  // Обработчики кнопок
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 1.2));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomAtPoint(window.innerWidth / 2, window.innerHeight / 2, 0.8));
  if (resetViewBtn) resetViewBtn.addEventListener('click', resetViewport);
  
  console.log('Обработчики событий инициализированы');
}

/**
 * Обработчик нажатия мыши на карту
 */
function handleMapMouseDown(e) {
  if (editMode) return;
  
  isDragging = true;
  lastMousePos = { x: e.clientX, y: e.clientY };
  e.preventDefault();
}

/**
 * Обработчик движения мыши по карте
 */
function handleMapMouseMove(e) {
  if (!isDragging) return;
  
  const deltaX = e.clientX - lastMousePos.x;
  const deltaY = e.clientY - lastMousePos.y;
  
  translate.x += deltaX;
  translate.y += deltaY;
  
  lastMousePos = { x: e.clientX, y: e.clientY };
  applyTransform();
}

/**
 * Обработчик отпускания мыши
 */
function handleMapMouseUp(e) {
  isDragging = false;
}

/**
 * Обработчик колеса мыши для зума
 */
function handleMapWheel(e) {
  e.preventDefault();
  
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  zoomAtPoint(e.clientX, e.clientY, factor);
}

/**
 * Обработчик клика по карте
 */
function handleMapClick(e) {
  // Обработка клика для создания узлов и связей
  if (editMode) {
    handleEditModeClick(e);
  }
}

/**
 * Обработка клика в режиме редактирования
 */
function handleEditModeClick(e) {
  const worldPos = screenToWorld(e.clientX, e.clientY);
  
  if (nodeCreationMode) {
    showNodeCreationPanel(e.clientX, e.clientY, worldPos);
  } else if (edgeCreationMode) {
    // Логика создания связи
  }
}

/**
 * Обновление datalist для поиска систем
 */
function updateSystemsDatalist() {
  const datalist = document.getElementById('systemsDatalist');
  if (!datalist) return;
  
  datalist.innerHTML = '';
  systems.forEach(system => {
    const option = document.createElement('option');
    option.value = system.id;
    option.textContent = `${system.id}${system.name ? ` - ${system.name}` : ''}`;
    datalist.appendChild(option);
  });
}

/**
 * Загрузка сохраненных данных
 */
function loadSavedData() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEYS.FULL_MAP);
    if (savedData) {
      const mapData = JSON.parse(savedData);
      
      // Восстановление данных
      systems.length = 0;
      jumps.length = 0;
      systems.push(...mapData.systems);
      jumps.push(...mapData.jumps);
      
      // Восстановление динамических тегов
      Object.assign(dynamicCornerTags, mapData.dynamicCornerTags || {});
      Object.assign(dynamicKmTags, mapData.dynamicKmTags || {});
      
      // Обновление структур для поиска
      rebuildDataStructures();
      
      console.log('Сохраненные данные загружены');
    }
  } catch (error) {
    console.error('Ошибка при загрузке сохраненных данных:', error);
  }
}

/**
 * Показ панели создания узла
 */
function showNodeCreationPanel(clientX, clientY, worldPos) {
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
}

/**
 * Глобальные функции для доступа из HTML
 */
window.initApp = init;
window.focusRoad = focusRoad;
window.focusSystem = focusSystem;
window.shortestPath = shortestPath;
window.drawRoute = drawRoute;
window.clearRoute = clearRoute;
window.getDataStatistics = getDataStatistics;
window.roadClassBySystemId = roadClassBySystemId;
window.nodeCornerTag = nodeCornerTag;
window.nodeKmTag = nodeKmTag;
window.isTransportJunction = isTransportJunction;
window.nodeTooltipText = nodeTooltipText;

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
