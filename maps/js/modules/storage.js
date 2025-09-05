/**
 * Модуль хранения данных для EVE Region Map
 * Содержит функции для сохранения, загрузки и управления данными в localStorage
 */

import { STORAGE_KEYS, APP_VERSION } from './config.js';
import { systems, jumps, dynamicCornerTags, dynamicKmTags } from './data-structures.js';
import { isLocalStorageSupported, safeOperation } from './utils.js';

/**
 * Сохранение полной карты в localStorage
 */
export function saveFullMap() {
  if (!isLocalStorageSupported()) {
    console.warn('localStorage не поддерживается');
    return false;
  }
  
  return safeOperation(() => {
    const mapData = {
      systems: systems,
      jumps: jumps,
      dynamicCornerTags: dynamicCornerTags,
      dynamicKmTags: dynamicKmTags,
      timestamp: Date.now(),
      version: APP_VERSION
    };
    
    localStorage.setItem(STORAGE_KEYS.FULL_MAP, JSON.stringify(mapData));
    console.log('Полная карта сохранена в localStorage');
    return true;
  }, 'Ошибка при сохранении карты');
}

/**
 * Загрузка полной карты из localStorage
 */
export function loadFullMap() {
  if (!isLocalStorageSupported()) {
    console.warn('localStorage не поддерживается');
    return false;
  }
  
  return safeOperation(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.FULL_MAP);
    if (!raw) {
      console.log('Сохраненная карта не найдена');
      return false;
    }
    
    const mapData = JSON.parse(raw);
    if (!mapData || !mapData.systems || !mapData.jumps) {
      console.log('Неверный формат сохраненной карты');
      return false;
    }
    
    // Очищаем текущие данные
    systems.length = 0;
    jumps.length = 0;
    Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
    Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
    
    // Загружаем сохраненные данные
    systems.push(...mapData.systems);
    jumps.push(...mapData.jumps);
    Object.assign(dynamicCornerTags, mapData.dynamicCornerTags || {});
    Object.assign(dynamicKmTags, mapData.dynamicKmTags || {});
    
    console.log(`Загружена сохраненная карта: ${systems.length} узлов, ${jumps.length} связей`);
    return true;
  }, 'Ошибка при загрузке карты');
}

/**
 * Сохранение позиций узлов (для совместимости)
 */
export function savePositions() {
  if (!isLocalStorageSupported()) return false;
  
  return safeOperation(() => {
    const positions = {};
    systems.forEach(system => {
      positions[system.id] = { x: system.x, y: system.y };
    });
    
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
    console.log('Позиции узлов сохранены');
    return true;
  }, 'Ошибка при сохранении позиций');
}

/**
 * Загрузка позиций узлов
 */
export function loadSavedPositions() {
  if (!isLocalStorageSupported()) return false;
  
  return safeOperation(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.POSITIONS);
    if (!raw) return false;
    
    const positions = JSON.parse(raw);
    if (!positions) return false;
    
    // Применение сохраненных позиций
    systems.forEach(system => {
      if (positions[system.id]) {
        system.x = positions[system.id].x;
        system.y = positions[system.id].y;
      }
    });
    
    console.log('Позиции узлов загружены');
    return true;
  }, 'Ошибка при загрузке позиций');
}

/**
 * Автоматическое сохранение при изменениях
 */
export function autoSaveMap() {
  // Сохраняем позиции (для совместимости)
  savePositions();
  // Сохраняем полную карту
  saveFullMap();
}

/**
 * Экспорт карты в JSON файл
 */
export function exportMap() {
  const mapData = {
    systems: systems,
    jumps: jumps,
    dynamicCornerTags: dynamicCornerTags,
    dynamicKmTags: dynamicKmTags,
    timestamp: Date.now(),
    version: APP_VERSION,
    metadata: {
      description: 'EVE Region Map - The Forge',
      exportedBy: 'EVE Region Map v' + APP_VERSION,
      nodeCount: systems.length,
      edgeCount: jumps.length
    }
  };
  
  const dataStr = JSON.stringify(mapData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `eve-map-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  console.log('Карта экспортирована');
}

/**
 * Импорт карты из JSON файла
 */
export function importMap(file) {
  if (!file) return false;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const mapData = JSON.parse(e.target.result);
      
      if (!mapData.systems || !mapData.jumps) {
        throw new Error('Неверный формат файла');
      }
      
      // Подтверждение импорта
      if (!confirm(`Импортировать карту с ${mapData.systems.length} узлами и ${mapData.jumps.length} связями?`)) {
        return;
      }
      
      // Очистка текущих данных
      systems.length = 0;
      jumps.length = 0;
      Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
      Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
      
      // Загрузка импортированных данных
      systems.push(...mapData.systems);
      jumps.push(...mapData.jumps);
      Object.assign(dynamicCornerTags, mapData.dynamicCornerTags || {});
      Object.assign(dynamicKmTags, mapData.dynamicKmTags || {});
      
      // Обновление структур для поиска
      rebuildDataStructures();
      
      // Автосохранение
      autoSaveMap();
      
      console.log('Карта импортирована');
      showSuccessMessage(`Карта импортирована: ${systems.length} узлов, ${jumps.length} связей`);
      
    } catch (error) {
      console.error('Ошибка при импорте карты:', error);
      showErrorMessage('Ошибка при импорте карты: ' + error.message);
    }
  };
  
  reader.onerror = function() {
    showErrorMessage('Ошибка при чтении файла');
  };
  
  reader.readAsText(file);
}

/**
 * Создание элемента input для импорта файла
 */
export function createImportInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importMap(file);
    }
    // Очистка input для возможности повторного выбора того же файла
    input.value = '';
  });
  
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

/**
 * Очистка всех сохраненных данных
 */
export function clearAllData() {
  if (!confirm('Удалить все сохраненные данные? Это действие нельзя отменить.')) {
    return;
  }
  
  if (isLocalStorageSupported()) {
    localStorage.removeItem(STORAGE_KEYS.POSITIONS);
    localStorage.removeItem(STORAGE_KEYS.FULL_MAP);
  }
  
  console.log('Все сохраненные данные удалены');
}

/**
 * Получение информации о сохраненных данных
 */
export function getStorageInfo() {
  if (!isLocalStorageSupported()) {
    return { supported: false };
  }
  
  const positionsSize = localStorage.getItem(STORAGE_KEYS.POSITIONS)?.length || 0;
  const fullMapSize = localStorage.getItem(STORAGE_KEYS.FULL_MAP)?.length || 0;
  
  return {
    supported: true,
    positionsSize,
    fullMapSize,
    totalSize: positionsSize + fullMapSize,
    hasPositions: positionsSize > 0,
    hasFullMap: fullMapSize > 0
  };
}

// Импорт необходимых функций
import { rebuildDataStructures } from './data-structures.js';
import { showSuccessMessage, showErrorMessage } from './ui.js';
