/**
 * Управление вьюпортом для EVE Region Map
 * Модуль содержит функции для зума, панорамирования и центрирования карты
 */

import { ZOOM_LIMITS, GRID_STEP } from './config.js';
import { scale, translate, systems } from './data-structures.js';

/**
 * Применение трансформации к вьюпорту
 */
export function applyTransform() {
  const viewport = document.getElementById('viewport');
  if (viewport) {
    viewport.setAttribute('transform', 
      `translate(${translate.x}, ${translate.y}) scale(${scale})`);
  }
}

/**
 * Зум в указанной точке
 * @param {number} clientX - Координата X клика
 * @param {number} clientY - Координата Y клика
 * @param {number} factor - Коэффициент зума
 */
export function zoomAtPoint(clientX, clientY, factor) {
  const svg = document.getElementById('map');
  if (!svg) return;
  
  const rect = svg.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  const newScale = clamp(scale * factor, ZOOM_LIMITS.MIN, ZOOM_LIMITS.MAX);
  const scaleRatio = newScale / scale;
  
  translate.x = x - (x - translate.x) * scaleRatio;
  translate.y = y - (y - translate.y) * scaleRatio;
  scale = newScale;
  
  applyTransform();
}

/**
 * Преобразование экранных координат в мировые
 * @param {number} clientX - Экранная координата X
 * @param {number} clientY - Экранная координата Y
 * @returns {Object} Мировые координаты {x, y}
 */
export function screenToWorld(clientX, clientY) {
  const svg = document.getElementById('map');
  if (!svg) return { x: 0, y: 0 };
  
  const rect = svg.getBoundingClientRect();
  const x = (clientX - rect.left - translate.x) / scale;
  const y = (clientY - rect.top - translate.y) / scale;
  
  return { x, y };
}

/**
 * Ограничение значения в заданном диапазоне
 * @param {number} v - Значение
 * @param {number} min - Минимальное значение
 * @param {number} max - Максимальное значение
 * @returns {number} Ограниченное значение
 */
function clamp(v, min, max) { 
  return Math.max(min, Math.min(max, v)); 
}

/**
 * Подгонка вьюпорта под содержимое
 */
export function fitViewToContent() {
  if (systems.length === 0) return;
  
  // Вычисление границ всех узлов
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  systems.forEach(system => {
    minX = Math.min(minX, system.x);
    maxX = Math.max(maxX, system.x);
    minY = Math.min(minY, system.y);
    maxY = Math.max(maxY, system.y);
  });
  
  // Добавление отступов
  const padding = 100;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;
  
  // Вычисление центра и размеров
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Получение размеров вьюпорта
  const svg = document.getElementById('map');
  if (!svg) return;
  
  const viewW = svg.clientWidth;
  const viewH = svg.clientHeight;
  
  // Вычисление масштаба
  const scaleX = viewW / width;
  const scaleY = viewH / height;
  scale = Math.min(scaleX, scaleY, ZOOM_LIMITS.MAX);
  
  // Центрирование
  translate.x = viewW / 2 - centerX * scale;
  translate.y = viewH / 2 - centerY * scale;
  
  applyTransform();
  console.log('Вьюпорт подогнан под содержимое');
}

/**
 * Фокус на конкретную дорогу
 * @param {string} roadKey - Ключ дороги
 * @param {number} desiredScale - Желаемый масштаб
 */
export function focusRoad(roadKey, desiredScale = null) {
  // Поиск систем дороги
  const roadSystems = systems.filter(s => matchRoadKey(s.id, roadKey));
  
  if (roadSystems.length === 0) {
    console.warn(`Дорога ${roadKey} не найдена`);
    return;
  }
  
  // Вычисление границ
  const bounds = calculateBounds(roadSystems);
  
  // Центрирование и масштабирование
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  // Получение размеров вьюпорта
  const svg = document.getElementById('map');
  if (!svg) return;
  
  const viewW = svg.clientWidth;
  const viewH = svg.clientHeight;
  
  // Вычисление масштаба
  if (desiredScale) {
    scale = desiredScale;
  } else {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scaleX = viewW / width;
    const scaleY = viewH / height;
    scale = Math.min(scaleX, scaleY, ZOOM_LIMITS.MAX);
  }
  
  // Применение трансформации
  translate.x = viewW / 2 - centerX * scale;
  translate.y = viewH / 2 - centerY * scale;
  
  applyTransform();
  console.log(`Фокус на дорогу ${roadKey}`);
}

