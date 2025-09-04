/*
  EVE Region Map — The Forge (Prototype)
  - Рендер SVG: узлы (системы) и рёбра (прыжки)
  - Панорамирование (drag), зум (wheel/buttons), поиск, кратчайший маршрут (BFS)
*/

(function() {
  const svg = document.getElementById('map');
  const viewport = document.getElementById('viewport');
  const edgesLayer = document.getElementById('edgesLayer');
  const nodesLayer = document.getElementById('nodesLayer');
  const labelsLayer = document.getElementById('labelsLayer');

  const searchInput = document.getElementById('searchInput');
  const systemsDatalist = document.getElementById('systemsDatalist');
  const searchBtn = document.getElementById('searchBtn');
  const fromInput = document.getElementById('fromInput');
  const toInput = document.getElementById('toInput');
  const routeBtn = document.getElementById('routeBtn');
  const routeInfo = document.getElementById('routeInfo');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const dragToggle = document.getElementById('dragToggle');
  const legendButtons = document.querySelectorAll('.legend .legend-item');
  
  // Кнопки редактирования
  const addNodeBtn = document.getElementById('addNodeBtn');
  const addEdgeBtn = document.getElementById('addEdgeBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  
  // Кнопки экспорта/импорта
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  
  // Панель создания узла
  const nodeCreationPanel = document.getElementById('nodeCreationPanel');
  const createNodeBtn = document.getElementById('createNodeBtn');
  const cancelNodeBtn = document.getElementById('cancelNodeBtn');
  
  // Dynamic tags for corner labels (must be defined before graph build)
  const dynamicCornerTags = {};
  const dynamicKmTags = {};
  

  // Константы
  const NODE_DIMENSIONS = {
    WIDTH: 84,
    HEIGHT: 22,
    PADDING_X: 8
  };
  
  const ZOOM_LIMITS = {
    MIN: 0.4,
    MAX: 8
  };
  
  const GRID_STEP = 10;
  
  // Инициализация 
  const systems = [];
  const jumps = [];
  
  // Переменные для выбора узлов
  let selectedNodeId = null;
  let selectedNode = null;
  
  // Множество выбранных узлов для групповых операций
  const selectedNodes = new Set();

  // Конфигурация дорог
  const ROAD_CONFIGS = {
    ckad: {
      names: ['001','002','003','004','005','006','007','008','009','010','011','014','013'],
      center: { x: 520, y: 120 },
      radius: 90,
      cornerTags: {
        '001': 'ПК-3', '002': 'ПК-3', '003': 'ПК-3',
        '004': 'ПК-1', '005': 'ПК-1', '006': 'ПК-1',
        '007': 'ПК-1', '008': 'ПК-1', '009': 'ПК-1',
        '010': 'ПК-1', '011': 'ПК-1', '013': 'ПК-3-5',
        '014': 'ПК-5'
      },
      kmTags: {
        '001': 13, '002': 50, '003': 83, '004': 108, '005': 134,
        '006': 151, '007': 194, '008': 197, '009': 207, '010': 239,
        '011': 250, '014': 274, '013': 338
      }
    },
    m12: {
      names: ['101','102','103','104','105','106','108','109','110','111','112','113','114','115','116','117','118','119','120'],
      cornerTags: {
        '101': 'Этап 0.1', '102': 'Этап 0.2', '103': 'Этап 0.2',
        '104': 'Этап 1', '105': 'Этап 2', '106': 'Этап 2',
        '108': 'Этап 3', '109': 'Этап 3', '110': 'Этап 4',
        '111': 'Этап 4', '112': 'Этап 5', '113': 'Этап 5',
        '114': 'Этап 6', '115': 'Этап 7', '116': 'Этап 7',
        '117': 'Этап 8', '118': 'Этап 8', '119': 'Этап 8',
        '120': 'Этап 8'
      },
      kmTags: {
        '101': 81, '102': 65, '103': 33, '104': 118, '105': 175,
        '106': 185, '108': 281, '109': 314, '110': 392, '111': 420,
        '112': 485, '113': 591, '114': 635, '115': 722, '116': 764,
        '117': 769, '118': 782, '119': 806, '120': 833
      }
    },
    m1: {
      names: ['M1-obj-46'],
      cornerTags: { 'M1-obj-46': '33-66' },
      kmTags: { 'M1-obj-46': '46' }
    },
    m3: {
      names: ['M3-obj-137', 'M3-obj-169'],
      cornerTags: { 
        'M3-obj-137': '124-173', 
        'M3-obj-169': '173-194' 
      },
      kmTags: { 
        'M3-obj-137': '137', 
        'M3-obj-169': '169' 
      }
    },
    m4: {
      names: ['M4-obj-62', 'M4-obj-71', 'M4-obj-133', 'M4-obj-228', 'M4-obj-322', 
              'M4-obj-339', 'M4-obj-355', 'M4-obj-380', 'M4-obj-401', 'M4-obj-416', 
              'M4-obj-460', 'M4-obj-515', 'M4-obj-545', 'M4-obj-620', 'M4-obj-636', 
              'M4-obj-672', 'M4-obj-803', 'M4-obj-911', 'M4-obj-1046', 'M4-obj-1093', 
              'M4-obj-1184', 'M4-obj-1223', 'M4-obj-46'],
      cornerTags: {
        'M4-obj-62': 'Секция 1', 'M4-obj-71': 'Секция 1', 'M4-obj-133': 'Секция 1',
        'M4-obj-228': 'Секция 2', 'M4-obj-322': 'Секция 2', 'M4-obj-339': 'Секция 2',
        'M4-obj-355': 'Секция 2', 'M4-obj-380': 'Секция 2', 'M4-obj-401': 'Секция 2',
        'M4-obj-416': 'Секция 2', 'M4-obj-460': 'Секция 2', 'M4-obj-515': 'Секция 2',
        'M4-obj-545': 'Секция 2', 'M4-obj-620': 'Секция 2',
        'M4-obj-636': 'Лосево-Павловск', 'M4-obj-672': 'Лосево-Павловск',
        'M4-obj-803': 'Секция 2', 'M4-obj-911': 'Секция 2',
        'M4-obj-1046': 'Обход Аксая', 'M4-obj-1093': 'Секция 4',
        'M4-obj-1184': 'Секция 4', 'M4-obj-1223': 'Секция 4',
        'M4-obj-46': 'ДЗОК'
      },
      kmTags: {
        'M4-obj-62': '62', 'M4-obj-71': '71', 'M4-obj-133': '133', 'M4-obj-228': '228',
        'M4-obj-322': '322', 'M4-obj-339': '339', 'M4-obj-355': '355', 'M4-obj-380': '380',
        'M4-obj-401': '401', 'M4-obj-416': '416', 'M4-obj-460': '460', 'M4-obj-515': '515',
        'M4-obj-545': '545', 'M4-obj-620': '620', 'M4-obj-636': '636', 'M4-obj-672': '672',
        'M4-obj-803': '803', 'M4-obj-911': '911', 'M4-obj-1046': '1046', 'M4-obj-1093': '1093',
        'M4-obj-1184': '1184', 'M4-obj-1223': '1223', 'M4-obj-46': '46'
      }
    },
    a289: {
      names: ['301', '302', '303'],
      cornerTags: {},
      kmTags: { '301': '24', '302': '83/82', '303': '103' }
    },
    m11: {
      names: ['ПВП-48', 'ПВП-50', 'ПВП-59', 'ПВП-67', 'ПВП-89', 'ПВП-97', 'ПВП-124',
              'ПВП-147', 'ПВП-159', 'ПВП-177', 'ПВП-208', 'ПВП-214', 'ПВП-258',
              'ПВП-330', 'ПВП-385', 'ПВП-348', 'ПВП-402', 'ПВП-444', 'ПВП-524',
              'ПВП-545', 'ПВП-647', 'ПВП-668', 'ПВП-679'],
      cornerTags: {},
      kmTags: {}
    }
  };

  // Функции-фабрики для создания дорог
  function createCircularRoad(config) {
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

  function createTransportJunction(from, to, id, name = '') {
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

  function createLinearRoad(startNode, nodeIds, stepX = 55, stepY = 10, startX = 0, startY = 0) {
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

  function createRoadFromConfig(config, startNode, stepX = 55, stepY = 6, startX = 0, startY = 0) {
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

  function createRoadBranch(config, startNode, offsetX = 60, offsetY = 10, stepX = 55, stepY = 6) {
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

  // Инициализация ЦКАД
  createCircularRoad(ROAD_CONFIGS.ckad);

  // Добавление транспортных развязок
  const transportJunctions = [
    { from: '011', to: '010', id: 'ТР-011-010' },
    { from: '010', to: '009', id: 'ТР-010-009' },
    { from: '009', to: '008', id: 'ТР-009-008' },
    { from: '008', to: '007', id: 'ТР-008-007' },
    { from: '007', to: '006', id: 'ТР-007-006' },
    { from: '006', to: '005', id: 'ТР-006-005' },
    { from: '005', to: '004', id: 'ТР-005-004' },
    { from: '004', to: '003', id: 'ТР-004-003' },
    { from: '003', to: '002', id: 'ТР-003-002' },
    { from: '002', to: '001', id: 'ТР-002-001' },
    { from: '001', to: '013', id: 'ТР-001-013' },
    { from: '013', to: '014', id: 'ТР-013-014' }
  ];

  transportJunctions.forEach(({ from, to, id }) => {
    createTransportJunction(from, to, id);
  });

  // ТР М-12 между 004 и ТР-005-004
  const trM12 = createTransportJunction('004', 'ТР-005-004', 'ТР-004-Носовихинское-м12');
  if (trM12) {
    // Узлы М-12
    const near = { id: '102', x: trM12.x + 40, y: trM12.y + 30 };
    const far = { id: '103', x: trM12.x + 80, y: trM12.y + 60 };
    systems.push(near, far);
    jumps.push(['ТР-004-Носовихинское-м12', '102']);
    jumps.push(['102', '103']);

    const m12Ids = ['101','104','105','106','108','109','110','111','112','113','114','115','116','117','118','119','120'];
    createLinearRoad('103', m12Ids, 55, 10, trM12.x + 120, trM12.y + 90);
    
    // Добавляем теги для М-12
    Object.assign(dynamicCornerTags, ROAD_CONFIGS.m12.cornerTags);
    Object.assign(dynamicKmTags, ROAD_CONFIGS.m12.kmTags);
  }

  // ТР Звенигородское между 014 и ТР-013-014
  createTransportJunction('014', 'ТР-013-014', 'ТР-014-Звенигородское');

  // ТР между 014 и 011
  const s014 = systems.find(s => s.id === '014');
  const s011 = systems.find(s => s.id === '011');
  if (s014 && s011) {
    const tr1Id = 'ТР-011-014-Киевское';
    const tr2Id = 'ТР-011-014-Минское';
    const t1 = 1/3;
    const t2 = 2/3;
    
    const x1 = Math.round(s011.x + (s014.x - s011.x) * t1);
    const y1 = Math.round(s011.y + (s014.y - s011.y) * t1);
    const x2 = Math.round(s011.x + (s014.x - s011.x) * t2);
    const y2 = Math.round(s011.y + (s014.y - s011.y) * t2);
    
    systems.push({ id: tr1Id, x: x1, y: y1 });
    systems.push({ id: tr2Id, x: x2, y: y2 });

    // Удаляем прямое ребро
    for (let i = jumps.length - 1; i >= 0; i--) {
      const [a, b] = jumps[i];
      if ((a === '011' && b === '014') || (a === '014' && b === '011')) {
        jumps.splice(i, 1);
      }
    }
    jumps.push(['011', tr1Id]);
    jumps.push([tr1Id, tr2Id]);
    jumps.push([tr2Id, '014']);
  }

  // Добавим объект автодороги М-1 "Беларусь" и соединим с ТР М-1
  const trM1 = systems.find(s => s.id === 'ТР-011-014-Минское');
  if (trM1) {
    const node = { id: 'M1-obj-46', name: 'ПВП 46', x: trM1.x - 40, y: trM1.y + 40 };
    systems.push(node);
    jumps.push([trM1.id, node.id]);
    // Теги добавляются через createRoadFromConfig
  }

  // Добавим два объекта автодороги М-3 "Украина"
  const trM3 = systems.find(s => s.id === 'ТР-011-014-Киевское');
  if (trM3) {
    const n137 = { id: 'M3-obj-137', name: 'ПВП 137', x: trM3.x - 40, y: trM3.y + 20 };
    const n169 = { id: 'M3-obj-169', name: 'ПВП 169', x: n137.x - 55, y: n137.y + 6 };
    systems.push(n137, n169);
    jumps.push([trM3.id, n137.id]);
    jumps.push([n137.id, n169.id]);
    // Теги добавляются через createRoadFromConfig
  }

  // Добавим объект автодороги М-4 "Дон" ПВП 62
  const trM4 = systems.find(s => s.id === 'ТР-009-008');
  if (trM4) {
    const node = { id: 'M4-obj-62', name: 'ПВП 62', x: trM4.x + 40, y: trM4.y + 20 };
    systems.push(node);
    jumps.push([trM4.id, node.id]);
    // Теги добавляются через createRoadFromConfig
  }

  // Добавим и соединим с ПВП 62 дополнительные ПВП М-4 "Дон"
  const hubM4 = systems.find(s => s.id === 'M4-obj-62');
  if (hubM4) {
    // Создаем ветку М-4 с использованием конфигурации
    createRoadBranch(ROAD_CONFIGS.m4, hubM4.id);
  }

  // Добавляем теги для дорог М-1, М-3 и М-4
  createRoadFromConfig(ROAD_CONFIGS.m1);
  createRoadFromConfig(ROAD_CONFIGS.m3);

  // Добавим узлы автодороги А-289 после ПВП 46 (М-4 "Дон")
  const lastM4 = systems.find(s => s.id === 'M4-obj-46');
  if (lastM4) {
    const n301 = { id: '301', name: '301', x: lastM4.x + 55, y: lastM4.y + 6 };
    const n302 = { id: '302', name: '302', x: n301.x + 55, y: n301.y + 6 };
    const n303 = { id: '303', name: '303', x: n302.x + 55, y: n302.y + 6 };
    const dzok = { id: 'ТР-ДЗОК', x: lastM4.x + 28, y: lastM4.y + 12 };
    systems.push(n301, n302, n303, dzok);
    
    jumps.push([lastM4.id, dzok.id]);
    jumps.push([dzok.id, '301']);
    jumps.push(['301', '302']);
    jumps.push(['302', '303']);
    
    // Теги добавляются через createRoadFromConfig
    dynamicCornerTags['M4-obj-46'] = 'ДЗОК';
  }

  // Добавляем теги для дороги А-289
  createRoadFromConfig(ROAD_CONFIGS.a289);

  // Вставим ТР на А-289
  const n301 = systems.find(s => s.id === '301');
  const n302 = systems.find(s => s.id === '302');
  const n303 = systems.find(s => s.id === '303');
  if (n301 && n302 && n303) {
    // 1) Между 301 и 302 — Славянск-на-Кубани
    const trSlavId = 'ТР-А289-Славянск-на-Кубани';
    const slav = { id: trSlavId, x: Math.round((n301.x + n302.x) / 2), y: Math.round((n301.y + n302.y) / 2) };
    systems.push(slav);
    for (let i = jumps.length - 1; i >= 0; i--) {
      const [a, b] = jumps[i];
      if ((a === '301' && b === '302') || (a === '302' && b === '301')) jumps.splice(i, 1);
    }
    jumps.push(['301', trSlavId]);
    jumps.push([trSlavId, '302']);

    // 2) Между 303 и 302 — Вариниковская
    const trVarId = 'ТР-А289-Вариниковская';
    const vari = { id: trVarId, x: Math.round((n303.x + n302.x) / 2), y: Math.round((n303.y + n302.y) / 2) };
    systems.push(vari);
    for (let i = jumps.length - 1; i >= 0; i--) {
      const [a, b] = jumps[i];
      if ((a === '302' && b === '303') || (a === '303' && b === '302')) jumps.splice(i, 1);
    }
    jumps.push(['302', trVarId]);
    jumps.push([trVarId, '303']);

    // 3) После 303 — Темрюк
    const trTemId = 'ТР-А289-Темрюк';
    const tem = { id: trTemId, x: n303.x + 55, y: n303.y + 6 };
    systems.push(tem);
    jumps.push(['303', trTemId]);
  }

  // Добавляем теги для дороги А-289
  createRoadFromConfig(ROAD_CONFIGS.a289);

  // Добавим ТР "Наро-фоминское шоссе" после ПВП 46
  const pvp = systems.find(s => s.id === 'M1-obj-46');
  if (pvp) {
    const trId = 'ТР-М1-Наро-фоминское';
    const node = { id: trId, x: pvp.x - 40, y: pvp.y + 40 };
    systems.push(node);
    jumps.push([pvp.id, trId]);
  }

  // Добавим узел между ТР "М-11 "Нева" и 001
  const trM11 = systems.find(s => s.id === 'ТР-001-013');
  const node001 = systems.find(s => s.id === '001');
  if (trM11 && node001) {
    const newNodeId = '001-М11-уз';
    const x = Math.round((trM11.x + node001.x) / 2);
    const y = Math.round((trM11.y + node001.y) / 2);
    const newNode = { id: newNodeId, name: 'ПВП ТР-18', x, y };
    systems.push(newNode);
    
    // Удаляем прямое ребро между ТР и 001
    for (let i = jumps.length - 1; i >= 0; i--) {
      const [a, b] = jumps[i];
      if ((a === 'ТР-001-013' && b === '001') || (a === '001' && b === 'ТР-001-013')) {
        jumps.splice(i, 1);
      }
    }
    
    jumps.push(['ТР-001-013', newNodeId]);
    jumps.push([newNodeId, '001']);
    
    dynamicCornerTags[newNodeId] = 'ПК-3';
    dynamicKmTags[newNodeId] = '1';
  }

  // Добавим узлы дороги М-11
  const hubM11 = systems.find(s => s.id === '001-М11-уз');
  if (hubM11) {
    // Создаем ветку М-11 с использованием конфигурации
    createRoadBranch(ROAD_CONFIGS.m11, hubM11.id);
  }

  // Сохранение позиций узлов между перезагрузками
  const STORAGE_KEY = 'eve-region-map:positions:v1';
  
  // Функции валидации
  function validateNodeData(id, name, x, y) {
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
    
    if (name && name.length > 100) {
      errors.push('Название узла слишком длинное (максимум 100 символов)');
    }
    
    return errors;
  }
  
  function validateEdgeData(fromId, toId) {
    const errors = [];
    
    if (!fromId || !toId) {
      errors.push('Необходимо указать оба узла для создания связи');
    }
    
    if (fromId === toId) {
      errors.push('Нельзя соединить узел с самим собой');
    }
    
    if (!idToSystem.has(fromId)) {
      errors.push(`Узел с ID "${fromId}" не найден`);
    }
    
    if (!idToSystem.has(toId)) {
      errors.push(`Узел с ID "${toId}" не найден`);
    }
    
    return errors;
  }
  
  // Функции для отображения сообщений
  function showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // Добавляем стили для сообщений
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 400px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
    `;
    
    // Устанавливаем цвет в зависимости от типа
    switch (type) {
      case 'success':
        messageEl.style.background = '#10b981';
        break;
      case 'error':
        messageEl.style.background = '#ef4444';
        break;
      case 'warning':
        messageEl.style.background = '#f59e0b';
        break;
      default:
        messageEl.style.background = '#3b82f6';
    }
    
    document.body.appendChild(messageEl);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (messageEl.parentNode) {
            messageEl.remove();
          }
        }, 300);
      }
    }, 5000);
    
    // Добавляем CSS анимации если их нет
    if (!document.getElementById('message-animations')) {
      const style = document.createElement('style');
      style.id = 'message-animations';
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
  
  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }
  
  function showErrorMessage(message) {
    showMessage(message, 'error');
  }
  
  function showWarningMessage(message) {
    showMessage(message, 'warning');
  }
  
  function loadSavedPositions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Ошибка при загрузке сохраненных позиций:', error);
      showWarningMessage('Не удалось загрузить сохраненные позиции узлов');
      return {};
    }
  }
  
  function applySavedPositions() {
    try {
      const saved = loadSavedPositions();
      let appliedCount = 0;
      
      for (const s of systems) {
        const p = saved[s.id];
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          s.x = p.x;
          s.y = p.y;
          appliedCount++;
        }
      }
      
      if (appliedCount > 0) {
        console.log(`Применено ${appliedCount} сохраненных позиций`);
      }
    } catch (error) {
      console.error('Ошибка при применении сохраненных позиций:', error);
      showWarningMessage('Не удалось применить сохраненные позиции');
    }
  }
  
  function savePositions() {
    try {
      const data = {};
      for (const s of systems) {
        data[s.id] = { x: s.x, y: s.y };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('Позиции сохранены в localStorage, количество узлов:', systems.length);
    } catch (error) {
      console.error('Ошибка при сохранении позиций:', error);
      showErrorMessage('Не удалось сохранить позиции узлов');
    }
  }

  // Вьюпорт трансформация
  let scale = 1; // стартовый зум будет подогнан под содержимое
  let translate = { x: 0, y: 0 }; // вычислим позже
  
  // Состояния редактирования
  let editMode = false;
  let nodeCreationMode = false;
  let edgeCreationMode = false;
  let tempEdgeStart = null;
  let tempEdgeElement = null;

  function applyTransform() {
    viewport.setAttribute('transform', `translate(${translate.x}, ${translate.y}) scale(${scale})`);
  }
  applyTransform();
  // Привяжем клики по легенде
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.legend .legend-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const road = btn.getAttribute('data-road');
        console.log('Клик по кнопке дороги:', road);
        
        // Проверяем, что данные загружены перед центрированием
        if (systems.length === 0) {
          console.log('Данные карты не загружены, пытаемся загрузить...');
          if (loadFullMap()) {
            console.log('Данные загружены, теперь центрируем');
            setTimeout(() => focusRoad(road, road === 'ckad' ? 0.93 : undefined), 50);
          } else {
            console.log('Не удалось загрузить данные карты');
            showErrorMessage('Не удалось загрузить данные карты');
          }
        } else {
          console.log('Данные карты уже загружены, центрируем на', road);
          focusRoad(road, road === 'ckad' ? 0.93 : undefined);
        }
      });
    });
    
    // Инициализация режимов редактирования
    initEditModes();
  });
  
  // Инициализация режимов редактирования
  function initEditModes() {
    console.log('Инициализация режимов редактирования...');
    
    // Проверяем, что все элементы найдены
    console.log('Проверка элементов:', {
      addNodeBtn: !!addNodeBtn,
      addEdgeBtn: !!addEdgeBtn,
      deleteBtn: !!deleteBtn,
      nodeCreationPanel: !!nodeCreationPanel,
      createNodeBtn: !!createNodeBtn,
      cancelNodeBtn: !!cancelNodeBtn
    });
    
    // Проверяем, что все элементы действительно существуют в DOM
    if (!addNodeBtn) console.error('addNodeBtn не найден!');
    if (!addEdgeBtn) console.error('addEdgeBtn не найден!');
    if (!deleteBtn) console.error('deleteBtn не найден!');
    if (!nodeCreationPanel) console.error('nodeCreationPanel не найден!');
    if (!createNodeBtn) console.error('createNodeBtn не найден!');
    if (!cancelNodeBtn) console.error('cancelNodeBtn не найден!');
    
    // Проверяем, что все элементы действительно существуют в DOM
    console.log('Проверка элементов в DOM:', {
      addNodeBtn: document.getElementById('addNodeBtn'),
      addEdgeBtn: document.getElementById('addEdgeBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      nodeCreationPanel: document.getElementById('nodeCreationPanel'),
      createNodeBtn: document.getElementById('createNodeBtn'),
      cancelNodeBtn: document.getElementById('cancelNodeBtn')
    });
    
    // Проверяем, что все элементы действительно существуют в DOM
    console.log('Проверка элементов в DOM (повторно):', {
      addNodeBtn: document.getElementById('addNodeBtn'),
      addEdgeBtn: document.getElementById('addEdgeBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      nodeCreationPanel: document.getElementById('nodeCreationPanel'),
      createNodeBtn: document.getElementById('createNodeBtn'),
      cancelNodeBtn: document.getElementById('cancelNodeBtn')
    });
    
    // Проверяем, что все элементы действительно существуют в DOM
    console.log('Проверка элементов в DOM (финально):', {
      addNodeBtn: document.getElementById('addNodeBtn'),
      addEdgeBtn: document.getElementById('addEdgeBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      nodeCreationPanel: document.getElementById('nodeCreationPanel'),
      createNodeBtn: document.getElementById('createNodeBtn'),
      cancelNodeBtn: document.getElementById('cancelNodeBtn')
    });
    
    // Проверяем, что все элементы действительно существуют в DOM
    console.log('Проверка элементов в DOM (окончательно):', {
      addNodeBtn: document.getElementById('addNodeBtn'),
      addEdgeBtn: document.getElementById('addEdgeBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      nodeCreationPanel: document.getElementById('nodeCreationPanel'),
      createNodeBtn: document.getElementById('createNodeBtn'),
      cancelNodeBtn: document.getElementById('cancelNodeBtn')
    });
    
    // Кнопка добавления узла
    addNodeBtn.addEventListener('click', () => {
      console.log('Клик по кнопке добавления узла');
      if (nodeCreationMode) {
        exitNodeCreationMode();
      } else {
        enterNodeCreationMode();
      }
    });
    console.log('Обработчик addNodeBtn добавлен');
    
    // Кнопка добавления линии
    addEdgeBtn.addEventListener('click', () => {
      console.log('Клик по кнопке добавления линии');
      if (edgeCreationMode) {
        exitEdgeCreationMode();
      } else {
        enterEdgeCreationMode();
      }
    });
    console.log('Обработчик addEdgeBtn добавлен');
    
    // Кнопка удаления
    deleteBtn.addEventListener('click', deleteSelectedNode);
    console.log('Обработчик deleteBtn добавлен');
    
    // Обработчики панели создания узла
    createNodeBtn.addEventListener('click', createNewNode);
    console.log('Обработчик createNodeBtn добавлен');
    cancelNodeBtn.addEventListener('click', exitNodeCreationMode);
    console.log('Обработчик cancelNodeBtn добавлен');
    
    // Обработчик клика по карте для создания узлов
    svg.addEventListener('click', handleMapClick);
    console.log('Обработчик клика по карте добавлен');
    
    // Обработчик движения мыши для временной линии
    svg.addEventListener('mousemove', handleMapMouseMove);
    console.log('Обработчик движения мыши добавлен');
    
    // Обработчики для экспорта и импорта
    if (exportBtn) {
      exportBtn.addEventListener('click', exportMap);
      console.log('Обработчик экспорта добавлен');
    }
    
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        if (!importInput) {
          importInput = createImportInput();
        }
        importInput.click();
      });
      console.log('Обработчик импорта добавлен');
    }
    
    // Обработчик для статистики
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
      statsBtn.addEventListener('click', showMapStatistics);
      console.log('Обработчик статистики добавлен');
    }
    
    // Обработчики для отмены/повтора
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', undo);
      console.log('Обработчик отмены добавлен');
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', redo);
      console.log('Обработчик повтора добавлен');
    }
    
    console.log('Режимы редактирования инициализированы');
  }
  
  // Вход в режим создания узла
  function enterNodeCreationMode() {
    console.log('Вход в режим создания узла');
    if (edgeCreationMode) exitEdgeCreationMode();
    
    nodeCreationMode = true;
    addNodeBtn.textContent = 'Отмена';
    addNodeBtn.classList.add('primary');
    svg.classList.add('node-creating');
    svg.style.cursor = 'crosshair';
    
    // Проверяем состояние
    console.log('Режим создания узла активирован');
    console.log('nodeCreationMode =', nodeCreationMode);
    console.log('addNodeBtn.textContent =', addNodeBtn.textContent);
    console.log('svg.classList.contains("node-creating") =', svg.classList.contains('node-creating'));
    console.log('svg.style.cursor =', svg.style.cursor);
    
    // Проверяем, что обработчик клика работает
    console.log('Проверяем обработчик клика по карте...');
    console.log('svg.onclick =', svg.onclick);
    console.log('svg event listeners count =', svg.getEventListeners ? svg.getEventListeners('click')?.length : 'недоступно');
  }
  
  // Выход из режима создания узла
  function exitNodeCreationMode() {
    nodeCreationMode = false;
    addNodeBtn.textContent = '+ Узел';
    addNodeBtn.classList.remove('primary');
    svg.classList.remove('node-creating');
    svg.style.cursor = 'default';
    hideNodeCreationPanel();
  }
  
  // Вход в режим создания линии
  function enterEdgeCreationMode() {
    if (nodeCreationMode) exitNodeCreationMode();
    
    edgeCreationMode = true;
    addEdgeBtn.textContent = 'Отмена';
    addEdgeBtn.classList.add('primary');
    svg.classList.add('edge-creating');
    svg.style.cursor = 'crosshair';
    
    console.log('Режим создания линии активирован');
    console.log('Кликните на первый узел для начала линии, затем на второй для завершения');
  }
  
  // Выход из режима создания линии
  function exitEdgeCreationMode() {
    edgeCreationMode = false;
    addEdgeBtn.textContent = '+ Линия';
    addEdgeBtn.classList.remove('primary');
    svg.classList.remove('edge-creating');
    svg.style.cursor = 'default';
    
    if (tempEdgeElement) {
      tempEdgeElement.remove();
      tempEdgeElement = null;
    }
    tempEdgeStart = null;
  }
  
  // Обработка клика по карте
  function handleMapClick(e) {
    console.log('Клик по карте:', e.target, 'nodeCreationMode:', nodeCreationMode, 'edgeCreationMode:', edgeCreationMode);
    console.log('e.target.id =', e.target.id);
    console.log('e.target.tagName =', e.target.tagName);
    
    // Проверяем, что клик произошел по фону карты (сетке) или по самому SVG
    // И НЕ по узлу или его элементам
    const isValidTarget = (e.target === svg || e.target.id?.startsWith('bg')) && 
                         !e.target.closest('.node');
    console.log('isValidTarget =', isValidTarget);
    
    if (!isValidTarget) {
      console.log('Клик не по фону карты или по узлу, игнорируем');
      return;
    }
    
    if (nodeCreationMode) {
      console.log('Создание узла в позиции:', e.clientX, e.clientY);
      const worldPos = screenToWorld(e.clientX, e.clientY);
      console.log('Мировые координаты:', worldPos);
      showNodeCreationPanel(e.clientX, e.clientY, worldPos);
    } else if (edgeCreationMode) {
      console.log('Режим создания линии активен, но клик по фону карты не создает линию');
      console.log('Для создания линии кликните на существующие узлы');
    } else {
      console.log('Режим создания узла не активен');
    }
  }
  
  // Обработка движения мыши для временной линии
  function handleMapMouseMove(e) {
    if (!edgeCreationMode || !tempEdgeStart) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    updateTempEdge(worldPos);
  }
  
  // Обновить временную линию
  function updateTempEdge(endPos) {
    if (!tempEdgeElement) {
      tempEdgeElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tempEdgeElement.setAttribute('class', 'temp-edge');
      edgesLayer.appendChild(tempEdgeElement);
    }
    
    tempEdgeElement.setAttribute('x1', tempEdgeStart.x);
    tempEdgeElement.setAttribute('y1', tempEdgeStart.y);
    tempEdgeElement.setAttribute('x2', endPos.x);
    tempEdgeElement.setAttribute('y2', endPos.y);
  }
  
  // Обработка клика по узлу в режиме создания линии
  function handleNodeClickForEdge(nodeId) {
    try {
      console.log('handleNodeClickForEdge вызван для узла:', nodeId, 'edgeCreationMode:', edgeCreationMode);
      
      if (!edgeCreationMode) {
        console.log('Режим создания линии не активен');
        return;
      }
      
      if (!tempEdgeStart) {
        // Первый клик - начало линии
        console.log('Первый клик - начало линии');
        const node = idToSystem.get(nodeId);
        if (node) {
          tempEdgeStart = { x: node.x, y: node.y, id: nodeId };
          console.log('Начальная точка линии установлена:', tempEdgeStart);
          // Подсвечиваем узел
          highlightNode(nodeId);
        }
      } else {
        // Второй клик - конец линии
        console.log('Второй клик - завершение линии');
        
        // Валидация данных
        const validationErrors = validateEdgeData(tempEdgeStart.id, nodeId);
        if (validationErrors.length > 0) {
          showErrorMessage(validationErrors.join('\n'));
          return;
        }
        
        // Проверяем, что линия не существует
        const edgeExists = jumps.some(([a, b]) => 
          (a === tempEdgeStart.id && b === nodeId) || 
          (a === nodeId && b === tempEdgeStart.id)
        );
        
        if (edgeExists) {
          showWarningMessage('Такая линия уже существует!');
          return;
        }
        
        console.log('Создаем линию между:', tempEdgeStart.id, 'и', nodeId);
        
        // Создаем линию
        jumps.push([tempEdgeStart.id, nodeId]);
        
        // Обновляем adjacency
        if (!adjacency.has(tempEdgeStart.id)) adjacency.set(tempEdgeStart.id, new Set());
        if (!adjacency.has(nodeId)) adjacency.set(nodeId, new Set());
        adjacency.get(tempEdgeStart.id).add(nodeId);
        adjacency.get(nodeId).add(tempEdgeStart.id);
        
        // Перерисовываем карту
        render();
        
        // Обновляем adjacency
        updateAdjacency();
        
        // Сохраняем карту
        autoSaveMap();
        
        // Сбрасываем состояние
        const fromId = tempEdgeStart.id;
        const toId = nodeId;
        tempEdgeStart = null;
        if (tempEdgeElement) {
          tempEdgeElement.remove();
          tempEdgeElement = null;
        }
        
        // Снимаем выделение
        highlightNode('');
        
        showSuccessMessage(`Линия между "${fromId}" и "${toId}" успешно создана`);
        console.log('Линия успешно создана');
      }
    } catch (error) {
      console.error('Ошибка при создании линии:', error);
      showErrorMessage(`Ошибка при создании линии: ${error.message}`);
    }
  }
  
  // Показать панель создания узла
function showNodeCreationPanel(clientX, clientY, worldPos) {
  console.log('showNodeCreationPanel вызван:', { clientX, clientY, worldPos });
  console.log('nodeCreationPanel элемент:', nodeCreationPanel);
  
  // Проверяем, что панель существует в DOM
  const panelInDOM = document.getElementById('nodeCreationPanel');
  console.log('Панель в DOM:', panelInDOM);
  
  if (!nodeCreationPanel) {
    console.error('nodeCreationPanel не найден!');
    return;
  }
  
  if (!panelInDOM) {
    console.error('Панель не найдена в DOM!');
    return;
  }
  
      // Показываем панель
    nodeCreationPanel.style.display = 'block';
    nodeCreationPanel.style.left = `${clientX + 10}px`;
    nodeCreationPanel.style.top = `${clientY + 10}px`;
    
    // Сохраняем позицию для создания узла
    nodeCreationPanel.dataset.worldX = worldPos.x;
    nodeCreationPanel.dataset.worldY = worldPos.y;
    
    console.log('Панель показана, стили:', {
      display: nodeCreationPanel.style.display,
      left: nodeCreationPanel.style.left,
      top: nodeCreationPanel.style.top
    });
    
    // Проверяем, что панель действительно видна
    const computedStyle = window.getComputedStyle(nodeCreationPanel);
    console.log('Вычисленные стили панели:', {
      display: computedStyle.display,
      left: computedStyle.left,
      top: computedStyle.top,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex
    });
  
      // Фокус на первое поле
    const firstInput = document.getElementById('newNodeId');
    if (firstInput) {
      firstInput.focus();
      console.log('Фокус установлен на поле ID');
      
      // Проверяем, что фокус действительно установлен
      setTimeout(() => {
        const activeElement = document.activeElement;
        console.log('Активный элемент после фокуса:', activeElement);
        console.log('Активный элемент === firstInput:', activeElement === firstInput);
      }, 100);
    } else {
      console.error('Поле newNodeId не найдено!');
    }
}
  
  // Скрыть панель создания узла
  function hideNodeCreationPanel() {
    nodeCreationPanel.style.display = 'none';
  }
  
  // Создать новый узел
  function createNewNode() {
    try {
      const id = document.getElementById('newNodeId').value.trim();
      const name = document.getElementById('newNodeName').value.trim();
      const roadType = document.getElementById('newNodeType').value;
      const cornerTag = document.getElementById('newNodeCornerTag').value.trim();
      const km = document.getElementById('newNodeKm').value.trim();

      // Получаем координаты из панели создания узла
      const worldX = parseFloat(nodeCreationPanel.dataset.worldX) || 0;
      const worldY = parseFloat(nodeCreationPanel.dataset.worldY) || 0;

      // Валидация данных
      const validationErrors = validateNodeData(id, name, worldX, worldY);
      if (validationErrors.length > 0) {
        showErrorMessage(`Ошибки валидации:\n${validationErrors.join('\n')}`);
        return;
      }

      // Проверка уникальности ID
      if (idToSystem.has(id)) {
        showErrorMessage(`Узел с ID "${id}" уже существует`);
        return;
      }

      // Сохраняем состояние для отмены
      saveState(`Создание узла ${id}`);

      // Создаем новый узел
      const newNode = {
        id,
        name: name || id,
        x: worldX,
        y: worldY
      };
      
      systems.push(newNode);
      idToSystem.set(id, newNode);
      
      // Добавляем в adjacency
      adjacency.set(id, new Set());
      
      // Добавляем теги если указаны
      if (cornerTag) dynamicCornerTags[id] = cornerTag;
      if (km) dynamicKmTags[id] = km;
      
      // Обновляем datalist для поиска
      const option = document.createElement('option');
      option.value = id;
      systemsDatalist.appendChild(option);
      
      // Выходим из режима создания
      exitNodeCreationMode();
      
      // Перерисовываем карту
      renderImmediate();
      
      // Обновляем adjacency
      updateAdjacency();
      
      // Сохраняем карту
      autoSaveMap();
      
      showSuccessMessage(`Узел "${id}" успешно создан`);
      
    } catch (error) {
      console.error('Ошибка при создании узла:', error);
      showErrorMessage(`Ошибка при создании узла: ${error.message}`);
    }
  }
  
  // Очистить форму создания узла
  function clearNodeCreationForm() {
    document.getElementById('newNodeId').value = '';
    document.getElementById('newNodeName').value = '';
    document.getElementById('newNodeType').value = 'road-ckad';
    document.getElementById('newNodeCornerTag').value = '';
    document.getElementById('newNodeKm').value = '';
    
    // Очищаем координаты
    if (nodeCreationPanel) {
      delete nodeCreationPanel.dataset.worldX;
      delete nodeCreationPanel.dataset.worldY;
    }
  }
  
  // Удалить выбранный узел
  function deleteSelectedNode() {
    try {
      if (!selectedNodeId) {
        showWarningMessage('Сначала выберите узел для удаления');
        return;
      }

      if (!confirm(`Вы уверены, что хотите удалить узел "${selectedNodeId}"?`)) {
        return;
      }

      // Сохраняем состояние для отмены
      saveState(`Удаление узла ${selectedNodeId}`);

      // Удаляем все связи с этим узлом
      const edgesToRemove = [];
      for (let i = jumps.length - 1; i >= 0; i--) {
        const [a, b] = jumps[i];
        if (a === selectedNodeId || b === selectedNodeId) {
          edgesToRemove.push(jumps.splice(i, 1)[0]);
        }
      }

      // Удаляем узел из систем
      const nodeIndex = systems.findIndex(s => s.id === selectedNodeId);
      if (nodeIndex !== -1) {
        systems.splice(nodeIndex, 1);
      }

      // Удаляем из Map
      idToSystem.delete(selectedNodeId);

      // Удаляем теги
      delete dynamicCornerTags[selectedNodeId];
      delete dynamicKmTags[selectedNodeId];

      // Обновляем adjacency
      updateAdjacency();

      // Сбрасываем выбор
      const deletedNodeId = selectedNodeId;
      selectedNodeId = null;

      // Перерисовываем карту
      renderImmediate();

      // Автоматически сохраняем карту
      autoSaveMap();
      
      showSuccessMessage(`Узел "${deletedNodeId}" успешно удален вместе с ${edgesToRemove.length} связями`);

    } catch (error) {
      console.error('Ошибка при удалении узла:', error);
      showErrorMessage(`Ошибка при удалении узла: ${error.message}`);
    }
  }

  // Заполнение datalist
  function updateSystemsDatalist() {
    systemsDatalist.innerHTML = '';
    systems.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      systemsDatalist.appendChild(opt);
    });
  }
  
  // Инициализация datalist
  updateSystemsDatalist();

  // Кэш SVG-элементов для узлов и подписей
  const idToNodeGroup = new Map();
  const idToLabel = new Map();
  // Tooltip
  const tooltipEl = (function createTooltip() {
    const el = document.createElement('div');
    el.className = 'tooltip';
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  })();

  // Оптимизация рендеринга с debouncing
  let renderTimeout = null;
  let renderScheduled = false;
  
  // Рендер с debouncing
  function render() {
    if (renderScheduled) return;
    
    renderScheduled = true;
    renderTimeout = setTimeout(() => {
      performRender();
      renderScheduled = false;
    }, 16); // ~60 FPS
  }
  
  // Немедленный рендер без debouncing
  function renderImmediate() {
    if (renderTimeout) {
      clearTimeout(renderTimeout);
      renderTimeout = null;
    }
    renderScheduled = false;
    performRender();
  }
  
  // Основная функция рендеринга
  function performRender() {
    console.log('Функция performRender вызвана');
    // Очистка слоев
    edgesLayer.innerHTML = '';
    nodesLayer.innerHTML = '';
    labelsLayer.innerHTML = '';
    idToNodeGroup.clear();
    idToLabel.clear();
    
    // Рендер рёбер
    renderEdges();
    
    // Рендер узлов и подписей
    renderNodesAndLabels();
  }
  
  // Рендер рёбер
  function renderEdges() {
    for (const [a, b] of jumps) {
      const sa = idToSystem.get(a);
      const sb = idToSystem.get(b);
      if (!sa || !sb) continue;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sa.x);
      line.setAttribute('y1', sa.y);
      line.setAttribute('x2', sb.x);
      line.setAttribute('y2', sb.y);
      
      const isFree = isFreeEdge(a, b);
      line.setAttribute('class', `edge${isFree ? ' free' : ''}`);
      
      if (isFree) {
        line.addEventListener('mouseenter', (e) => showTooltipAt('Бесплатный участок', e.clientX, e.clientY));
        line.addEventListener('mousemove', (e) => showTooltipAt('Бесплатный участок', e.clientX, e.clientY));
        line.addEventListener('mouseleave', hideTooltip);
      }
      
      line.dataset.key = `${a}__${b}`;
      edgesLayer.appendChild(line);
    }
  }
  
  // Рендер узлов и подписей
  function renderNodesAndLabels() {
    console.log('renderNodesAndLabels: начало рендера, количество узлов:', systems.length);
    for (const s of systems) {
      const group = createNodeGroup(s);
      const label = createNodeLabel(s);
      
      // Добавляем в слои
      nodesLayer.appendChild(group);
      labelsLayer.appendChild(label);
      
      // Сохраняем ссылки и подключаем обработчики
      idToNodeGroup.set(s.id, group);
      idToLabel.set(s.id, label);
      console.log('Подключаем обработчики для узла:', s.id);
      attachDragHandlers(group, s);
      attachHoverHandlers(group, s.id);
    }
    console.log('renderNodesAndLabels: рендер завершен');
  }
  
  // Создание группы узла
  function createNodeGroup(system) {
    const { WIDTH, HEIGHT } = NODE_DIMENSIONS;
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node ${roadClassBySystemId(system.id)} ${isTransportJunction(system.id) ? 'tr' : ''}`);
    group.setAttribute('data-id', system.id);
    group.setAttribute('transform', `translate(${system.x}, ${system.y})`);
    
    // Создаем форму узла (круг для ТР, прямоугольник для остальных)
    if (isTransportJunction(system.id)) {
      const r = Math.min(WIDTH, HEIGHT) / 2;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', r);
      group.appendChild(circle);
    } else {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -WIDTH/2);
      rect.setAttribute('y', -HEIGHT/2);
      rect.setAttribute('width', WIDTH);
      rect.setAttribute('height', HEIGHT);
      group.appendChild(rect);
    }
    
    // Добавляем угловые теги
    addCornerTags(group, system.id);
    
    return group;
  }
  
  // Добавление угловых тегов к узлу
  function addCornerTags(group, systemId) {
    const { WIDTH, HEIGHT } = NODE_DIMENSIONS;
    
    // Верхний левый угол
    const tag = dynamicCornerTags[systemId] || nodeCornerTag(systemId);
    if (tag) {
      const corner = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      corner.setAttribute('class', 'corner-label');
      corner.setAttribute('x', -WIDTH/2 + 3);
      corner.setAttribute('y', -HEIGHT/2 + 7);
      corner.textContent = tag;
      group.appendChild(corner);
    }
    
    // Нижний левый угол (километры)
    const km = dynamicKmTags[systemId] || nodeKmTag(systemId);
    if (km) {
      const kmText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      kmText.setAttribute('class', 'corner-label');
      kmText.setAttribute('x', -WIDTH/2 + 3);
      kmText.setAttribute('y', HEIGHT/2 - 3);
      kmText.textContent = `км ${km}`;
      group.appendChild(kmText);
    }
  }
  
  // Создание подписи узла
  function createNodeLabel(system) {
    const { WIDTH, PADDING_X } = NODE_DIMENSIONS;
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'label');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('x', system.x);
    label.setAttribute('y', system.y + 4);
    
    const displayText = isTransportJunction(system.id) ? 'ТР' : (system.name || system.id);
    label.textContent = displayText;
    
    // Подгон текстового размера под ширину
    fitLabelToWidth(label, WIDTH - PADDING_X * 2);
    
    return label;
  }

  // Создаем карты после всех IIFE, но ПЕРЕД render()
  idToSystem = new Map(systems.map(s => [s.id, s]));
  adjacency = buildAdjacency(jumps);
  
  // Функция для обновления adjacency
  function updateAdjacency() {
    console.log('Обновление adjacency, текущие jumps:', jumps);
    adjacency = buildAdjacency(jumps);
    console.log('Adjacency обновлен, количество узлов:', adjacency.size);
  }

  // Применим сохранённые позиции и отрисуем
  applySavedPositions();
  render();

  // Панорамирование мышью
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    panStart = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    svg.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translate.x = e.clientX - panStart.x;
    translate.y = e.clientY - panStart.y;
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    isPanning = false;
    svg.style.cursor = 'default';
  });

  // Зум колесом
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { clientX, clientY, deltaY } = e;
    const zoomFactor = Math.pow(1.0015, -deltaY);
    zoomAtPoint(clientX, clientY, zoomFactor);
  }, { passive: false });

  function zoomAtPoint(clientX, clientY, factor) {
    const ptBefore = screenToWorld(clientX, clientY);
    scale = clamp(scale * factor, ZOOM_LIMITS.MIN, ZOOM_LIMITS.MAX);
    const ptAfter = screenToWorld(clientX, clientY);
    translate.x += (ptAfter.x - ptBefore.x) * scale;
    translate.y += (ptAfter.y - ptBefore.y) * scale;
    applyTransform();
  }

  zoomInBtn.addEventListener('click', () => zoomAtPoint(window.innerWidth/2, window.innerHeight/2, 1.2));
  zoomOutBtn.addEventListener('click', () => zoomAtPoint(window.innerWidth/2, window.innerHeight/2, 1/1.2));
  resetViewBtn.addEventListener('click', () => {
    fitViewToContent();
  });

  function screenToWorld(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    // учтём текущую трансформацию viewport
    return { x: (p.x - translate.x) / scale, y: (p.y - translate.y) / scale };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  // Функция маппинга: по ID системы присваиваем дорогу
  function roadClassBySystemId(systemId) {
    if (typeof systemId !== 'string') return 'unknown';
    
    // Константы для групп дорог
    const M12_IDS = new Set(['101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120']);
    const A289_IDS = new Set(['301','302','303']);
    const CKAD_IDS = new Set(['001','002','003','004','005','006','007','008','009','010','011','013','014']);
    
    // Проверка по группам (сначала, чтобы избежать конфликтов с префиксами)
    if (CKAD_IDS.has(systemId)) {
      console.log(`roadClassBySystemId(${systemId}) = road-ckad (из CKAD_IDS)`);
      return 'road-ckad';
    }
    if (M12_IDS.has(systemId)) return 'road-m12';
    if (A289_IDS.has(systemId)) return 'road-a289';
    
    // Проверка по префиксам
    if (systemId.startsWith('M1-')) return 'road-m1';
    if (systemId.startsWith('M4-')) return 'road-m4';
    if (systemId.startsWith('M3-')) return 'road-m3';
    if (systemId.startsWith('ПВП-')) return 'road-m11';
    
    // Специальные случаи
    if (systemId === '001-М11-уз') return 'road-m11';
    
    // Для новых узлов возвращаем базовый класс
    return 'road-ckad';
  }

  // Названия малых уголовых тегов для некоторых узлов
  function nodeCornerTag(id) {
    // Объединенная карта тегов для всех узлов
    const cornerTags = {
      // ЦКАД: теги ПК
      '001': 'ПК-3', '002': 'ПК-3', '003': 'ПК-3',
      '004': 'ПК-1', '005': 'ПК-1', '006': 'ПК-1',
      '007': 'ПК-1', '008': 'ПК-1', '009': 'ПК-1',
      '010': 'ПК-1', '011': 'ПК-1', '013': 'ПК-3-5',
      '014': 'ПК-5',
      
      // М-12: этапы строительства
      '101': 'Этап 0.1', '102': 'Этап 0.2', '103': 'Этап 0.2',
      '104': 'Этап 1', '105': 'Этап 2', '106': 'Этап 2',
      '108': 'Этап 3', '109': 'Этап 3', '110': 'Этап 4',
      '111': 'Этап 4', '112': 'Этап 5', '113': 'Этап 5',
      '114': 'Этап 6', '115': 'Этап 7', '116': 'Этап 7',
      '117': 'Этап 8', '118': 'Этап 8', '119': 'Этап 8',
      '120': 'Этап 8'
    };
    
    return cornerTags[id] || '';
  }

  // Значения километров для лев. нижнего угла
  function nodeKmTag(id) {
    const map = {
      '001': 13,
      '002': 50,
      '003': 83,
      '004': 108,
      '005': 134,
      '006': 151,
      '007': 194,
      '008': 197,
      '009': 207,
      '010': 239,
      '011': 250,
      '014': 274,
      '013': 338,
      // М-12
      '101': 81,
      '102': 65,
      '103': 33,
      '104': 118,
      '105': 175,
      '106': 185,
      '108': 281,
      '109': 314,
      '110': 392,
      '111': 420,
      '112': 485,
      '113': 591,
      '114': 635,
      '115': 722,
      '116': 764,
      '117': 769,
      '118': 782,
      '119': 806,
      '120': 833
    };
    return map[id] != null ? map[id] : '';
  }

  // Узел является транспортной развязкой (ТР)? — временно по префиксу/списку
  function isTransportJunction(id) {
    // Можете указать конкретные идентификаторы (например, 'ТР-1'),
    // пока возвращаем false для всех, пока вы не дадите список.
    return id.startsWith('ТР-');
  }

  // Текст тултипа для узла, если требуется
  function nodeTooltipText(id) {
    if (id === 'ТР-011-010') return 'Калужское шоссе';
    if (id === 'ТР-010-009') return 'Симферопольское шоссе';
    if (id === 'ТР-009-008') return 'М-4 "Дон"';
    if (id === 'ТР-008-007') return 'Домодедово';
    if (id === 'ТР-007-006') return 'М-5 "Урал"';
    if (id === 'ТР-006-005') return 'Егорьевское шоссе';
    if (id === 'ТР-005-004') return 'Носовихинское шоссе';
    if (id === 'ТР-004-003') return 'М-7 "Горьковское шоссе"';
    if (id === 'ТР-004-Носовихинское-м12') return 'М-12 "Восток"';
    if (id === 'ТР-003-002') return 'М-8 "Холмогоры"';
    if (id === 'ТР-002-001') return 'Никольские горки';
    if (id === 'ТР-001-013') return 'М-11 "Нева"';
    if (id === 'ТР-013-014') return 'Ленинградское шоссе';
    if (id === 'ТР-011-014-Киевское') return 'М-3 "Украина"';
    if (id === 'ТР-011-014-Минское') return 'М-1 "Беларусь"';
    if (id === 'ТР-014-Звенигородское') return 'Звенигородское шоссе';
    if (id === 'ТР-М1-Наро-фоминское') return 'Наро-Фоминское шоссе';
    if (id === 'ТР-ДЗОК') return 'Марьянская';
    if (id === 'ТР-А289-Славянск-на-Кубани') return 'Славянск-на-Кубани';
    if (id === 'ТР-А289-Вариниковская') return 'Вариниковская';
    if (id === 'ТР-А289-Темрюк') return 'Темрюк';
    return '';
  }
  function buildAdjacency(edges) {
    const map = new Map();
    for (const [a, b] of edges) {
      if (!map.has(a)) map.set(a, new Set());
      if (!map.has(b)) map.set(b, new Set());
      map.get(a).add(b);
      map.get(b).add(a);
    }
    return map;
  }



  // Подгон вьюпорта под содержимое
  function fitViewToContent() {
    if (!systems.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of systems) {
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    const padding = 40; // world units
    const contentW = Math.max(10, (maxX - minX) + padding * 2);
    const contentH = Math.max(10, (maxY - minY) + padding * 2);
    const viewW = Math.max(300, window.innerWidth);
    const viewH = Math.max(300, window.innerHeight - 160);
    const sx = viewW / contentW;
    const sy = viewH / contentH;
    scale = clamp(Math.min(sx, sy), 0.6, 3.5);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    translate.x = viewW / 2 - centerX * scale;
    translate.y = viewH / 2 - centerY * scale;
    applyTransform();
  }

  // Центрирование по клику в легенде
  if (legendButtons && legendButtons.length) {
    legendButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const road = btn.getAttribute('data-road');
        focusRoad(road);
      });
    });
  }

  function focusRoad(roadKey, desiredScale) {
    console.log('focusRoad вызван для:', roadKey);
    console.log('Всего систем в карте:', systems.length);
    
    // Проверяем, что у нас есть данные для работы
    if (systems.length === 0) {
      console.log('Массив systems пуст, центрирование отменено');
      return;
    }
    
    console.log('Примеры систем:', systems.slice(0, 5).map(s => ({ id: s.id, x: s.x, y: s.y })));
    
    // Для ЦКАД используем специальную логику поиска
    let baseIds;
    if (roadKey === 'ckad') {
      // Ищем системы ЦКАД по ID (001-014, 013)
      baseIds = systems
        .filter(s => s.id.match(/^00[1-9]|01[0-4]|013$/))
        .map(s => s.id);
      console.log('Найдены системы ЦКАД по ID:', baseIds);
    } else {
      baseIds = systems
        .filter(s => matchRoadKey(s.id, roadKey))
        .map(s => s.id);
    }
    
    console.log('Базовые ID для', roadKey, ':', baseIds);
    
    const idsSet = new Set(baseIds);
    // Для ЦКАД расширим выборку: добавим прилегающие ТР
    if (roadKey === 'ckad') {
      for (const s of systems) {
        if (!String(s.id).startsWith('ТР-')) continue;
        const neigh = adjacency.get(s.id) || new Set();
        for (const nb of neigh) {
          if (idsSet.has(nb)) { idsSet.add(s.id); break; }
        }
      }
    }
    const ids = Array.from(idsSet);
    console.log('Все ID для', roadKey, ':', ids);
    
    if (!ids.length) {
      console.log('Нет ID для', roadKey);
      console.log('Проверяем все системы:', systems.map(s => ({ id: s.id, class: roadClassBySystemId(s.id) })));
      return;
    }
    
    // вычислим bbox выбранных
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of ids) {
      const s = systems.find(x => x.id === id);
      if (!s) continue;
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    
    console.log('BBox для', roadKey, ':', { minX, maxX, minY, maxY });
    
    const padding = roadKey === 'ckad' ? 150 : 40;
    const contentW = Math.max(10, (maxX - minX) + padding * 2);
    const contentH = Math.max(10, (maxY - minY) + padding * 2);
    const viewW = Math.max(300, window.innerWidth);
    const viewH = Math.max(300, window.innerHeight - 160);
    const sx = viewW / contentW;
    const sy = viewH / contentH;
    const autoScale = Math.min(sx, sy);
    
    // Для ЦКАД используем фиксированный масштаб или вычисленный
    if (roadKey === 'ckad' && desiredScale != null) {
      scale = clamp(desiredScale, 0.6, 3.5);
    } else {
      scale = clamp(autoScale, 0.6, 3.5);
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    translate.x = viewW / 2 - centerX * scale;
    translate.y = viewH / 2 - centerY * scale;
    
    console.log('Центрирование на:', { centerX, centerY, scale, translate, viewW, viewH, contentW, contentH });
    applyTransform();
  }

  function matchRoadKey(id, key) {
    if (!id || !key) return false;
    
    // Специальные случаи для А-289 (транспортные развязки)
    if (key === 'a289') {
      const cls = roadClassBySystemId(id);
      const specialTrIds = ['ТР-А289-Славянск-на-Кубани', 'ТР-А289-Вариниковская', 'ТР-А289-Темрюк'];
      return cls === 'road-a289' || specialTrIds.includes(id);
    }
    
    // Для остальных дорог используем стандартную проверку
    const cls = roadClassBySystemId(id);
    const roadMapping = {
      'ckad': 'road-ckad',
      'm12': 'road-m12',
      'm1': 'road-m1',
      'm4': 'road-m4',
      'm11': 'road-m11',
      'm3': 'road-m3'
    };
    
    const result = roadMapping[key] === cls;
    if (key === 'ckad') {
      console.log(`matchRoadKey(${id}, ${key}) = ${result} (класс: ${cls})`);
    }
    return result;
  }

  // Поиск и маршрут
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    focusSystem(q);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      focusSystem(searchInput.value.trim());
    }
  });

  routeBtn.addEventListener('click', () => {
    const from = fromInput.value.trim();
    const to = toInput.value.trim();
    const path = shortestPath(from, to);
    drawRoute(path);
  });

  function focusSystem(id) {
    if (!idToSystem.has(id)) return;
    highlightNode(id);
    const s = idToSystem.get(id);
    scale = clamp(3, ZOOM_LIMITS.MIN, ZOOM_LIMITS.MAX);
    translate.x = window.innerWidth / 2 - s.x * scale;
    translate.y = (window.innerHeight - 160) / 2 - s.y * scale;
    applyTransform();
  }

  function highlightNode(id) {
    nodesLayer.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
    if (id) {
      const node = nodesLayer.querySelector(`[data-id="${cssEscape(id)}"]`);
      if (node) node.classList.add('selected');
    }
  }

  function cssEscape(str) {
    return str.replace(/"/g, '\\"');
  }

  // Кратчайший маршрут (BFS)
  function shortestPath(from, to) {
    if (!idToSystem.has(from) || !idToSystem.has(to)) return null;
    if (from === to) return [from];
    const queue = [from];
    const visited = new Set([from]);
    const parent = new Map();
    while (queue.length) {
      const cur = queue.shift();
      const neigh = adjacency.get(cur) || new Set();
      for (const nb of neigh) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        parent.set(nb, cur);
        if (nb === to) {
          const path = [to];
          let p = to;
          while (parent.has(p)) { p = parent.get(p); path.push(p); }
          path.reverse();
          return path;
        }
        queue.push(nb);
      }
    }
    return null;
  }

  function drawRoute(path) {
    // Очистим прошлую подсветку маршрута
    edgesLayer.querySelectorAll('.edge.route').forEach(el => el.classList.remove('route'));
    routeInfo.textContent = '';
    if (!path || path.length === 0) {
      routeInfo.textContent = 'Маршрут не найден';
      return;
    }
    // Пройти по парам и подсветить линии
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      paintEdge(a, b, true);
    }
    routeInfo.textContent = `Длина: ${path.length - 1} прыжков`;
    // Фокус на середину пути
    const mid = idToSystem.get(path[Math.floor(path.length / 2)]);
    if (mid) {
      scale = clamp(3, ZOOM_LIMITS.MIN, ZOOM_LIMITS.MAX);
      translate.x = window.innerWidth / 2 - mid.x * scale;
      translate.y = (window.innerHeight - 160) / 2 - mid.y * scale;
      applyTransform();
    }
  }

  function paintEdge(a, b, active) {
    // Поиск линии по ключу (учитываем обе стороны ребра)
    const key1 = `${a}__${b}`;
    const key2 = `${b}__${a}`;
    
    const line = edgesLayer.querySelector(`line[data-key="${key1}"]`) || 
                 edgesLayer.querySelector(`line[data-key="${key2}"]`);
    
    if (line) {
      if (active) {
        line.classList.add('route');
      } else {
        line.classList.remove('route');
      }
    }
  }

  function isFreeEdge(a, b) {
    // Бесплатные участки дорог
    const freeEdges = [
      ['ТР-014-Звенигородское', 'ТР-013-014'], // между Звенигородским и Ленинградским
      ['ТР-011-014-Минское', 'ТР-011-014-Киевское'], // между Минским и Киевским
      ['ТР-011-014-Киевское', '011'] // от Киевского до 011
    ];
    
    // Проверяем обе стороны ребра (a->b и b->a)
    return freeEdges.some(([from, to]) => 
      (a === from && b === to) || (a === to && b === from)
    );
  }

  function showTooltipAt(text, clientX, clientY) {
    tooltipEl.textContent = text;
    tooltipEl.style.display = 'block';
    positionTooltip(clientX, clientY);
  }
  function hideTooltip() {
    tooltipEl.style.display = 'none';
  }

  // Подгоняет font-size текста под доступную ширину
  function fitLabelToWidth(textEl, maxWidth) {
    let fontSize = 10; // базовый размер из CSS
    textEl.setAttribute('font-size', String(fontSize));
    let length = textEl.getComputedTextLength();
    if (length <= maxWidth) return;
    const MIN_SIZE = 6;
    while (length > maxWidth && fontSize > MIN_SIZE) {
      fontSize -= 0.5;
      textEl.setAttribute('font-size', String(fontSize));
      length = textEl.getComputedTextLength();
    }
  }

  // Привязка к сетке
  function snapToGrid(value, step = GRID_STEP) {
    return Math.round(value / step) * step;
  }
  
  // Функции для мониторинга производительности
  let performanceMetrics = {
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  };
  
  function updatePerformanceMetrics(renderTime) {
    performanceMetrics.renderCount++;
    performanceMetrics.lastRenderTime = renderTime;
    performanceMetrics.totalRenderTime += renderTime;
    performanceMetrics.averageRenderTime = performanceMetrics.totalRenderTime / performanceMetrics.renderCount;
    
    // Логируем каждые 10 рендеров
    if (performanceMetrics.renderCount % 10 === 0) {
      console.log('Метрики производительности:', {
        renderCount: performanceMetrics.renderCount,
        lastRenderTime: `${renderTime.toFixed(2)}ms`,
        averageRenderTime: `${performanceMetrics.averageRenderTime.toFixed(2)}ms`
      });
    }
  }
  
  // Оптимизированная функция для обновления только измененных элементов
  function updateNodePosition(nodeId, newX, newY) {
    const nodeGroup = idToNodeGroup.get(nodeId);
    const label = idToLabel.get(nodeId);
    
    if (nodeGroup) {
      nodeGroup.setAttribute('transform', `translate(${newX}, ${newY})`);
    }
    
    if (label) {
      label.setAttribute('x', newX);
      label.setAttribute('y', newY + 4);
    }
    
    // Обновляем только связанные рёбра
    updateEdgesForNode(nodeId);
  }
  
  // Функция для проверки видимости узла в viewport
  function isNodeVisible(node, viewportBounds) {
    const nodeBounds = {
      x: node.x - NODE_DIMENSIONS.WIDTH / 2,
      y: node.y - NODE_DIMENSIONS.HEIGHT / 2,
      width: NODE_DIMENSIONS.WIDTH,
      height: NODE_DIMENSIONS.HEIGHT
    };
    
    return !(nodeBounds.x > viewportBounds.right || 
             nodeBounds.x + nodeBounds.width < viewportBounds.left ||
             nodeBounds.y > viewportBounds.bottom || 
             nodeBounds.y + nodeBounds.height < viewportBounds.top);
  }

  // Перетаскивание узлов
  function attachDragHandlers(group, system) {
    console.log('attachDragHandlers вызван для узла:', system.id);
    updateNodeCursor(group);
    
    // Обработчик клика для выделения и создания линий
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Клик по узлу:', system.id, 'edgeCreationMode:', edgeCreationMode, 'nodeCreationMode:', nodeCreationMode);
      
      if (edgeCreationMode) {
        console.log('Вызываем handleNodeClickForEdge для узла:', system.id);
        handleNodeClickForEdge(system.id);
        return;
      }
      
      // Обычное выделение узла
      if (selectedNodeId === system.id) {
        selectedNodeId = null;
        selectedNode = null;
        selectedNodes.clear();
        highlightNode('');
      } else {
        selectedNodeId = system.id;
        selectedNode = system.id;
        selectedNodes.clear();
        selectedNodes.add(system.id);
        highlightNode(system.id);
      }
      
      // Обновляем визуальное выделение
      updateNodeSelection();
    });
    
    group.addEventListener('mousedown', (e) => {
      if (!dragToggle.checked) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      
      const startWorld = screenToWorld(e.clientX, e.clientY);
      const offset = { dx: startWorld.x - system.x, dy: startWorld.y - system.y };

      function onMove(ev) {
        const curWorld = screenToWorld(ev.clientX, ev.clientY);
        let nx = curWorld.x - offset.dx;
        let ny = curWorld.y - offset.dy;
        
        nx = snapToGrid(nx);
        ny = snapToGrid(ny);
        
        // Обновляем позицию в данных
        system.x = nx;
        system.y = ny;
        
        // Используем оптимизированное обновление
        updateNodePosition(system.id, nx, ny);
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        savePositions();
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  function attachHoverHandlers(group, nodeId) {
    group.addEventListener('mouseenter', (e) => {
      const text = nodeTooltipText(nodeId);
      if (!text) return;
      tooltipEl.textContent = text;
      tooltipEl.style.display = 'block';
      positionTooltip(e.clientX, e.clientY);
    });
    
    group.addEventListener('mousemove', (e) => {
      if (tooltipEl.style.display === 'block') {
        positionTooltip(e.clientX, e.clientY);
      }
    });
    
    group.addEventListener('mouseleave', () => {
      tooltipEl.style.display = 'none';
    });
    
    group.addEventListener('mousedown', () => {
      tooltipEl.style.display = 'none';
    });
  }

  function positionTooltip(clientX, clientY) {
    const OFFSET = 10;
    tooltipEl.style.left = `${clientX + OFFSET}px`;
    tooltipEl.style.top = `${clientY + OFFSET}px`;
  }

  function updateNodeCursor(group) {
    group.style.cursor = dragToggle && dragToggle.checked ? 'move' : 'default';
  }

  if (dragToggle) {
    dragToggle.addEventListener('change', () => {
      nodesLayer.querySelectorAll('.node').forEach(g => updateNodeCursor(g));
    });
  }

  function updateEdgesForNode(systemId) {
    // Поиск только тех линий, которые связаны с данным узлом
    const selector = `line[data-key*="${systemId}"]`;
    const lines = edgesLayer.querySelectorAll(selector);
    
    lines.forEach(line => {
      const key = line.dataset.key;
      if (!key) return;
      
      const [a, b] = key.split('__');
      if (a === systemId || b === systemId) {
        const sa = idToSystem.get(a);
        const sb = idToSystem.get(b);
        if (!sa || !sb) return;
        
        line.setAttribute('x1', sa.x);
        line.setAttribute('y1', sa.y);
        line.setAttribute('x2', sb.x);
        line.setAttribute('y2', sb.y);
      }
    });
  }

  // Функции для экспорта и импорта карт
  function exportMap() {
    try {
      const mapData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        systems: systems,
        jumps: jumps,
        dynamicCornerTags: dynamicCornerTags,
        dynamicKmTags: dynamicKmTags
      };
      
      const dataStr = JSON.stringify(mapData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `map-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(link.href);
      showSuccessMessage('Карта успешно экспортирована');
      
    } catch (error) {
      console.error('Ошибка при экспорте карты:', error);
      showErrorMessage(`Ошибка при экспорте карты: ${error.message}`);
    }
  }
  
  function importMap(file) {
    try {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const mapData = JSON.parse(e.target.result);
          
          // Валидация структуры импортируемых данных
          if (!mapData.systems || !Array.isArray(mapData.systems)) {
            throw new Error('Неверный формат данных: отсутствует массив систем');
          }
          
          if (!mapData.jumps || !Array.isArray(mapData.jumps)) {
            throw new Error('Неверный формат данных: отсутствует массив связей');
          }
          
          // Очищаем текущие данные
          systems.length = 0;
          jumps.length = 0;
          Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
          Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
          
          // Импортируем новые данные
          systems.push(...mapData.systems);
          jumps.push(...mapData.jumps);
          
          if (mapData.dynamicCornerTags) {
            Object.assign(dynamicCornerTags, mapData.dynamicCornerTags);
          }
          
          if (mapData.dynamicKmTags) {
            Object.assign(dynamicKmTags, mapData.dynamicKmTags);
          }
          
          // Обновляем структуры данных
          idToSystem = new Map(systems.map(s => [s.id, s]));
          adjacency = buildAdjacency(jumps);
          
          // Перерисовываем карту
          renderImmediate();
          
          // Обновляем datalist для поиска
          updateSystemsDatalist();
          
          // Сохраняем позиции
          savePositions();
          
          showSuccessMessage(`Карта успешно импортирована (${systems.length} узлов, ${jumps.length} связей)`);
          
        } catch (parseError) {
          console.error('Ошибка при парсинге импортируемых данных:', parseError);
          showErrorMessage(`Ошибка при импорте карты: ${parseError.message}`);
        }
      };
      
      reader.onerror = function() {
        showErrorMessage('Ошибка при чтении файла');
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      console.error('Ошибка при импорте карты:', error);
      showErrorMessage(`Ошибка при импорте карты: ${error.message}`);
    }
  }
  
  // Функция для создания скрытого input для импорта
  function createImportInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importMap(e.target.files[0]);
      }
    });
    document.body.appendChild(input);
    return input;
  }
  
  // Глобальная переменная для input импорта
  let importInput = null;
  
  function loadSavedPositions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Ошибка при загрузке сохраненных позиций:', error);
      showWarningMessage('Не удалось загрузить сохраненные позиции узлов');
      return {};
    }
  }
  
  function applySavedPositions() {
    try {
      const saved = loadSavedPositions();
      let appliedCount = 0;
      
      for (const s of systems) {
        const p = saved[s.id];
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          s.x = p.x;
          s.y = p.y;
          appliedCount++;
        }
      }
      
      if (appliedCount > 0) {
        console.log(`Применено ${appliedCount} сохраненных позиций`);
      }
    } catch (error) {
      console.error('Ошибка при применении сохраненных позиций:', error);
      showWarningMessage('Не удалось применить сохраненные позиции');
    }
  }
  
  function savePositions() {
    try {
      const data = {};
      for (const s of systems) {
        data[s.id] = { x: s.x, y: s.y };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('Позиции сохранены в localStorage, количество узлов:', systems.length);
    } catch (error) {
      console.error('Ошибка при сохранении позиций:', error);
      showErrorMessage('Не удалось сохранить позиции узлов');
    }
  }

  // Функция для отображения статистики карты
  function showMapStatistics() {
    try {
      const stats = {
        totalNodes: systems.length,
        totalEdges: jumps.length,
        roadTypes: {},
        transportJunctions: 0,
        regularNodes: 0
      };
      
      // Подсчитываем типы дорог
      systems.forEach(system => {
        const roadClass = roadClassBySystemId(system.id);
        stats.roadTypes[roadClass] = (stats.roadTypes[roadClass] || 0) + 1;
        
        if (isTransportJunction(system.id)) {
          stats.transportJunctions++;
        } else {
          stats.regularNodes++;
        }
      });
      
      // Форматируем статистику
      const statsText = `
Статистика карты:
• Всего узлов: ${stats.totalNodes}
• Всего связей: ${stats.totalEdges}
• Транспортных развязок: ${stats.transportJunctions}
• Обычных узлов: ${stats.regularNodes}

Типы дорог:
${Object.entries(stats.roadTypes).map(([type, count]) => `• ${type}: ${count}`).join('\n')}
      `.trim();
      
      // Показываем в модальном окне или alert
      if (window.confirm('Показать статистику карты?')) {
        alert(statsText);
      }
      
    } catch (error) {
      console.error('Ошибка при подсчете статистики:', error);
      showErrorMessage(`Ошибка при подсчете статистики: ${error.message}`);
    }
  }
  
  function loadSavedPositions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('Ошибка при загрузке сохраненных позиций:', error);
      showWarningMessage('Не удалось загрузить сохраненные позиции узлов');
      return {};
    }
  }

  // Система отмены/повтора (Undo/Redo)
  const undoStack = [];
  const redoStack = [];
  const MAX_UNDO_STEPS = 50;

  function saveState(action) {
    const state = {
      action,
      timestamp: Date.now(),
      systems: JSON.parse(JSON.stringify(systems)),
      jumps: JSON.parse(JSON.stringify(jumps)),
      dynamicCornerTags: JSON.parse(JSON.stringify(dynamicCornerTags)),
      dynamicKmTags: JSON.parse(JSON.stringify(dynamicKmTags))
    };
    
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STEPS) {
      undoStack.shift();
    }
    
    // Очищаем redo при новом действии
    redoStack.length = 0;
    
    console.log(`Состояние сохранено: ${action}`);
  }

  function undo() {
    if (undoStack.length === 0) {
      showWarningMessage('Нет действий для отмены');
      return;
    }
    
    const currentState = {
      action: 'Текущее состояние',
      timestamp: Date.now(),
      systems: JSON.parse(JSON.stringify(systems)),
      jumps: JSON.parse(JSON.stringify(jumps)),
      dynamicCornerTags: JSON.parse(JSON.stringify(dynamicCornerTags)),
      dynamicKmTags: JSON.parse(JSON.stringify(dynamicKmTags))
    };
    
    redoStack.push(currentState);
    
    const previousState = undoStack.pop();
    systems.length = 0;
    jumps.length = 0;
    Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
    Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
    
    systems.push(...previousState.systems);
    jumps.push(...previousState.jumps);
    Object.assign(dynamicCornerTags, previousState.dynamicCornerTags);
    Object.assign(dynamicKmTags, previousState.dynamicKmTags);
    
    showSuccessMessage(`Отменено: ${previousState.action}`);
    renderImmediate();
  }

  function redo() {
    if (redoStack.length === 0) {
      showWarningMessage('Нет действий для повтора');
      return;
    }
    
    const currentState = {
      action: 'Текущее состояние',
      timestamp: Date.now(),
      systems: JSON.parse(JSON.stringify(systems)),
      jumps: JSON.parse(JSON.stringify(jumps)),
      dynamicCornerTags: JSON.parse(JSON.stringify(dynamicCornerTags)),
      dynamicKmTags: JSON.parse(JSON.stringify(dynamicKmTags))
    };
    
    undoStack.push(currentState);
    
    const nextState = redoStack.pop();
    systems.length = 0;
    jumps.length = 0;
    Object.keys(dynamicCornerTags).forEach(key => delete dynamicCornerTags[key]);
    Object.keys(dynamicKmTags).forEach(key => delete dynamicKmTags[key]);
    
    systems.push(...nextState.systems);
    jumps.push(...nextState.jumps);
    Object.assign(dynamicCornerTags, nextState.dynamicCornerTags);
    Object.assign(dynamicKmTags, nextState.dynamicKmTags);
    
    showSuccessMessage(`Повторено: ${nextState.action}`);
    renderImmediate();
  }

  // Глобальные горячие клавиши для отмены/повтора
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Z' && e.shiftKey) {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  });

  // Функции групповых операций с узлами
  function selectAllNodes() {
    try {
      selectedNodes.clear();
      systems.forEach(system => selectedNodes.add(system.id));
      
      // Обновляем визуальное выделение
      updateNodeSelection();
      
      showSuccessMessage(`Выбрано ${selectedNodes.size} узлов`);
    } catch (error) {
      console.error('Ошибка при выборе всех узлов:', error);
      showErrorMessage(`Ошибка при выборе всех узлов: ${error.message}`);
    }
  }

  function deselectAllNodes() {
    try {
      selectedNodes.clear();
      
      // Обновляем визуальное выделение
      updateNodeSelection();
      
      showSuccessMessage('Выбор снят со всех узлов');
    } catch (error) {
      console.error('Ошибка при снятии выбора со всех узлов:', error);
      showErrorMessage(`Ошибка при снятии выбора со всех узлов: ${error.message}`);
    }
  }

  function deleteSelectedNodes() {
    try {
      if (selectedNodes.size === 0) {
        showWarningMessage('Нет выбранных узлов для удаления');
        return;
      }

      if (!confirm(`Вы уверены, что хотите удалить ${selectedNodes.size} выбранных узлов?`)) {
        return;
      }

      // Сохраняем состояние для отмены
      saveState(`Удаление ${selectedNodes.size} узлов`);

      const nodesToDelete = Array.from(selectedNodes);
      let deletedCount = 0;
      let edgesRemoved = 0;

      // Удаляем узлы и их связи
      nodesToDelete.forEach(nodeId => {
        // Удаляем связи
        for (let i = jumps.length - 1; i >= 0; i--) {
          const [a, b] = jumps[i];
          if (a === nodeId || b === nodeId) {
            jumps.splice(i, 1);
            edgesRemoved++;
          }
        }

        // Удаляем узел
        const nodeIndex = systems.findIndex(s => s.id === nodeId);
        if (nodeIndex !== -1) {
          systems.splice(nodeIndex, 1);
          deletedCount++;
        }

        // Удаляем из Map
        idToSystem.delete(nodeId);
        delete dynamicCornerTags[nodeId];
        delete dynamicKmTags[nodeId];
      });

      // Очищаем выбор
      selectedNodes.clear();

      // Обновляем adjacency
      updateAdjacency();

      // Перерисовываем карту
      renderImmediate();

      // Автоматически сохраняем карту
      autoSaveMap();
      
      showSuccessMessage(`Удалено ${deletedCount} узлов и ${edgesRemoved} связей`);

    } catch (error) {
      console.error('Ошибка при удалении выбранных узлов:', error);
      showErrorMessage(`Ошибка при удалении выбранных узлов: ${error.message}`);
    }
  }

  function updateNodeSelection() {
    // Обновляем визуальное выделение всех узлов
    systems.forEach(system => {
      const nodeGroup = idToNodeGroup.get(system.id);
      if (nodeGroup) {
        if (selectedNodes.has(system.id)) {
          nodeGroup.classList.add('selected');
        } else {
          nodeGroup.classList.remove('selected');
        }
      }
    });
  }

  function toggleNodeSelection(nodeId) {
    if (selectedNodes.has(nodeId)) {
      selectedNodes.delete(nodeId);
    } else {
      selectedNodes.add(nodeId);
    }
    
    // Обновляем визуальное выделение
    updateNodeSelection();
  }

  function attachClickHandlers(group, nodeId) {
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (edgeCreationMode) {
        handleNodeClickForEdge(nodeId);
        return;
      }
      
      if (nodeCreationMode) {
        return;
      }
      
      // Множественный выбор с Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        toggleNodeSelection(nodeId);
        return;
      }
      
      // Обычный выбор (один узел)
      selectedNodeId = nodeId;
      selectedNode = nodeId; // Для совместимости со старой системой
      selectedNodes.clear();
      selectedNodes.add(nodeId);
      
      // Обновляем визуальное выделение
      updateNodeSelection();
      
      console.log('Выбран узел:', nodeId);
    });
  }

  // Новая система сохранения и загрузки всей структуры карты
  const MAP_STORAGE_KEY = 'eve-region-map:full-map:v1';

  function saveFullMap() {
    try {
      const mapData = {
        systems: systems,
        jumps: jumps,
        dynamicCornerTags: dynamicCornerTags,
        dynamicKmTags: dynamicKmTags,
        timestamp: Date.now(),
        version: '2.1.0'
      };
      
      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(mapData));
      console.log('Полная карта сохранена в localStorage');
      showSuccessMessage('Карта сохранена');
    } catch (error) {
      console.error('Ошибка при сохранении карты:', error);
      showErrorMessage('Не удалось сохранить карту');
    }
  }

  function loadFullMap() {
    try {
      const raw = localStorage.getItem(MAP_STORAGE_KEY);
      if (!raw) {
        console.log('Сохраненная карта не найдена, используем стандартную инициализацию');
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
      
      // Обновляем Map и adjacency
      idToSystem.clear();
      adjacency.clear();
      systems.forEach(system => {
        idToSystem.set(system.id, system);
        adjacency.set(system.id, new Set());
      });
      
      // Восстанавливаем adjacency
      jumps.forEach(([a, b]) => {
        if (adjacency.has(a)) adjacency.get(a).add(b);
        if (adjacency.has(b)) adjacency.get(b).add(a);
      });
      
      console.log(`Загружена сохраненная карта: ${systems.length} узлов, ${jumps.length} связей`);
      showSuccessMessage(`Карта загружена: ${systems.length} узлов, ${jumps.length} связей`);
      return true;
      
    } catch (error) {
      console.error('Ошибка при загрузке карты:', error);
      showErrorMessage('Не удалось загрузить карту');
      return false;
    }
  }

  // Автоматическое сохранение при изменениях
  function autoSaveMap() {
    // Сохраняем позиции (для совместимости)
    savePositions();
    // Сохраняем полную карту
    saveFullMap();
  }

  // Загружаем сохраненную карту в конце инициализации
  // Сначала пытаемся загрузить полную карту, если не получилось - применяем только позиции
  if (!loadFullMap()) {
    console.log('Полная карта не загружена, используем стандартную инициализацию');
  } else {
    console.log('Полная карта успешно загружена');
  }
  
  // Центрируем карту на ЦКАД после загрузки данных
  if (systems.length > 0) {
    console.log('Центрируем карту на ЦКАД после загрузки данных');
    console.log('Всего систем:', systems.length);
    console.log('Примеры систем ЦКАД:', systems.filter(s => s.id.match(/^00[1-9]|01[0-4]|013$/)).slice(0, 5));
    
    setTimeout(() => {
      focusRoad('ckad', 0.93);
    }, 100);
  } else {
    console.log('Системы не найдены, центрирование отменено');
  }

})();


