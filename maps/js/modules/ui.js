/**
 * Модуль UI для EVE Region Map
 * Содержит функции для работы с пользовательским интерфейсом
 */

import { 
  systems, 
  jumps, 
  dynamicCornerTags, 
  dynamicKmTags,
  rebuildDataStructures 
} from './data-structures.js';
import { formatFileSize } from './utils.js';
import { STORAGE_KEYS } from './config.js';

/**
 * Показ сообщения пользователю
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения (info, success, warning, error)
 */
export function showMessage(message, type = 'info') {
  // Создание элемента сообщения
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  
  // Стили для сообщения
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Цвета в зависимости от типа
  const colors = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };
  
  messageEl.style.backgroundColor = colors[type] || colors.info;
  
  // Добавление в DOM
  document.body.appendChild(messageEl);
  
  // Автоматическое удаление через 5 секунд
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }
  }, 5000);
  
  // Добавление CSS анимаций если их еще нет
  if (!document.getElementById('messageAnimations')) {
    const style = document.createElement('style');
    style.id = 'messageAnimations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Показ сообщения об успехе
 * @param {string} message - Текст сообщения
 */
export function showSuccessMessage(message) {
  showMessage(message, 'success');
}

/**
 * Показ сообщения об ошибке
 * @param {string} message - Текст сообщения
 */
export function showErrorMessage(message) {
  showMessage(message, 'error');
}

/**
 * Показ предупреждения
 * @param {string} message - Текст сообщения
 */
export function showWarningMessage(message) {
  showMessage(message, 'warning');
}

/**
 * Показ информационного сообщения
 * @param {string} message - Текст сообщения
 */
export function showInfoMessage(message) {
  showMessage(message, 'info');
}

/**
 * Обновление datalist для поиска систем
 */
export function updateSystemsDatalist() {
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
 * Показ статистики карты
 */
export function showMapStatistics() {
  const stats = {
    systems: systems.length,
    jumps: systems.reduce((acc, system) => {
      // Подсчет связей для каждой системы
      return acc + (system.connections || 0);
    }, 0),
    roads: getRoadStatistics(),
    storage: getStorageInfo()
  };
  
  const message = `
Статистика карты:
• Узлов: ${stats.systems}
• Связей: ${stats.jumps}
• Дорог: ${stats.roads}
• Размер данных: ${formatFileSize(stats.storage.totalSize)}
  `;
  
  showInfoMessage(message);
}

/**
 * Получение статистики дорог
 */
function getRoadStatistics() {
  const roadCounts = {};
  
  systems.forEach(system => {
    const roadType = getRoadType(system.id);
    if (roadType) {
      roadCounts[roadType] = (roadCounts[roadType] || 0) + 1;
    }
  });
  
  return Object.keys(roadCounts).length;
}

/**
 * Определение типа дороги по ID системы
 */
function getRoadType(systemId) {
  if (systemId.match(/^00[1-9]|01[0-4]|013$/)) return 'ЦКАД';
  if (systemId.match(/^1[0-2][0-9]$/)) return 'M12';
  if (systemId.match(/^M1-obj-/)) return 'M1';
  if (systemId.match(/^M3-obj-/)) return 'M3';
  if (systemId.match(/^M4-obj-/)) return 'M4';
  if (systemId.match(/^30[1-3]$/)) return 'A289';
  if (systemId.match(/^ПВП-/)) return 'M11';
  if (systemId.match(/^ТР-/)) return 'ТР';
  return null;
}

/**
 * Получение информации о хранилище
 */
function getStorageInfo() {
  const positionsSize = localStorage.getItem('mapPositions')?.length || 0;
  const fullMapSize = localStorage.getItem('fullMapData')?.length || 0;
  
  return {
    totalSize: positionsSize + fullMapSize,
    positionsSize,
    fullMapSize
  };
}

/**
 * Инициализация UI элементов
 */
export function initUI() {
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
 * Загрузка сохраненных данных
 */
export function loadSavedData() {
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
 * Инициализация обработчиков UI
 */
export function initUIHandlers() {
  // Обработчики кнопок
  const searchBtn = document.getElementById('searchBtn');
  const routeBtn = document.getElementById('routeBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const statsBtn = document.getElementById('statsBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const saveMapBtn = document.getElementById('saveMapBtn');
  const createNodeBtn = document.getElementById('createNodeBtn');
  const cancelNodeBtn = document.getElementById('cancelNodeBtn');
  
  // Поиск системы
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }
  
  // Построение маршрута
  if (routeBtn) {
    routeBtn.addEventListener('click', handleRoute);
  }
  
  // Экспорт/импорт
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportMap());
  }
  
  if (importBtn) {
    importBtn.addEventListener('click', () => createImportInput());
  }
  
  // Статистика
  if (statsBtn) {
    statsBtn.addEventListener('click', showMapStatistics);
  }
  
  // Отмена/повтор
  if (undoBtn) {
    undoBtn.addEventListener('click', () => undo());
  }
  
  if (redoBtn) {
    redoBtn.addEventListener('click', () => redo());
  }
  
  // Выбор узлов
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => selectAllNodes());
  }
  
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => deselectAllNodes());
  }
  
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => deleteSelectedNodes());
  }
  
  // Сохранение
  if (saveMapBtn) {
    saveMapBtn.addEventListener('click', () => autoSaveMap());
  }
  
  // Создание узла
  if (createNodeBtn) {
    createNodeBtn.addEventListener('click', () => createNewNode());
  }
  
  if (cancelNodeBtn) {
    cancelNodeBtn.addEventListener('click', () => hideNodeCreationPanel());
  }
  
  // Обработчики легенды
  const legendButtons = document.querySelectorAll('.legend .legend-item');
  legendButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const road = btn.dataset.road;
      if (road) {
        focusRoad(road);
      }
    });
  });
  
  console.log('UI обработчики инициализированы');
}

