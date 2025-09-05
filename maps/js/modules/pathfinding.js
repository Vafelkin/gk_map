/**
 * Алгоритмы поиска пути для EVE Region Map
 * Модуль содержит BFS алгоритм и функции для отрисовки маршрутов
 */

import { adjacency } from './data-structures.js';

/**
 * Поиск кратчайшего пути между двумя узлами (BFS)
 * @param {string} from - ID исходного узла
 * @param {string} to - ID целевого узла
 * @returns {Array|null} Массив ID узлов пути или null, если путь не найден
 */
export function shortestPath(from, to) {
  if (from === to) return [from];
  
  const queue = [[from, [from]]];
  const visited = new Set();
  
  while (queue.length > 0) {
    const [currentId, path] = queue.shift();
    
    if (currentId === to) return path;
    if (visited.has(currentId)) continue;
    
    visited.add(currentId);
    const neighbors = adjacency.get(currentId) || new Set();
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push([neighborId, [...path, neighborId]]);
      }
    }
  }
  
  return null; // Путь не найден
}

/**
 * Построение структуры смежности из массива связей
 * @param {Array} edges - Массив связей [fromId, toId]
 * @returns {Map} Map с узлами и их соседями
 */
export function buildAdjacency(edges) {
  const adj = new Map();
  
  edges.forEach(([a, b]) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    
    adj.get(a).add(b);
    adj.get(b).add(a);
  });
  
  return adj;
}

/**
 * Отрисовка маршрута на карте
 * @param {Array} path - Массив ID узлов маршрута
 */
export function drawRoute(path) {
  if (!path || path.length < 2) return;
  
  // Очистка предыдущего маршрута
  clearRoute();
  
  // Подсветка узлов маршрута
  path.forEach(nodeId => {
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.classList.add('route-node');
    }
  });
  
  // Подсветка связей маршрута
  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i + 1];
    paintEdge(fromId, toId, true);
  }
  
  console.log(`Маршрут отрисован: ${path.length} узлов`);
}

/**
 * Очистка отображения маршрута
 */
export function clearRoute() {
  // Убираем подсветку узлов
  document.querySelectorAll('.route-node').forEach(node => {
    node.classList.remove('route-node');
  });
  
  // Убираем подсветку связей
  document.querySelectorAll('.edge.route-edge').forEach(edge => {
    edge.classList.remove('route-edge');
  });
}

/**
 * Подсветка связи между двумя узлами
 * @param {string} a - ID первого узла
 * @param {string} b - ID второго узла
 * @param {boolean} active - Флаг активности
 */
export function paintEdge(a, b, active) {
  // Находим все связи между узлами a и b
  const edges = document.querySelectorAll(`.edge[data-from="${a}"][data-to="${b}"], .edge[data-from="${b}"][data-to="${a}"]`);
  
  edges.forEach(edge => {
    if (active) {
      edge.classList.add('route-edge');
      edge.style.stroke = '#ff6b6b';
      edge.style.strokeWidth = '3';
    } else {
      edge.classList.remove('route-edge');
      edge.style.stroke = '';
      edge.style.strokeWidth = '';
    }
  });
}

/**
 * Проверка, является ли связь свободной (не является частью маршрута)
 * @param {string} a - ID первого узла
 * @param {string} b - ID второго узла
 * @returns {boolean} true, если связь свободна
 */
export function isFreeEdge(a, b) {
  const edges = document.querySelectorAll(`.edge[data-from="${a}"][data-to="${b}"], .edge[data-from="${b}"][data-to="${a}"]`);
  
  for (const edge of edges) {
    if (edge.classList.contains('route-edge')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Поиск всех возможных путей между двумя узлами (с ограничением глубины)
 * @param {string} from - ID исходного узла
 * @param {string} to - ID целевого узла
 * @param {number} maxDepth - Максимальная глубина поиска
 * @returns {Array} Массив всех найденных путей
 */
export function findAllPaths(from, to, maxDepth = 5) {
  if (from === to) return [[from]];
  if (maxDepth <= 0) return [];
  
  const paths = [];
  const visited = new Set();
  
  function dfs(currentId, currentPath, depth) {
    if (depth > maxDepth) return;
    if (currentId === to) {
      paths.push([...currentPath]);
      return;
    }
    
    visited.add(currentId);
    const neighbors = adjacency.get(currentId) || new Set();
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        dfs(neighborId, [...currentPath, neighborId], depth + 1);
      }
    }
    
    visited.delete(currentId);
  }
  
  dfs(from, [from], 0);
  return paths;
}

/**
 * Поиск альтернативных маршрутов
 * @param {string} from - ID исходного узла
 * @param {string} to - ID целевого узла
 * @param {number} count - Количество альтернативных маршрутов
 * @returns {Array} Массив альтернативных маршрутов
 */
export function findAlternativeRoutes(from, to, count = 3) {
  const allPaths = findAllPaths(from, to, 10);
  
  // Сортируем пути по длине
  allPaths.sort((a, b) => a.length - b.length);
  
  // Возвращаем указанное количество кратчайших путей
  return allPaths.slice(0, count);
}

/**
 * Вычисление расстояния между двумя узлами
 * @param {Object} nodeA - Первый узел
 * @param {Object} nodeB - Второй узел
 * @returns {number} Евклидово расстояние
 */
export function calculateDistance(nodeA, nodeB) {
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Поиск ближайшего узла к заданной точке
 * @param {number} x - Координата X
 * @param {number} y - Координата Y
 * @param {Array} nodes - Массив узлов для поиска
 * @returns {Object|null} Ближайший узел или null
 */
export function findNearestNode(x, y, nodes) {
  if (!nodes || nodes.length === 0) return null;
  
  let nearestNode = null;
  let minDistance = Infinity;
  
  nodes.forEach(node => {
    const distance = calculateDistance({ x, y }, node);
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = node;
    }
  });
  
  return nearestNode;
}

/**
 * Проверка, находится ли узел в заданном радиусе
 * @param {Object} center - Центральный узел
 * @param {Object} node - Проверяемый узел
 * @param {number} radius - Радиус
 * @returns {boolean} true, если узел в радиусе
 */
export function isNodeInRadius(center, node, radius) {
  return calculateDistance(center, node) <= radius;
}

/**
 * Поиск узлов в радиусе от заданной точки
 * @param {number} x - Координата X центра
 * @param {number} y - Координата Y центра
 * @param {number} radius - Радиус поиска
 * @param {Array} nodes - Массив узлов для поиска
 * @returns {Array} Массив узлов в радиусе
 */
export function findNodesInRadius(x, y, radius, nodes) {
  return nodes.filter(node => {
    const distance = calculateDistance({ x, y }, node);
    return distance <= radius;
  });
}
