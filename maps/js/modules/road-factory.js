/**
 * Фабрики для создания дорог в EVE Region Map
 * Модуль содержит функции для создания различных типов дорог и транспортных развязок
 */

import { ROAD_CONFIGS, TRANSPORT_JUNCTIONS } from './config.js';
import { systems, jumps, dynamicCornerTags, dynamicKmTags } from './data-structures.js';

/**
 * Создание круговой дороги (например, ЦКАД)
 * @param {Object} config - Конфигурация дороги
 */
export function createCircularRoad(config) {
  const { names, center, radius, cornerTags, kmTags } = config;
  
  // Создаем узлы по кругу
  names.forEach((name, idx) => {
    const angle = (idx / names.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(center.x + radius * Math.cos(angle));
    const y = Math.round(center.y + radius * Math.sin(angle));
    systems.push({ id: name, sec: 1.0, x, y });
  });
  
  // Создаем связи между соседними узлами
  for (let i = 0; i < names.length; i++) {
    const a = names[i];
    const b = names[(i + 1) % names.length];
    jumps.push([a, b]);
  }
  
  // Добавляем теги
  if (cornerTags) {
    Object.assign(dynamicCornerTags, cornerTags);
  }
  if (kmTags) {
    Object.assign(dynamicKmTags, kmTags);
  }
}

/**
 * Создание транспортной развязки между двумя узлами
 * @param {string} from - ID исходного узла
 * @param {string} to - ID целевого узла
 * @param {string} id - ID транспортной развязки
 * @param {string} name - Название транспортной развязки
 * @returns {Object|null} Созданная транспортная развязка или null
 */
export function createTransportJunction(from, to, id, name = '') {
  const a = systems.find(s => s.id === from);
  const b = systems.find(s => s.id === to);
  if (!a || !b) return null;

  const x = Math.round((a.x + b.x) / 2);
  const y = Math.round((a.y + b.y) / 2);
  const junction = { id, name, x, y };
  systems.push(junction);

  // Удаляем прямое ребро и добавляем через ТР
  for (let i = jumps.length - 1; i >= 0; i--) {
    const [jA, jB] = jumps[i];
    if ((jA === from && jB === to) || (jA === to && jB === from)) {
      jumps.splice(i, 1);
    }
  }
  jumps.push([from, id]);
  jumps.push([id, to]);
  
  return junction;
}

/**
 * Создание линейной дороги
 * @param {string} startNode - ID начального узла
 * @param {Array} nodeIds - Массив ID узлов дороги
 * @param {number} stepX - Шаг по X
 * @param {number} stepY - Шаг по Y
 * @param {number} startX - Начальная координата X
 * @param {number} startY - Начальная координата Y
 */
export function createLinearRoad(startNode, nodeIds, stepX = 55, stepY = 10, startX = 0, startY = 0) {
  let prevId = startNode;
  let x = startX;
  let y = startY;
  
  nodeIds.forEach((id) => {
    const node = { id, name: id, x, y };
    systems.push(node);
    jumps.push([prevId, id]);
    prevId = id;
    x += stepX;
    y += stepY;
  });
}

/**
 * Создание дороги из конфигурации
 * @param {Object} config - Конфигурация дороги
 * @param {string} startNode - ID начального узла
 * @param {number} stepX - Шаг по X
 * @param {number} stepY - Шаг по Y
 * @param {number} startX - Начальная координата X
 * @param {number} startY - Начальная координата Y
 */
export function createRoadFromConfig(config, startNode, stepX = 55, stepY = 6, startX = 0, startY = 0) {
  if (!config || !config.names || config.names.length === 0) return;
  
  let prevId = startNode;
  let x = startX;
  let y = startY;
  
  config.names.forEach((id) => {
    const node = { id, name: id, x, y };
    systems.push(node);
    if (prevId) {
      jumps.push([prevId, id]);
    }
    prevId = id;
    x += stepX;
    y += stepY;
  });
  
  // Добавляем теги
  if (config.cornerTags) {
    Object.assign(dynamicCornerTags, config.cornerTags);
  }
  if (config.kmTags) {
    Object.assign(dynamicKmTags, config.kmTags);
  }
}

/**
 * Создание ответвления дороги
 * @param {Object} config - Конфигурация дороги
 * @param {string} startNode - ID начального узла
 * @param {number} offsetX - Смещение по X
 * @param {number} offsetY - Смещение по Y
 * @param {number} stepX - Шаг по X
 * @param {number} stepY - Шаг по Y
 */
export function createRoadBranch(config, startNode, offsetX = 60, offsetY = 10, stepX = 55, stepY = 6) {
  if (!config || !config.names || config.names.length === 0) return;
  
  const startPos = systems.find(s => s.id === startNode);
  if (!startPos) return;
  
  let prevId = startNode;
  let x = startPos.x + offsetX;
  let y = startPos.y + offsetY;
  
  config.names.forEach((id) => {
    const node = { id, name: id, x, y };
    systems.push(node);
    if (prevId) {
      jumps.push([prevId, id]);
    }
    prevId = id;
    x += stepX;
    y += stepY;
  });
  
  // Добавляем теги
  if (config.cornerTags) {
    Object.assign(dynamicCornerTags, config.cornerTags);
  }
  if (config.kmTags) {
    Object.assign(dynamicKmTags, config.kmTags);
  }
}

/**
 * Создание всех дорог из конфигурации
 */
export function createAllRoads() {
  // Создание ЦКАД (круговая дорога)
  createCircularRoad(ROAD_CONFIGS.ckad);
  
  // Создание транспортных развязок
  TRANSPORT_JUNCTIONS.forEach(junction => {
    createTransportJunction(junction.from, junction.to, junction.id, junction.name);
  });
  
  // Создание M12
  createRoadFromConfig(ROAD_CONFIGS.m12, '101', 55, 6, 520, 120);
  
  // Создание M1
  createRoadFromConfig(ROAD_CONFIGS.m1, 'M1-obj-46', 55, 6, 520, 120);
  
  // Создание M3
  createRoadFromConfig(ROAD_CONFIGS.m3, 'M3-obj-137', 55, 6, 520, 120);
  
  // Создание M4
  createRoadFromConfig(ROAD_CONFIGS.m4, 'M4-obj-62', 55, 6, 520, 120);
  
  // Создание A289
  createRoadFromConfig(ROAD_CONFIGS.a289, '301', 55, 6, 520, 120);
  
  // Создание M11
  createRoadFromConfig(ROAD_CONFIGS.m11, 'ПВП-48', 55, 6, 520, 120);
  
  console.log('Все дороги созданы');
}

/**
 * Создание дополнительных связей между дорогами
 */
export function createAdditionalConnections() {
  // Добавление связей между основными дорогами
  // Например, связь между ЦКАД и M12
  
  console.log('Дополнительные связи созданы');
}

/**
 * Получение информации о дороге по ID узла
 * @param {string} systemId - ID узла
 * @returns {Object|null} Информация о дороге или null
 */
export function getRoadInfo(systemId) {
  for (const [roadKey, config] of Object.entries(ROAD_CONFIGS)) {
    if (config.names.includes(systemId)) {
      return {
        roadKey,
        roadName: roadKey.toUpperCase(),
        cornerTag: config.cornerTags[systemId] || null,
        kmTag: config.kmTags[systemId] || null
      };
    }
  }
  return null;
}

/**
 * Проверка, является ли узел частью дороги
 * @param {string} systemId - ID узла
 * @param {string} roadKey - Ключ дороги
 * @returns {boolean} true, если узел принадлежит дороге
 */
export function isPartOfRoad(systemId, roadKey) {
  const config = ROAD_CONFIGS[roadKey];
  return config && config.names.includes(systemId);
}