/**
 * Обработка поиска системы
 */
function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const query = searchInput.value.trim();
  if (!query) {
    showWarningMessage('Введите ID системы для поиска');
    return;
  }
  
  const system = systems.find(s => s.id.toLowerCase() === query.toLowerCase());
  if (system) {
    focusSystem(system.id);
    showSuccessMessage(`Найдена система: ${system.id}`);
  } else {
    showErrorMessage(`Система ${query} не найдена`);
  }
}

/**
 * Обработка построения маршрута
 */
function handleRoute() {
  const fromInput = document.getElementById('fromInput');
  const toInput = document.getElementById('toInput');
  const routeInfo = document.getElementById('routeInfo');
  
  if (!fromInput || !toInput) return;
  
  const fromId = fromInput.value.trim();
  const toId = toInput.value.trim();
  
  if (!fromId || !toId) {
    showWarningMessage('Выберите начальную и конечную системы');
    return;
  }
  
  if (fromId === toId) {
    showWarningMessage('Начальная и конечная системы не могут быть одинаковыми');
    return;
  }
  
  const path = shortestPath(fromId, toId);
  if (path) {
    drawRoute(path);
    if (routeInfo) {
      routeInfo.textContent = `Маршрут: ${path.length} прыжков`;
    }
    showSuccessMessage(`Маршрут построен: ${path.length} прыжков`);
  } else {
    if (routeInfo) {
      routeInfo.textContent = 'Маршрут не найден';
    }
    showErrorMessage('Маршрут не найден');
  }
}

// Импорт необходимых функций
import { exportMap, createImportInput, autoSaveMap } from './storage.js';
import { undo, redo } from './editor.js';
import { selectAllNodes, deselectAllNodes, deleteSelectedNodes } from './editor.js';
import { createNewNode } from './editor.js';
import { focusRoad, focusSystem } from './viewport.js';
import { shortestPath, drawRoute } from './pathfinding.js';
