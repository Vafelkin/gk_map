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

import { 
  initUI as initUIModule,
  loadSavedData as loadSavedDataModule
} from './modules/ui.js';

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
  initUIModule();
  
  // Инициализация обработчиков событий
  initEventHandlersModule();
  
  // Инициализация режимов редактирования
  initEditModes();
  
  // Инициализация UI обработчиков
  initUIHandlers();
  
  // Загрузка сохраненных данных
  loadSavedDataModule();
  
  // Первоначальный рендеринг
  render();
  
  // Центрирование карты на ЦКАД
  setTimeout(() => {
    focusRoad('ckad', 0.93);
  }, 100);
  
  console.log('Приложение инициализировано');
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
