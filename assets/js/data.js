/* =====================================================================
 * 智选云 AI 电商在线售货系统 (AI-ECP) —— 本地模拟数据层
 * ---------------------------------------------------------------------
 * 数据来源：《需求分析报告》3.6 自定义商品品类 JSON 规范 / 4-8 核心数据模型图
 * 说明：全部数据为静态模拟，不依赖任何后端接口；品类结构严格遵循规范 v1.0，
 *       因此前台的筛选维度、详情页规格、动态表单均由「属性 Schema」驱动。
 * ===================================================================== */
(function (NS) {
  'use strict';

  /* ---------------------------------------------------------------
   * 1. 品类定义 JSON（schemaVersion 1.0）
   *    这是本系统最具特色的能力：品类树与属性 Schema 由 JSON 声明，
   *    页面不再硬编码类目，而是读取 Schema 动态渲染（FR-07 ~ FR-10）。
   * --------------------------------------------------------------- */
  const CATEGORY_JSON = {
    schemaVersion: '1.0',
    category: {
      code: 'HOME_APPLIANCE',
      name: '家用电器',
      sort: 10,
      icon: '🔌',
      attributes: [
        { code: 'brand', name: '品牌', dataType: 'string', required: true, filterable: true, searchable: true },
        { code: 'energyLevel', name: '能效等级', dataType: 'enum', options: ['一级', '二级', '三级'], required: true, filterable: true },
        { code: 'warrantyYears', name: '整机保修年限', dataType: 'integer', unit: '年', range: [1, 10], required: false, filterable: true }
      ],
      children: [
        {
          code: 'HOME_APPLIANCE_KITCHEN',
          name: '厨房电器',
          sort: 20,
          icon: '🍳',
          attributes: [
            { code: 'capacity', name: '容量', dataType: 'decimal', unit: 'L', range: [0.5, 60], required: false, filterable: true }
          ],
          children: [
            {
              code: 'HOME_APPLIANCE_KITCHEN_RICE_COOKER',
              name: '电饭煲',
              sort: 21,
              icon: '🍚',
              attributes: [
                { code: 'innerPot', name: '内胆材质', dataType: 'enum', options: ['铝合金', '不锈钢', '陶瓷', '铸铁'], required: true, filterable: true },
                { code: 'keepWarmHours', name: '保温时长', dataType: 'integer', unit: '小时', range: [0, 48], required: false, filterable: true }
              ]
            },
            {
              code: 'HOME_APPLIANCE_KITCHEN_MICROWAVE',
              name: '微波炉',
              sort: 22,
              icon: '🍱',
              attributes: [
                { code: 'power', name: '额定功率', dataType: 'integer', unit: 'W', range: [600, 2500], required: false, filterable: true },
                { code: 'heatingMode', name: '加热方式', dataType: 'enum', options: ['微波', '光波', '微蒸烤一体'], required: true, filterable: true }
              ]
            }
          ]
        },
        {
          code: 'HOME_APPLIANCE_CLEANING',
          name: '清洁电器',
          sort: 30,
          icon: '🧹',
          attributes: [
            { code: 'suctionPower', name: '吸力', dataType: 'integer', unit: 'Pa', range: [1000, 40000], required: false, filterable: true }
          ],
          children: [
            {
              code: 'HOME_APPLIANCE_CLEANING_ROBOT',
              name: '扫地机器人',
              sort: 31,
              icon: '🤖',
              attributes: [
                { code: 'navigation', name: '导航方式', dataType: 'enum', options: ['激光导航', '视觉导航', '陀螺仪'], required: true, filterable: true },
                { code: 'selfEmpty', name: '自动集尘', dataType: 'boolean', required: false, filterable: true },
                { code: 'batteryLife', name: '续航', dataType: 'integer', unit: '分钟', range: [60, 300], required: false, filterable: true }
              ]
            },
            {
              code: 'HOME_APPLIANCE_CLEANING_VACUUM',
              name: '吸尘器',
              sort: 32,
              icon: '🧹',
              attributes: [
                { code: 'dustCup', name: '尘杯容量', dataType: 'decimal', unit: 'L', range: [0.2, 3], required: false, filterable: true },
                { code: 'cordless', name: '无线手持', dataType: 'boolean', required: false, filterable: true }
              ]
            }
          ]
        },
        {
          code: 'HOME_APPLIANCE_LARGE',
          name: '大家电',
          sort: 40,
          icon: '🏠',
          attributes: [],
          children: [
            {
              code: 'HOME_APPLIANCE_LARGE_FRIDGE',
              name: '电冰箱',
              sort: 41,
              icon: '🧊',
              attributes: [
                { code: 'coolingMode', name: '制冷方式', dataType: 'enum', options: ['风冷', '直冷', '混冷'], required: true, filterable: true },
                { code: 'volume', name: '总容积', dataType: 'integer', unit: 'L', range: [100, 800], required: false, filterable: true }
              ]
            },
            {
              code: 'HOME_APPLIANCE_LARGE_AC',
              name: '空调',
              sort: 42,
              icon: '❄️',
              attributes: [
                { code: 'horsepower', name: '匹数', dataType: 'enum', options: ['1 匹', '1.5 匹', '2 匹', '3 匹'], required: true, filterable: true },
                { code: 'inverter', name: '变频', dataType: 'boolean', required: false, filterable: true }
              ]
            }
          ]
        }
      ]
    }
  };

  const DIGITAL_JSON = {
    schemaVersion: '1.0',
    category: {
      code: 'DIGITAL',
      name: '数码电子',
      sort: 20,
      icon: '📱',
      attributes: [
        { code: 'brand', name: '品牌', dataType: 'string', required: true, filterable: true, searchable: true },
        { code: 'warrantyMonths', name: '保修期', dataType: 'integer', unit: '月', range: [6, 36], required: false, filterable: true }
      ],
      children: [
        {
          code: 'DIGITAL_PHONE',
          name: '手机通讯',
          sort: 10,
          icon: '📞',
          attributes: [],
          children: [
            {
              code: 'DIGITAL_PHONE_SMARTPHONE',
              name: '智能手机',
              sort: 11,
              icon: '📱',
              attributes: [
                { code: 'storage', name: '机身存储', dataType: 'enum', options: ['128GB', '256GB', '512GB', '1TB'], required: true, filterable: true },
                { code: 'screenSize', name: '屏幕尺寸', dataType: 'decimal', unit: '英寸', range: [4, 8], required: false, filterable: true },
                { code: 'network', name: '网络制式', dataType: 'enum', options: ['4G', '5G'], required: true, filterable: true }
              ]
            },
            {
              code: 'DIGITAL_PHONE_TABLET',
              name: '平板电脑',
              sort: 12,
              icon: '📓',
              attributes: [
                { code: 'storage', name: '机身存储', dataType: 'enum', options: ['128GB', '256GB', '512GB'], required: true, filterable: true },
                { code: 'screenSize', name: '屏幕尺寸', dataType: 'decimal', unit: '英寸', range: [7, 14], required: false, filterable: true }
              ]
            }
          ]
        },
        {
          code: 'DIGITAL_WEARABLE',
          name: '智能穿戴',
          sort: 20,
          icon: '⌚',
          attributes: [],
          children: [
            {
              code: 'DIGITAL_WEARABLE_SMARTWATCH',
              name: '智能手表',
              sort: 21,
              icon: '⌚',
              attributes: [
                { code: 'dial', name: '表盘形状', dataType: 'enum', options: ['圆形', '方形'], required: true, filterable: true },
                { code: 'waterproof', name: '防水', dataType: 'boolean', required: false, filterable: true },
                { code: 'batteryDays', name: '续航', dataType: 'integer', unit: '天', range: [1, 30], required: false, filterable: true }
              ]
            },
            {
              code: 'DIGITAL_WEARABLE_EARPHONE',
              name: '无线耳机',
              sort: 22,
              icon: '🎧',
              attributes: [
                { code: 'wearing', name: '佩戴方式', dataType: 'enum', options: ['入耳式', '半入耳', '头戴式', '开放式'], required: true, filterable: true },
                { code: 'noiseCancel', name: '主动降噪', dataType: 'boolean', required: false, filterable: true }
              ]
            }
          ]
        }
      ]
    }
  };

  const HOME_LIVING_JSON = {
    schemaVersion: '1.0',
    category: {
      code: 'HOME_LIVING',
      name: '家居生活',
      sort: 30,
      icon: '🛋️',
      attributes: [
        { code: 'brand', name: '品牌', dataType: 'string', required: true, filterable: true, searchable: true },
        { code: 'washable', name: '可水洗', dataType: 'boolean', required: false, filterable: true }
      ],
      children: [
        {
          code: 'HOME_LIVING_BEDDING',
          name: '床品家纺',
          sort: 10,
          icon: '🛏️',
          attributes: [],
          children: [
            {
              code: 'HOME_LIVING_BEDDING_BEDDING_SET',
              name: '床上四件套',
              sort: 11,
              icon: '🛏️',
              attributes: [
                { code: 'threadCount', name: '面料支数', dataType: 'integer', unit: '支', range: [30, 120], required: false, filterable: true },
                { code: 'size', name: '适用床宽', dataType: 'enum', options: ['1.2m', '1.5m', '1.8m', '2.0m'], required: true, filterable: true },
                { code: 'season', name: '适用季节', dataType: 'enum', options: ['四季', '夏凉', '冬季'], required: false, filterable: true }
              ]
            },
            {
              code: 'HOME_LIVING_BEDDING_QUILT',
              name: '被芯',
              sort: 12,
              icon: '🛌',
              attributes: [
                { code: 'fill', name: '填充物', dataType: 'enum', options: ['羽绒', '大豆纤维', '棉花', '蚕丝'], required: true, filterable: true },
                { code: 'weightKg', name: '被子重量', dataType: 'decimal', unit: 'kg', range: [0.5, 6], required: false, filterable: true }
              ]
            }
          ]
        },
        {
          code: 'HOME_LIVING_STORAGE',
          name: '收纳香薰',
          sort: 20,
          icon: '🧺',
          attributes: [],
          children: [
            {
              code: 'HOME_LIVING_STORAGE_STORAGE_BOX',
              name: '收纳整理',
              sort: 21,
              icon: '📦',
              attributes: [
                { code: 'capacityL', name: '容量', dataType: 'decimal', unit: 'L', range: [5, 200], required: false, filterable: true },
                { code: 'foldable', name: '可折叠', dataType: 'boolean', required: false, filterable: true }
              ]
            },
            {
              code: 'HOME_LIVING_STORAGE_AROMA',
              name: '香薰灯',
              sort: 22,
              icon: '🕯️',
              attributes: [
                { code: 'capacityMl', name: '容量', dataType: 'integer', unit: 'ml', range: [50, 500], required: false, filterable: true },
                { code: 'withLight', name: '带夜灯', dataType: 'boolean', required: false, filterable: true }
              ]
            }
          ]
        }
      ]
    }
  };

  /** 站点当前生效的品类定义（可被商家端导入的新品类合并） */
  const CATEGORY_DEFS = [CATEGORY_JSON, DIGITAL_JSON, HOME_LIVING_JSON];

  /* ---------------------------------------------------------------
   * 2. 商品 SPU（24 个）—— 属性取值遵循所属品类的 Schema
   *    skuSpecs + skuBase + skuDelta 用于程序化展开 SKU，避免重复录入
   * --------------------------------------------------------------- */
  const PRODUCT_DEFS = [
    /* ===== 家用电器 · 厨房电器 · 电饭煲 ===== */
    {
      id: 'P1001', img: 1, title: '智选 IH 电磁加热电饭煲 4L', subTitle: '陶瓷厚釜 · 24 小时智能预约',
      category: 'HOME_APPLIANCE_KITCHEN_RICE_COOKER', brand: '智选', scene: 'KITCHEN',
      attrs: { brand: '智选', energyLevel: '一级', warrantyYears: 3, capacity: 4, innerPot: '陶瓷', keepWarmHours: 24 },
      skuSpecs: [{ name: '容量', options: ['4L', '5L'] }, { name: '颜色', options: ['珍珠白', '曜石黑'] }],
      skuBase: 699, skuDelta: { '容量': { '5L': 120 } }, marketRatio: 1.28, stockBase: 86,
      sales: 12836, rating: 4.9, reviews: 4210, tags: ['国补可用', '以旧换新'],
      highlights: ['1300W IH 电磁加热，米粒受热更均匀', '陶瓷厚釜内胆，耐磨不粘', '24 小时智能预约，下班即食']
    },
    {
      id: 'P1002', img: 2, title: '云厨 智能预约电饭煲 3L', subTitle: '一人食 · 小户型首选',
      category: 'HOME_APPLIANCE_KITCHEN_RICE_COOKER', brand: '云厨', scene: 'KITCHEN',
      attrs: { brand: '云厨', energyLevel: '二级', warrantyYears: 2, capacity: 3, innerPot: '铝合金', keepWarmHours: 12 },
      skuSpecs: [{ name: '容量', options: ['3L'] }, { name: '颜色', options: ['奶白色', '雾霾蓝'] }],
      skuBase: 329, skuDelta: {}, marketRatio: 1.25, stockBase: 152,
      sales: 20418, rating: 4.7, reviews: 6823, tags: ['爆款', '学生党'],
      highlights: ['3L 黄金容量，1-3 人刚好', '8 大烹饪菜单一键切换', '可拆卸内盖，清洗无死角']
    },
    /* ===== 家用电器 · 厨房电器 · 微波炉 ===== */
    {
      id: 'P1003', img: 3, title: '光波变频微波炉 23L', subTitle: '一级能效 · 智能菜单',
      category: 'HOME_APPLIANCE_KITCHEN_MICROWAVE', brand: '智选', scene: 'KITCHEN',
      attrs: { brand: '智选', energyLevel: '一级', warrantyYears: 3, capacity: 23, power: 900, heatingMode: '光波' },
      skuSpecs: [{ name: '容量', options: ['23L'] }, { name: '颜色', options: ['银色', '黑色'] }],
      skuBase: 899, skuDelta: {}, marketRatio: 1.3, stockBase: 64,
      sales: 6721, rating: 4.8, reviews: 1832, tags: ['以旧换新'],
      highlights: ['变频微波，火力可精细调节', '光波烧烤组合，外脆里嫩', '一级能效，日常使用更省电']
    },
    {
      id: 'P1022', img: 22, title: '微蒸烤一体机 32L', subTitle: '一台顶三台 · 嵌入式',
      category: 'HOME_APPLIANCE_KITCHEN_MICROWAVE', brand: '云厨', scene: 'KITCHEN',
      attrs: { brand: '云厨', energyLevel: '二级', warrantyYears: 5, capacity: 32, power: 1800, heatingMode: '微蒸烤一体' },
      skuSpecs: [{ name: '容量', options: ['32L'] }, { name: '颜色', options: ['石墨黑', '月光银'] }],
      skuBase: 2499, skuDelta: {}, marketRatio: 1.22, stockBase: 28,
      sales: 1946, rating: 4.9, reviews: 512, tags: ['新品', '嵌入式'],
      highlights: ['微波 / 蒸汽 / 烘烤三合一', '40 道自动菜单，厨房小白也能上手', '一键高温自清洁']
    },
    /* ===== 家用电器 · 清洁电器 · 扫地机器人 ===== */
    {
      id: 'P1004', img: 4, title: '星尘 X9 激光导航扫地机器人', subTitle: '自动集尘 · 60 天免倒灰',
      category: 'HOME_APPLIANCE_CLEANING_ROBOT', brand: '星尘', scene: 'CLEANING',
      attrs: { brand: '星尘', energyLevel: '一级', warrantyYears: 2, suctionPower: 8000, navigation: '激光导航', selfEmpty: true, batteryLife: 180 },
      skuSpecs: [{ name: '基站版本', options: ['自集尘版', '自清洁版'] }, { name: '颜色', options: ['月光白', '深空灰'] }],
      skuBase: 2999, skuDelta: { '基站版本': { '自清洁版': 400 } }, marketRatio: 1.18, stockBase: 42,
      sales: 8934, rating: 4.9, reviews: 2214, tags: ['AI 组货常客', '热销'],
      highlights: ['LDS 激光导航，建图准、不漏扫', '8000Pa 大吸力，地毯地板通吃', '自动集尘基站，60 天才倒一次灰']
    },
    {
      id: 'P1005', img: 5, title: '星尘 Mini 视觉导航扫地机器人', subTitle: '小户型神器 · 静音',
      category: 'HOME_APPLIANCE_CLEANING_ROBOT', brand: '星尘', scene: 'CLEANING',
      attrs: { brand: '星尘', energyLevel: '二级', warrantyYears: 2, suctionPower: 5000, navigation: '视觉导航', selfEmpty: false, batteryLife: 120 },
      skuSpecs: [{ name: '颜色', options: ['奶油白', '雾霾蓝'] }],
      skuBase: 1399, skuDelta: {}, marketRatio: 1.24, stockBase: 98,
      sales: 15233, rating: 4.6, reviews: 5107, tags: ['性价比'],
      highlights: ['视觉导航，暗光环境也能建图', '8.5cm 纤薄机身，床底沙发底自由进出', '55dB 低噪，夜间清扫不打扰']
    },
    {
      id: 'P1020', img: 20, title: '星尘 Pro 自集尘扫地机器人', subTitle: 'AI 避障 · 拖扫一体',
      category: 'HOME_APPLIANCE_CLEANING_ROBOT', brand: '星尘', scene: 'CLEANING',
      attrs: { brand: '星尘', energyLevel: '一级', warrantyYears: 3, suctionPower: 12000, navigation: '激光导航', selfEmpty: true, batteryLife: 240 },
      skuSpecs: [{ name: '基站版本', options: ['自集尘版', '全能版'] }, { name: '颜色', options: ['深空灰'] }],
      skuBase: 3999, skuDelta: { '基站版本': { '全能版': 700 } }, marketRatio: 1.16, stockBase: 19,
      sales: 3271, rating: 4.9, reviews: 806, tags: ['旗舰', '限量'],
      highlights: ['12000Pa 飓风吸力', 'AI 视觉避障，识别 55 种障碍物', '热水洗拖布 + 热风烘干']
    },
    /* ===== 家用电器 · 清洁电器 · 吸尘器 ===== */
    {
      id: 'P1006', img: 6, title: '无线手持吸尘器 V12', subTitle: '除螨刷头 · 全屋清洁',
      category: 'HOME_APPLIANCE_CLEANING_VACUUM', brand: '星尘', scene: 'CLEANING',
      attrs: { brand: '星尘', energyLevel: '二级', warrantyYears: 2, suctionPower: 25000, dustCup: 0.6, cordless: true },
      skuSpecs: [{ name: '套装', options: ['标准版', '除螨套装'] }],
      skuBase: 1299, skuDelta: { '套装': { '除螨套装': 200 } }, marketRatio: 1.27, stockBase: 73,
      sales: 11872, rating: 4.8, reviews: 3392, tags: ['热销'],
      highlights: ['25000Pa 强劲吸力', '多锥气旋分离，吸力持久不衰减', '一机多用：地板 / 地毯 / 床褥 / 缝隙']
    },
    /* ===== 家用电器 · 大家电 ===== */
    {
      id: 'P1007', img: 7, title: '十字四门风冷冰箱 452L', subTitle: '一级能效 · 母婴专区',
      category: 'HOME_APPLIANCE_LARGE_FRIDGE', brand: '智选', scene: 'LIVING',
      attrs: { brand: '智选', energyLevel: '一级', warrantyYears: 10, coolingMode: '风冷', volume: 452 },
      skuSpecs: [{ name: '面板', options: ['岩板灰', '珍珠白'] }],
      skuBase: 4299, skuDelta: { '面板': { '岩板灰': 200 } }, marketRatio: 1.2, stockBase: 31,
      sales: 4185, rating: 4.8, reviews: 1123, tags: ['以旧换新', '国补可用'],
      highlights: ['452L 十字四门，分区精细不串味', '风冷无霜，免除手动除冰', '母婴专区独立控温']
    },
    {
      id: 'P1008', img: 8, title: '新一级能效变频空调 1.5 匹', subTitle: '智能语音 · 自清洁',
      category: 'HOME_APPLIANCE_LARGE_AC', brand: '智选', scene: 'LIVING',
      attrs: { brand: '智选', energyLevel: '一级', warrantyYears: 6, horsepower: '1.5 匹', inverter: true },
      skuSpecs: [{ name: '匹数', options: ['1 匹', '1.5 匹', '2 匹'] }],
      skuBase: 2599, skuDelta: { '匹数': { '1 匹': -400, '2 匹': 900 } }, marketRatio: 1.22, stockBase: 57,
      sales: 9621, rating: 4.7, reviews: 2876, tags: ['国补可用', '爆款'],
      highlights: ['新一级能效，APF 5.28', '语音控制，动口不动手', '56℃ 高温自清洁，出风更健康']
    },
    /* ===== 数码电子 · 智能手机 ===== */
    {
      id: 'P1009', img: 9, title: '星辰 7 Pro 5G 手机', subTitle: '潜望长焦 · 2K 屏',
      category: 'DIGITAL_PHONE_SMARTPHONE', brand: '星辰', scene: 'DIGITAL',
      attrs: { brand: '星辰', warrantyMonths: 12, storage: '512GB', screenSize: 6.7, network: '5G' },
      skuSpecs: [{ name: '存储', options: ['256GB', '512GB', '1TB'] }, { name: '颜色', options: ['曜石黑', '月光银', '远峰蓝'] }],
      skuBase: 4299, skuDelta: { '存储': { '512GB': 400, '1TB': 1000 } }, marketRatio: 1.1, stockBase: 121,
      sales: 23108, rating: 4.9, reviews: 7612, tags: ['旗舰', '热销'],
      highlights: ['骁龙 8 系旗舰平台', '2K 高刷屏，120Hz 自适应', '5000mAh + 120W 快充']
    },
    {
      id: 'P1010', img: 10, title: '星辰 7 青春版', subTitle: '轻薄长续航 · 学生首选',
      category: 'DIGITAL_PHONE_SMARTPHONE', brand: '星辰', scene: 'DIGITAL',
      attrs: { brand: '星辰', warrantyMonths: 12, storage: '256GB', screenSize: 6.4, network: '5G' },
      skuSpecs: [{ name: '存储', options: ['128GB', '256GB'] }, { name: '颜色', options: ['晴海蓝', '樱花粉', '石墨黑'] }],
      skuBase: 1699, skuDelta: { '存储': { '256GB': 300 } }, marketRatio: 1.12, stockBase: 208,
      sales: 34612, rating: 4.7, reviews: 11024, tags: ['爆款', '学生党'],
      highlights: ['171g 轻薄机身，单手可握', '6000mAh 大电池，两天一充', '5000 万像素主摄']
    },
    {
      id: 'P1021', img: 21, title: '星海 Note 大电池手机', subTitle: '7000mAh · 长辈友好',
      category: 'DIGITAL_PHONE_SMARTPHONE', brand: '星海', scene: 'DIGITAL',
      attrs: { brand: '星海', warrantyMonths: 24, storage: '256GB', screenSize: 6.8, network: '5G' },
      skuSpecs: [{ name: '存储', options: ['128GB', '256GB', '512GB'] }],
      skuBase: 1999, skuDelta: { '存储': { '256GB': 200, '512GB': 600 } }, marketRatio: 1.15, stockBase: 87,
      sales: 7429, rating: 4.6, reviews: 2041, tags: ['长续航'],
      highlights: ['7000mAh 超大电池', '6.8 英寸护眼大屏', '简易模式 + 超大字体']
    },
    /* ===== 数码电子 · 平板 / 穿戴 / 耳机 ===== */
    {
      id: 'P1011', img: 11, title: '云平板 Pad 11', subTitle: '2.8K 屏 · 四扬声器',
      category: 'DIGITAL_PHONE_TABLET', brand: '云平板', scene: 'DIGITAL',
      attrs: { brand: '云平板', warrantyMonths: 12, storage: '256GB', screenSize: 11 },
      skuSpecs: [{ name: '存储', options: ['128GB', '256GB', '512GB'] }, { name: '网络', options: ['WLAN 版', '5G 版'] }],
      skuBase: 2199, skuDelta: { '存储': { '256GB': 300, '512GB': 800 }, '网络': { '5G 版': 500 } }, marketRatio: 1.13, stockBase: 66,
      sales: 6312, rating: 4.8, reviews: 1523, tags: ['办公', '影音'],
      highlights: ['2.8K 144Hz 高刷屏', '四扬声器杜比全景声', '支持手写笔与磁吸键盘']
    },
    {
      id: 'P1012', img: 12, title: '智行 Watch 3 智能手表', subTitle: '血氧心率 · 14 天续航',
      category: 'DIGITAL_WEARABLE_SMARTWATCH', brand: '智行', scene: 'DIGITAL',
      attrs: { brand: '智行', warrantyMonths: 12, dial: '圆形', waterproof: true, batteryDays: 14 },
      skuSpecs: [{ name: '表带', options: ['氟橡胶', '米兰尼斯'] }, { name: '尺寸', options: ['42mm', '46mm'] }],
      skuBase: 1299, skuDelta: { '表带': { '米兰尼斯': 200 }, '尺寸': { '46mm': 100 } }, marketRatio: 1.2, stockBase: 143,
      sales: 9841, rating: 4.8, reviews: 2871, tags: ['运动', '热销'],
      highlights: ['全天候血氧 / 心率监测', '100+ 运动模式', '14 天超长续航']
    },
    {
      id: 'P1013', img: 13, title: '智行 Watch Fit 轻薄手表', subTitle: '26g 无感佩戴',
      category: 'DIGITAL_WEARABLE_SMARTWATCH', brand: '智行', scene: 'DIGITAL',
      attrs: { brand: '智行', warrantyMonths: 12, dial: '方形', waterproof: true, batteryDays: 10 },
      skuSpecs: [{ name: '颜色', options: ['象牙白', '薄荷绿', '石墨黑'] }],
      skuBase: 599, skuDelta: {}, marketRatio: 1.25, stockBase: 231,
      sales: 17654, rating: 4.6, reviews: 5218, tags: ['性价比'],
      highlights: ['26g 轻薄机身，睡觉也无感', '1.85 英寸 AMOLED 大屏', '女性健康周期管理']
    },
    {
      id: 'P1014', img: 14, title: '声界 Air Pro 主动降噪耳机', subTitle: '48dB 深度降噪',
      category: 'DIGITAL_WEARABLE_EARPHONE', brand: '声界', scene: 'DIGITAL',
      attrs: { brand: '声界', warrantyMonths: 12, wearing: '入耳式', noiseCancel: true },
      skuSpecs: [{ name: '版本', options: ['标准版', '降噪 Pro 版'] }, { name: '颜色', options: ['陶瓷白', '曜石黑'] }],
      skuBase: 799, skuDelta: { '版本': { '降噪 Pro 版': 300 } }, marketRatio: 1.22, stockBase: 176,
      sales: 21307, rating: 4.9, reviews: 8421, tags: ['爆款', '通勤'],
      highlights: ['48dB 主动降噪，地铁也能安静', '40 小时总续航', '三麦通话降噪']
    },
    /* ===== 家居生活 · 床品 ===== */
    {
      id: 'P1015', img: 15, title: '60 支长绒棉四件套', subTitle: '裸睡级触感 · 全棉',
      category: 'HOME_LIVING_BEDDING_BEDDING_SET', brand: '眠丘', scene: 'BEDROOM',
      attrs: { brand: '眠丘', washable: true, threadCount: 60, size: '1.8m', season: '四季' },
      skuSpecs: [{ name: '适用床宽', options: ['1.5m', '1.8m', '2.0m'] }, { name: '花色', options: ['奶油杏', '雾霾蓝', '豆绿'] }],
      skuBase: 499, skuDelta: { '适用床宽': { '1.8m': 60, '2.0m': 120 } }, marketRatio: 1.35, stockBase: 189,
      sales: 28914, rating: 4.8, reviews: 9312, tags: ['爆款', '裸睡级'],
      highlights: ['新疆长绒棉，60 支高密', '亲肤柔软，越洗越柔', '活性印染，久用不褪色']
    },
    {
      id: 'P1016', img: 16, title: '天丝夏凉四件套', subTitle: '凉感面料 · 空调房必备',
      category: 'HOME_LIVING_BEDDING_BEDDING_SET', brand: '眠丘', scene: 'BEDROOM',
      attrs: { brand: '眠丘', washable: true, threadCount: 80, size: '1.8m', season: '夏凉' },
      skuSpecs: [{ name: '适用床宽', options: ['1.5m', '1.8m', '2.0m'] }],
      skuBase: 599, skuDelta: { '适用床宽': { '1.8m': 60, '2.0m': 120 } }, marketRatio: 1.32, stockBase: 134,
      sales: 13207, rating: 4.7, reviews: 4021, tags: ['夏季', '凉感'],
      highlights: ['莱赛尔天丝，接触瞬间凉感', '透气排湿，夏季不闷汗', '80 支高密，丝滑垂坠']
    },
    {
      id: 'P1017', img: 17, title: '95 白鹅绒冬被', subTitle: '95% 绒子含量 · 轻盈保暖',
      category: 'HOME_LIVING_BEDDING_QUILT', brand: '眠丘', scene: 'BEDROOM',
      attrs: { brand: '眠丘', washable: false, fill: '羽绒', weightKg: 2.5 },
      skuSpecs: [{ name: '尺寸', options: ['200×230cm', '220×240cm'] }, { name: '充绒量', options: ['1000g', '1300g'] }],
      skuBase: 1299, skuDelta: { '尺寸': { '220×240cm': 200 }, '充绒量': { '1300g': 300 } }, marketRatio: 1.28, stockBase: 78,
      sales: 5246, rating: 4.9, reviews: 1418, tags: ['冬季', '轻暖'],
      highlights: ['95% 白鹅绒，蓬松度 800+', '立体立衬工艺，不跑绒', '面料防钻绒处理']
    },
    /* ===== 家居生活 · 收纳香薰 ===== */
    {
      id: 'P1018', img: 18, title: '折叠收纳箱 三只装', subTitle: '免安装 · 可叠加',
      category: 'HOME_LIVING_STORAGE_STORAGE_BOX', brand: '纳川', scene: 'STORAGE',
      attrs: { brand: '纳川', washable: false, capacityL: 66, foldable: true },
      skuSpecs: [{ name: '规格', options: ['三只装', '六只装'] }, { name: '颜色', options: ['象牙白', '浅灰'] }],
      skuBase: 129, skuDelta: { '规格': { '六只装': 110 } }, marketRatio: 1.4, stockBase: 312,
      sales: 41237, rating: 4.6, reviews: 15208, tags: ['爆款', '租房必备'],
      highlights: ['一秒折叠收纳，不用时扁平存放', '可叠加设计，纵向扩容', 'PP 材质，无异味']
    },
    {
      id: 'P1023', img: 23, title: '衣柜分层收纳格', subTitle: '衣物立着放 · 一眼找到',
      category: 'HOME_LIVING_STORAGE_STORAGE_BOX', brand: '纳川', scene: 'STORAGE',
      attrs: { brand: '纳川', washable: true, capacityL: 12, foldable: true },
      skuSpecs: [{ name: '规格', options: ['四格装', '八格装'] }],
      skuBase: 89, skuDelta: { '规格': { '八格装': 70 } }, marketRatio: 1.38, stockBase: 276,
      sales: 22190, rating: 4.7, reviews: 7124, tags: ['整理神器'],
      highlights: ['分隔收纳，衣物不再东倒西歪', '可水洗，脏了一冲即净', '折叠后仅 3cm 厚']
    },
    {
      id: 'P1019', img: 19, title: '香薰加湿夜灯', subTitle: '静音加湿 · 七彩氛围',
      category: 'HOME_LIVING_STORAGE_AROMA', brand: '沐野', scene: 'BEDROOM',
      attrs: { brand: '沐野', washable: false, capacityMl: 300, withLight: true },
      skuSpecs: [{ name: '颜色', options: ['暖木色', '陶瓷白'] }],
      skuBase: 259, skuDelta: {}, marketRatio: 1.3, stockBase: 198,
      sales: 15830, rating: 4.7, reviews: 4872, tags: ['氛围感', '助眠'],
      highlights: ['300ml 大容量，整夜加湿', '28dB 静音，卧室可放心用', '七彩渐变夜灯，助眠氛围']
    },
    {
      id: 'P1024', img: 24, title: '无火香薰礼盒', subTitle: '天然植物精油 · 送礼首选',
      category: 'HOME_LIVING_STORAGE_AROMA', brand: '沐野', scene: 'BEDROOM',
      attrs: { brand: '沐野', washable: false, capacityMl: 100, withLight: false },
      skuSpecs: [{ name: '香型', options: ['白茶', '雪松', '鸢尾'] }],
      skuBase: 199, skuDelta: {}, marketRatio: 1.35, stockBase: 241,
      sales: 19764, rating: 4.8, reviews: 6031, tags: ['礼盒', '爆款'],
      highlights: ['天然植物精油萃取', '藤条扩香，无需用电更安全', '礼盒包装，送礼有面']
    }
  ];

  /* ---------------------------------------------------------------
   * 3. 由 SPU 展开 SKU（模拟 t_sku / t_inventory）
   *    成本价按「价格越高、毛利率越低」的零售规律反推：
   *    毛利率 = 0.18 + 0.42 × (1 − min(1, 售价/4500))，落在 18% ~ 60% 之间。
   *    该成本模型用于智能组货的毛利测算（BR-12）。
   * --------------------------------------------------------------- */
  const grossMarginOf = (price) => 0.18 + 0.42 * (1 - Math.min(1, price / 4500));
  function expandSkus(def) {
    const groups = def.skuSpecs || [];
    const combos = groups.reduce(
      (acc, g) => acc.flatMap((prev) => g.options.map((o) => prev.concat([{ name: g.name, value: o }]))),
      [[]]
    );
    return combos.map((combo, i) => {
      let price = def.skuBase;
      combo.forEach((c) => {
        const d = (def.skuDelta || {})[c.name];
        if (d && d[c.value] != null) price += d[c.value];
      });
      const salePrice = Math.round(price);
      return {
        skuId: `${def.id}-${String(i + 1).padStart(2, '0')}`,
        productId: def.id,
        specs: combo.reduce((m, c) => ((m[c.name] = c.value), m), {}),
        specText: combo.map((c) => c.value).join(' / '),
        salePrice,
        marketPrice: Math.round(salePrice * def.marketRatio),
        costPrice: Math.round(salePrice * (1 - grossMarginOf(salePrice))),
        stock: Math.max(0, def.stockBase - ((i * 7) % 23)),
        status: 1
      };
    });
  }

  const PRODUCTS = PRODUCT_DEFS.map((def) => {
    const skus = expandSkus(def);
    const prices = skus.map((s) => s.salePrice);
    const stock = skus.reduce((a, s) => a + s.stock, 0);
    return {
      id: def.id,
      title: def.title,
      subTitle: def.subTitle,
      category: def.category,
      brand: def.brand,
      scene: def.scene,
      attrs: def.attrs || {},
      skus,
      images: [1, 2, 3].map((n) => `assets/img/product/p${def.img}_${n}.svg`),
      salePrice: Math.min.apply(null, prices),
      marketPrice: Math.max.apply(null, skus.map((s) => s.marketPrice)),
      stock,
      sales: def.sales,
      rating: def.rating,
      reviews: def.reviews,
      tags: def.tags || [],
      highlights: def.highlights || [],
      status: 1,
      createdAt: '2026-07-01 10:00:00'
    };
  });

  /* ---------------------------------------------------------------
   * 4. 用户 / 地址 / 优惠券 / 知识库
   * --------------------------------------------------------------- */
  const USER = {
    userId: 10001,
    nickname: '云上小夏',
    mobile: '138****6021',
    memberLevel: 3,
    memberName: '钻石会员',
    avatarText: '夏',
    points: 4280,
    balance: 268.5,
    coupons: 3,
    createdAt: '2025-03-12'
  };

  const ADDRESSES = [
    { id: 'A01', name: '夏小雨', mobile: '138****6021', region: '浙江省 杭州市 余杭区', detail: '文一西路 969 号 未来科技城 A 座 1802', tag: '公司', isDefault: true },
    { id: 'A02', name: '夏小雨', mobile: '138****6021', region: '浙江省 杭州市 西湖区', detail: '文三路 90 号 东部软件园 3 号楼 502', tag: '家', isDefault: false },
    { id: 'A03', name: '夏妈妈', mobile: '139****7788', region: '江苏省 南京市 鼓楼区', detail: '中山北路 200 号 金陵小区 12 栋 601', tag: '父母', isDefault: false }
  ];

  /** 优惠券：type=满减/折扣；threshold 门槛；value 面额或折扣 */
  const COUPONS = [
    { id: 'C01', name: '家电专享券', type: 'amount', threshold: 1000, value: 120, scope: '家用电器', expire: '2026-10-31', desc: '家用电器类目满 1000 减 120' },
    { id: 'C02', name: '数码新品券', type: 'amount', threshold: 800, value: 60, scope: '数码电子', expire: '2026-10-20', desc: '数码电子类目满 800 减 60' },
    { id: 'C03', name: '全平台通用券', type: 'amount', threshold: 300, value: 30, scope: '全平台', expire: '2026-11-11', desc: '全平台满 300 减 30' },
    { id: 'C04', name: '家居 9 折券', type: 'discount', threshold: 200, value: 0.9, scope: '家居生活', expire: '2026-10-25', desc: '家居生活类目 9 折，最高减 80' },
    { id: 'C05', name: '新人券', type: 'amount', threshold: 0, value: 20, scope: '全平台', expire: '2026-12-31', desc: '新人无门槛 20 元' }
  ];

  /** 知识库片段（智能客服 RAG 检索源） */
  const KNOWLEDGE = [
    { id: 'K01', topic: '物流', keywords: ['物流', '快递', '发货', '几天', '什么时候到', '运单'], content: '现货商品在付款后 48 小时内发货（预售商品以详情页标注为准）。江浙沪地区通常 1-2 天送达，其他地区 2-4 天，偏远地区 4-7 天。发货后可在「我的订单 - 查看物流」实时查看轨迹。' },
    { id: 'K02', topic: '退换货', keywords: ['退货', '换货', '退款', '七天无理由', '不满意'], content: '商品支持 7 天无理由退换（自签收次日起算），需保持商品及配件、包装完好。已激活的数码产品、贴身床品拆封后不支持无理由退换。退款将在商家收货质检通过后 1-3 个工作日原路退回。' },
    { id: 'K03', topic: '质保', keywords: ['保修', '质保', '维修', '坏了', '售后'], content: '家电整机保修年限以商品详情页标注为准（大家电多为 6-10 年，厨电 2-5 年）。保修期内非人为损坏免费维修，可凭订单号联系官方售后。' },
    { id: 'K04', topic: '支付', keywords: ['支付', '付款', '怎么付', '花呗', '分期', '微信', '支付宝'], content: '支持微信支付、支付宝、云闪付与银行卡支付；单笔订单满 1000 元可享 3 / 6 / 12 期免息分期。支付遇到问题可尝试更换支付方式或稍后重试。' },
    { id: 'K05', topic: '优惠', keywords: ['优惠', '券', '满减', '打折', '便宜', '活动'], content: '每个订单可使用 1 张优惠券，优惠券可与平台满减活动叠加，但与限时秒杀不叠加。优惠券有效期以券面标注为准，逾期自动失效。' },
    { id: 'K06', topic: '安装', keywords: ['安装', '上门', '装', '打孔'], content: '空调、冰箱等大家电提供免费上门安装（打孔、加长管线等辅材费用另计），下单后 24 小时内会有师傅电话预约。' },
    { id: 'K07', topic: '发票', keywords: ['发票', '开票', '报销', '电子发票'], content: '下单时可填写发票信息，默认开具电子普票，在订单完成后 24 小时内发送至订单预留邮箱；需要专票请在备注中说明。' },
    { id: 'K08', topic: '库存', keywords: ['有货', '库存', '缺货', '补货', '没货'], content: '商品页面显示的库存为实时可用库存。若显示缺货可点击「到货通知」，补货后系统会通过站内消息提醒。' }
  ];

  /** AI 客服常用问题（冷启动 / 降级时兜底展示） */
  const FAQ = [
    '我的订单什么时候发货？',
    '7 天无理由退货怎么操作？',
    '这台空调保修几年？',
    '支持哪些支付方式？可以分期吗？',
    '优惠券能和满减叠加吗？',
    '大家电包安装吗？'
  ];

  /* ---------------------------------------------------------------
   * 5. 组货场景规则（智能组货：场景识别 → 配套召回，FR-21）
   *    scene 定义主商品所在场景，complement 为可搭配的兄弟品类
   * --------------------------------------------------------------- */
  const BUNDLE_SCENES = {
    KITCHEN: { name: '厨房升级套装', icon: '🍳', complement: ['HOME_APPLIANCE_KITCHEN_MICROWAVE', 'HOME_LIVING_STORAGE_STORAGE_BOX', 'HOME_LIVING_STORAGE_AROMA'], ratio: 0.93 },
    CLEANING: { name: '全屋清洁套装', icon: '🧹', complement: ['HOME_APPLIANCE_CLEANING_VACUUM', 'HOME_LIVING_STORAGE_STORAGE_BOX', 'HOME_APPLIANCE_CLEANING_ROBOT'], ratio: 0.94 },
    LIVING: { name: '客厅焕新套装', icon: '🏠', complement: ['HOME_APPLIANCE_CLEANING_ROBOT', 'HOME_LIVING_STORAGE_AROMA', 'HOME_LIVING_STORAGE_STORAGE_BOX'], ratio: 0.95 },
    DIGITAL: { name: '数字生活套装', icon: '📱', complement: ['DIGITAL_WEARABLE_SMARTWATCH', 'DIGITAL_WEARABLE_EARPHONE', 'DIGITAL_PHONE_TABLET', 'DIGITAL_PHONE_SMARTPHONE'], ratio: 0.92 },
    BEDROOM: { name: '安睡卧室套装', icon: '🛏️', complement: ['HOME_LIVING_BEDDING_QUILT', 'HOME_LIVING_BEDDING_BEDDING_SET', 'HOME_LIVING_STORAGE_AROMA'], ratio: 0.93 },
    STORAGE: { name: '收纳整理套装', icon: '🧺', complement: ['HOME_LIVING_STORAGE_STORAGE_BOX', 'HOME_LIVING_STORAGE_AROMA', 'HOME_LIVING_BEDDING_BEDDING_SET'], ratio: 0.95 }
  };

  /** 组货搭配理由模板（模拟大模型生成「搭配理由」，FR-21） */
  const BUNDLE_REASONS = [
    '与「{main}」同属{scene}场景，购买关联度达 {score}%，多数用户会一起下单',
    '{scene}高频搭配：{items}，补齐后一次性解决{scene}需求',
    '基于 {score} 位同场景用户的购买路径，{items} 是最常见的下一步选择',
    '组合后覆盖{scene}完整动线，避免重复购买与尺寸不匹配'
  ];

  /** 推荐召回来源（多路召回：协同过滤 / 向量语义 / 热门新品，FR-18） */
  const RECALL_SOURCES = ['协同过滤', '向量语义', '热门新品', '画像偏好', '场景关联'];

  /** 推荐理由模板（智能选品，FR-17/FR-18） */
  const REC_REASONS = {
    协同过滤: '与你兴趣相近的用户也在看',
    向量语义: '与你最近浏览的商品语义相近',
    热门新品: '本品类近期热度飙升的新品',
    画像偏好: '命中你的长期偏好：{cat}',
    场景关联: '与「{cat}」场景强关联的配套好物'
  };

  /* ---------------------------------------------------------------
   * 6. 订单种子数据（覆盖状态机的主要状态，FR-05 / 图 4-7）
   * --------------------------------------------------------------- */
  const ORDER_STATUS = {
    PENDING_PAY: { key: 'PENDING_PAY', label: '待支付', tone: 'warning', step: 1 },
    PAID: { key: 'PAID', label: '已支付', tone: 'info', step: 2 },
    SHIPPING: { key: 'SHIPPING', label: '待发货', tone: 'info', step: 3 },
    SHIPPED: { key: 'SHIPPED', label: '已发货', tone: 'primary', step: 4 },
    AFTER_SALE: { key: 'AFTER_SALE', label: '售后中', tone: 'warning', step: 5 },
    REFUNDING: { key: 'REFUNDING', label: '退款中', tone: 'warning', step: 5 },
    REFUNDED: { key: 'REFUNDED', label: '已退款', tone: 'muted', step: 9 },
    COMPLETED: { key: 'COMPLETED', label: '已完成', tone: 'success', step: 6 },
    CLOSED: { key: 'CLOSED', label: '已关闭', tone: 'muted', step: 0 }
  };

  const seedItems = (pid, skuIdx, qty) => {
    const p = PRODUCTS.find((x) => x.id === pid);
    const sku = p.skus[skuIdx];
    return { productId: p.id, skuId: sku.skuId, title: p.title, image: p.images[0], specText: sku.specText, unitPrice: sku.salePrice, quantity: qty, category: p.category };
  };

  const SEED_ORDERS = [
    {
      orderNo: 'AIECP20260928001',
      status: 'SHIPPED',
      createdAt: '2026-09-28 14:22:10',
      items: [seedItems('P1004', 0, 1), seedItems('P1006', 0, 1)],
      bundleId: 'B-KITCHEN-P1004',
      bundleName: '全屋清洁套装',
      address: ADDRESSES[1],
      couponText: '家电专享券 -120',
      freight: 0,
      payChannel: '微信支付',
      remark: '工作日 18:00 后配送',
      timeline: [
        { time: '2026-09-28 14:22:10', text: '订单提交成功，库存已锁定', status: 'PENDING_PAY' },
        { time: '2026-09-28 14:25:41', text: '支付成功（微信支付），等待商家确认', status: 'PAID' },
        { time: '2026-09-29 09:12:03', text: '商家已接单，分配至杭州 2 号仓', status: 'SHIPPING' },
        { time: '2026-09-29 18:40:55', text: '商品已出库，等待揽收', status: 'SHIPPED' }
      ],
      logistics: {
        carrier: '顺丰速运',
        no: 'SF7392018845621',
        traces: [
          { time: '2026-09-29 18:40:55', text: '【杭州集散中心】已发货，等待揽收' },
          { time: '2026-09-29 21:07:12', text: '【杭州集散中心】快件已被揽收' },
          { time: '2026-09-30 02:33:48', text: '【杭州转运中心】已发出，下一站【南京转运中心】' },
          { time: '2026-09-30 08:15:26', text: '【南京转运中心】已到达' },
          { time: '2026-09-30 09:41:03', text: '【南京鼓楼区营业点】派送中，快递员 138****2210' }
        ]
      }
    },
    {
      orderNo: 'AIECP20261002007',
      status: 'COMPLETED',
      createdAt: '2026-10-02 09:05:33',
      items: [seedItems('P1015', 1, 1), seedItems('P1017', 0, 1)],
      bundleId: null,
      bundleName: '',
      address: ADDRESSES[0],
      couponText: '无',
      freight: 0,
      payChannel: '支付宝',
      remark: '',
      timeline: [
        { time: '2026-10-02 09:05:33', text: '订单提交成功，库存已锁定', status: 'PENDING_PAY' },
        { time: '2026-10-02 09:06:12', text: '支付成功（支付宝）', status: 'PAID' },
        { time: '2026-10-02 15:20:44', text: '商家已接单，分配至嘉兴 1 号仓', status: 'SHIPPING' },
        { time: '2026-10-03 10:11:29', text: '商品已出库', status: 'SHIPPED' },
        { time: '2026-10-05 16:02:07', text: '用户确认收货，订单完成', status: 'COMPLETED' }
      ],
      logistics: {
        carrier: '中通快递',
        no: 'ZT4488120397655',
        traces: [
          { time: '2026-10-03 10:11:29', text: '【嘉兴仓】已发货' },
          { time: '2026-10-03 20:44:02', text: '【杭州转运中心】已到达' },
          { time: '2026-10-04 08:30:18', text: '【杭州余杭区营业点】派送中' },
          { time: '2026-10-04 11:26:51', text: '已签收，签收人：本人' }
        ]
      }
    },
    {
      orderNo: 'AIECP20261007012',
      status: 'PENDING_PAY',
      createdAt: '2026-10-07 20:41:08',
      items: [seedItems('P1014', 1, 1)],
      bundleId: null,
      bundleName: '',
      address: ADDRESSES[0],
      couponText: '无',
      freight: 0,
      payChannel: '',
      remark: '',
      timeline: [{ time: '2026-10-07 20:41:08', text: '订单提交成功，库存已锁定，请在 30 分钟内完成支付', status: 'PENDING_PAY' }],
      logistics: null
    },
    {
      orderNo: 'AIECP20260915003',
      status: 'REFUNDED',
      createdAt: '2026-09-15 11:18:52',
      items: [seedItems('P1005', 0, 1)],
      bundleId: null,
      bundleName: '',
      address: ADDRESSES[2],
      couponText: '新人券 -20',
      freight: 0,
      payChannel: '微信支付',
      remark: '',
      timeline: [
        { time: '2026-09-15 11:18:52', text: '订单提交成功', status: 'PENDING_PAY' },
        { time: '2026-09-15 11:21:30', text: '支付成功（微信支付）', status: 'PAID' },
        { time: '2026-09-16 09:44:12', text: '用户申请退款', status: 'REFUNDING' },
        { time: '2026-09-17 14:03:26', text: '退款成功，金额已原路退回', status: 'REFUNDED' }
      ],
      logistics: null
    }
  ];

  SEED_ORDERS.forEach((o) => {
    const goods = o.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    const coupon = o.couponText && o.couponText !== '无' ? Number(o.couponText.split('-')[1]) || 0 : 0;
    o.goodsAmount = goods;
    o.couponAmount = coupon;
    o.payAmount = Math.max(0, goods - coupon) + o.freight;
    o.itemCount = o.items.reduce((a, i) => a + i.quantity, 0);
  });

  /** 首页运营位（人工运营位，用于与 AI 推荐位做 A/B 对照，FR-20） */
  const BANNERS = [
    { id: 1, title: '家电以旧换新', sub: '国补叠加最高立减 800', tag: '限时', theme: 'blue', link: 'products.html?cat=HOME_APPLIANCE' },
    { id: 2, title: '数码秋季新品', sub: '旗舰机 12 期免息', tag: '新品', theme: 'violet', link: 'products.html?cat=DIGITAL' },
    { id: 3, title: '卧室焕新季', sub: '床品满 300 减 30', tag: '满减', theme: 'orange', link: 'products.html?cat=HOME_LIVING' }
  ];

  /** 热搜榜（搜索页冷启动展示） */
  const HOT_KEYWORDS = ['扫地机器人', '四件套', '5G 手机', '空调', '降噪耳机', '收纳箱', '电饭煲', '香薰'];

  NS.DATA = {
    grossMarginOf,
    CATEGORY_JSON,
    CATEGORY_DEFS,
    PRODUCTS,
    USER,
    ADDRESSES,
    COUPONS,
    KNOWLEDGE,
    FAQ,
    BUNDLE_SCENES,
    BUNDLE_REASONS,
    RECALL_SOURCES,
    REC_REASONS,
    ORDER_STATUS,
    SEED_ORDERS,
    BANNERS,
    HOT_KEYWORDS
  };
})(window.AIECP = window.AIECP || {});