/**
 * Проверка соответствия ID системы ключу дороги
 * @param {string} id - ID системы
 * @param {string} key - Ключ дороги
 * @returns {boolean} true, если система принадлежит дороге
 */
function matchRoadKey(id, key) {
  switch (key) {
    case 'ckad':
      return id.match(/^00[1-9]|01[0-4]|013$/);
    case 'm12':
      return id.match(/^1[0-2][0-9]$/);
    case 'm1':
      return id.match(/^M1-obj-/);
    case 'm3':
      return id.match(/^M3-obj-/);
    case 'm4':
      return id.match(/^M4-obj-/);
    case 'a289':
      return id.match(/^30[1-3]$/);
    case 'm11':
      return id.match(/^ПВП-/);
    default:
      return false;
  }
}

/**
 * Вычисление границ массива систем
 * @param {Array} systems - Массив систем
 * @returns {Object} Границы {minX, maxX, minY, maxY}
 */
function calculateBounds(systems) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  systems.forEach(system => {
    minX = Math.min(minX, system.x);
    maxX = Math.max(maxX, system.x);
    minY = Math.min(minY, system.y);
    maxY = Math.max(maxY, system.y);
  });
  
  return { minX, maxX, minY, maxY };
}

/**
 * Фокус на конкретную систему
 * @param {string} id - ID системы
 */
export function focusSystem(id) {
  const system = systems.find(s => s.id === id);
  if (!system) {
    console.warn(`Система ${id} не найдена`);
    return;
  }
  
  // Получение размеров вьюпорта
  const svg = document.getElementById('map');
  if (!svg) return;
  
  const viewW = svg.clientWidth;
  const viewH = svg.clientHeight;
  
  // Центрирование на системе
  translate.x = viewW / 2 - system.x * scale;
  translate.y = viewH / 2 - system.y * scale;
  
  applyTransform();
  console.log(`Фокус на систему ${id}`);
}

/**
 * Подсветка узла
 * @param {string} id - ID узла
 */
export function highlightNode(id) {
  // Убираем предыдущую подсветку
  document.querySelectorAll('.highlighted').forEach(node => {
    node.classList.remove('highlighted');
  });
  
  // Добавляем подсветку к текущему узлу
  const nodeElement = document.querySelector(`[data-id="${id}"]`);
  if (nodeElement) {
    nodeElement.classList.add('highlighted');
  }
}

/**
 * Сброс вьюпорта к начальному состоянию
 */
export function resetViewport() {
  scale = 1;
  translate.x = 0;
  translate.y = 0;
  applyTransform();
  console.log('Вьюпорт сброшен');
}

/**
 * Получение текущих параметров вьюпорта
 * @returns {Object} Параметры вьюпорта
 */
export function getViewportState() {
  return {
    scale,
    translate: { ...translate },
    zoomLevel: Math.round(scale * 100) / 100
  };
}

/**
 * Установка параметров вьюпорта
 * @param {Object} state - Параметры вьюпорта
 */
export function setViewportState(state) {
  if (state.scale !== undefined) {
    scale = clamp(state.scale, ZOOM_LIMITS.MIN, ZOOM_LIMITS.MAX);
  }
  
  if (state.translate) {
    translate.x = state.translate.x || 0;
    translate.y = state.translate.y || 0;
  }
  
  applyTransform();
}

/**
 * Анимация перехода к точке
 * @param {number} targetX - Целевая координата X
 * @param {number} targetY - Целевая координата Y
 * @param {number} targetScale - Целевой масштаб
 * @param {number} duration - Длительность анимации в мс
 */
export function animateToPoint(targetX, targetY, targetScale, duration = 500) {
  const startScale = scale;
  const startX = translate.x;
  const startY = translate.y;
  
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Плавная функция анимации
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    scale = startScale + (targetScale - startScale) * easeProgress;
    translate.x = startX + (targetX - startX) * easeProgress;
    translate.y = startY + (targetY - startY) * easeProgress;
    
    applyTransform();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}
