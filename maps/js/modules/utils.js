/**
 * Утилиты для EVE Region Map
 * Модуль содержит вспомогательные функции для валидации, форматирования и других операций
 */

import { NODE_DIMENSIONS, GRID_STEP } from './config.js';
import { dynamicCornerTags, dynamicKmTags } from './data-structures.js';

/**
 * Валидация данных узла
 * @param {string} id - ID узла
 * @param {string} name - Название узла
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 * @returns {Array} Массив ошибок валидации
 */
export function validateNodeData(id, name, x, y) {
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

/**
 * Валидация данных связи
 * @param {string} fromId - ID исходного узла
 * @param {string} toId - ID целевого узла
 * @returns {Array} Массив ошибок валидации
 */
export function validateEdgeData(fromId, toId) {
  const errors = [];
  
  if (!fromId || !toId) {
    errors.push('ID исходного и целевого узлов обязательны');
  }
  
  if (fromId === toId) {
    errors.push('Нельзя создать связь узла с самим собой');
  }
  
  return errors;
}

/**
 * Ограничение значения в заданном диапазоне
 * @param {number} v - Значение
 * @param {number} min - Минимальное значение
 * @param {number} max - Максимальное значение
 * @returns {number} Ограниченное значение
 */
export function clamp(v, min, max) { 
  return Math.max(min, Math.min(max, v)); 
}

/**
 * Определение класса дороги по ID системы
 * @param {string} systemId - ID системы
 * @returns {string} CSS класс дороги
 */
export function roadClassBySystemId(systemId) {
  // ЦКАД
  if (systemId.match(/^00[1-9]|01[0-4]|013$/)) {
    return 'road-ckad';
  }
  
  // M12
  if (systemId.match(/^1[0-2][0-9]$/)) {
    return 'road-m12';
  }
  
  // M1
  if (systemId.match(/^M1-obj-/)) {
    return 'road-m1';
  }
  
  // M3
  if (systemId.match(/^M3-obj-/)) {
    return 'road-m3';
  }
  
  // M4
  if (systemId.match(/^M4-obj-/)) {
    return 'road-m4';
  }
  
  // A289
  if (systemId.match(/^30[1-3]$/)) {
    return 'road-a289';
  }
  
  // M11 (ПВП)
  if (systemId.match(/^ПВП-/)) {
    return 'road-m11';
  }
  
  // Транспортные развязки
  if (systemId.match(/^ТР-/)) {
    return 'road-junction';
  }
  
  return 'road-other';
}

/**
 * Получение тега угла для узла
 * @param {string} id - ID узла
 * @returns {string|null} Тег угла или null
 */
export function nodeCornerTag(id) {
  // Сначала проверяем динамические теги
  if (dynamicCornerTags[id]) {
    return dynamicCornerTags[id];
  }
  
  // Затем проверяем статические теги из конфигурации
  // Это можно вынести в отдельную функцию, если нужно
  
  return null;
}

/**
 * Получение километровой отметки для узла
 * @param {string} id - ID узла
 * @returns {string|null} Километровая отметка или null
 */
export function nodeKmTag(id) {
  // Сначала проверяем динамические теги
  if (dynamicKmTags[id]) {
    return dynamicKmTags[id];
  }
  
  return null;
}

/**
 * Проверка, является ли узел транспортной развязкой
 * @param {string} id - ID узла
 * @returns {boolean} true, если это транспортная развязка
 */
export function isTransportJunction(id) {
  return id.startsWith('ТР-');
}

/**
 * Генерация текста подсказки для узла
 * @param {string} id - ID узла
 * @returns {string} Текст подсказки
 */
export function nodeTooltipText(id) {
  const parts = [];
  
  // ID узла
  parts.push(`ID: ${id}`);
  
  // Тег угла
  const cornerTag = nodeCornerTag(id);
  if (cornerTag) {
    parts.push(`Угол: ${cornerTag}`);
  }
  
  // Километровая отметка
  const kmTag = nodeKmTag(id);
  if (kmTag) {
    parts.push(`Км: ${kmTag}`);
  }
  
  // Тип дороги
  const roadClass = roadClassBySystemId(id);
  if (roadClass !== 'road-other') {
    parts.push(`Дорога: ${roadClass.replace('road-', '').toUpperCase()}`);
  }
  
  // Транспортная развязка
  if (isTransportJunction(id)) {
    parts.push('Транспортная развязка');
  }
  
  return parts.join('\n');
}

/**
 * Привязка значения к сетке
 * @param {number} value - Значение
 * @param {number} step - Шаг сетки
 * @returns {number} Значение, привязанное к сетке
 */
export function snapToGrid(value, step = GRID_STEP) {
  return Math.round(value / step) * step;
}

/**
 * Экранирование CSS селекторов
 * @param {string} str - Строка для экранирования
 * @returns {string} Экранированная строка
 */
export function cssEscape(str) {
  return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

/**
 * Проверка видимости узла в текущем вьюпорте
 * @param {Object} node - Узел для проверки
 * @param {Object} viewportBounds - Границы вьюпорта
 * @returns {boolean} true, если узел видим
 */
export function isNodeVisible(node, viewportBounds) {
  const nodeBounds = {
    minX: node.x - NODE_DIMENSIONS.WIDTH / 2,
    maxX: node.x + NODE_DIMENSIONS.WIDTH / 2,
    minY: node.y - NODE_DIMENSIONS.HEIGHT / 2,
    maxY: node.y + NODE_DIMENSIONS.HEIGHT / 2
  };
  
  return !(nodeBounds.maxX < viewportBounds.minX || 
           nodeBounds.minX > viewportBounds.maxX || 
           nodeBounds.maxY < viewportBounds.minY || 
           nodeBounds.minY > viewportBounds.maxY);
}

/**
 * Обновление метрик производительности
 * @param {number} renderTime - Время рендеринга в миллисекундах
 */
export function updatePerformanceMetrics(renderTime) {
  totalRenderTime += renderTime;
  renderCount++;
  
  if (renderCount % 60 === 0) {
    const avgRenderTime = totalRenderTime / renderCount;
    console.log(`Среднее время рендеринга: ${avgRenderTime.toFixed(2)}ms`);
    
    // Сброс счетчиков каждые 60 кадров
    totalRenderTime = 0;
    renderCount = 0;
  }
}

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} Отформатированный размер
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Генерация уникального ID
 * @param {string} prefix - Префикс для ID
 * @returns {string} Уникальный ID
 */
export function generateUniqueId(prefix = 'node') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Проверка поддержки localStorage
 * @returns {boolean} true, если localStorage поддерживается
 */
export function isLocalStorageSupported() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Безопасное выполнение операции с обработкой ошибок
 * @param {Function} operation - Операция для выполнения
 * @param {string} errorMessage - Сообщение об ошибке
 * @returns {*} Результат операции или null при ошибке
 */
export function safeOperation(operation, errorMessage) {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
}
