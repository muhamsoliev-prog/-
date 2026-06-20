// Локализация UI для 4 языков
export type Language = 'ru' | 'en' | 'zh' | 'tg'

export const translations = {
  ru: {
    // Sidebar
    sidebar: {
      dashboard: 'Дашборд',
      products: 'Товары',
      costPrice: 'Себестоимость',
      deductions: 'Удержания',
      payouts: 'Выплаты',
      settings: 'Настройки',
      underpayments: 'Недоплаты',
      reports: 'Отчёты',
      stores: 'Магазины',
      notifications: 'Уведомления',
      aiAnalytics: 'ИИ Аналитика'
    },
    // Dashboard
    dashboard: {
      revenue: 'Выручка',
      deductions: 'Удержания',
      payouts: 'Выплачено',
      tax: 'Налог',
      costs: 'Затраты',
      expenses: 'Расходы',
      profit: 'Прибыль',
      orders: 'Заказы',
      trending: 'По сравнению с прошлой неделей'
    },
    // Products
    products: {
      title: 'Товары',
      search: 'Поиск по названию или SKU',
      name: 'Название',
      sku: 'SKU',
      stock: 'Остаток',
      price: 'Цена',
      sales: 'Продажи',
      revenue: 'Выручка',
      rating: 'Рейтинг',
      edit: 'Редактировать',
      delete: 'Удалить',
      lowStock: 'Низкий остаток'
    },
    // Cost Price
    costPrice: {
      title: 'Себестоимость и маржа',
      avgMargin: 'Средняя маржа',
      totalMargin: 'Сумма маржи',
      monthlyProfit: 'Прибыль в месяц',
      categories: 'По категориям',
      category: 'Категория',
      count: 'Кол-во',
      marginPercent: 'Маржа %',
      monthProfit: 'Прибыль/месяц'
    },
    // Deductions
    deductions: {
      title: 'Удержания',
      total: 'Итого удержаний',
      commission: 'Коммиссия',
      logistics: 'Логистика',
      returns: 'Возвраты',
      penalties: 'Штрафы',
      active: 'Активно',
      resolved: 'Решено'
    },
    // Payouts
    payouts: {
      title: 'Выплаты',
      paid: 'Выплачено',
      inTransit: 'В пути',
      nextPayout: 'Следующая выплата',
      daysUntil: 'дней',
      expectedAmount: 'Ожидаемая сумма',
      bankDetails: 'Банковские реквизиты',
      download: 'Скачать отчёт'
    },
    // Settings
    settings: {
      title: 'Настройки',
      profile: 'Профиль',
      language: 'Язык интерфейса',
      apiTokens: 'API Токены',
      bankDetails: 'Банковские реквизиты',
      notifications: 'Уведомления',
      dangerZone: 'Опасная зона',
      firstName: 'Имя',
      lastName: 'Фамилия',
      email: 'Email',
      phone: 'Телефон',
      company: 'Компания',
      edit: 'Редактировать',
      save: 'Сохранить',
      cancel: 'Отмена',
      saved: 'Сохранено',
      bank: 'Название банка',
      bik: 'БИК',
      inn: 'ИНН',
      kpp: 'КПП',
      account: 'Расчётный счёт',
      emailNotif: 'Email уведомления',
      telegramNotif: 'Telegram уведомления',
      lowStock: 'Низкие остатки',
      newOrders: 'Новые заказы',
      payoutNotif: 'Уведомление о выплатах',
      reviewsNotif: 'Оценки и отзывы',
      testToken: 'Проверить токен',
      deleteAccount: 'Удалить аккаунт'
    }
  },
  en: {
    sidebar: {
      dashboard: 'Dashboard',
      products: 'Products',
      costPrice: 'Cost Price',
      deductions: 'Deductions',
      payouts: 'Payouts',
      settings: 'Settings',
      underpayments: 'Underpayments',
      reports: 'Reports',
      stores: 'Stores',
      notifications: 'Notifications',
      aiAnalytics: 'AI Analytics'
    },
    dashboard: {
      revenue: 'Revenue',
      deductions: 'Deductions',
      payouts: 'Paid Out',
      tax: 'Tax',
      costs: 'Costs',
      expenses: 'Expenses',
      profit: 'Profit',
      orders: 'Orders',
      trending: 'Compared to last week'
    },
    products: {
      title: 'Products',
      search: 'Search by name or SKU',
      name: 'Name',
      sku: 'SKU',
      stock: 'Stock',
      price: 'Price',
      sales: 'Sales',
      revenue: 'Revenue',
      rating: 'Rating',
      edit: 'Edit',
      delete: 'Delete',
      lowStock: 'Low stock'
    },
    costPrice: {
      title: 'Cost Price & Margin',
      avgMargin: 'Average Margin',
      totalMargin: 'Total Margin',
      monthlyProfit: 'Monthly Profit',
      categories: 'By Categories',
      category: 'Category',
      count: 'Count',
      marginPercent: 'Margin %',
      monthProfit: 'Profit/month'
    },
    deductions: {
      title: 'Deductions',
      total: 'Total Deductions',
      commission: 'Commission',
      logistics: 'Logistics',
      returns: 'Returns',
      penalties: 'Penalties',
      active: 'Active',
      resolved: 'Resolved'
    },
    payouts: {
      title: 'Payouts',
      paid: 'Paid',
      inTransit: 'In Transit',
      nextPayout: 'Next Payout',
      daysUntil: 'days',
      expectedAmount: 'Expected Amount',
      bankDetails: 'Bank Details',
      download: 'Download Report'
    },
    settings: {
      title: 'Settings',
      profile: 'Profile',
      language: 'Interface Language',
      apiTokens: 'API Tokens',
      bankDetails: 'Bank Details',
      notifications: 'Notifications',
      dangerZone: 'Danger Zone',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      saved: 'Saved',
      bank: 'Bank Name',
      bik: 'BIK',
      inn: 'INN',
      kpp: 'KPP',
      account: 'Account Number',
      emailNotif: 'Email Notifications',
      telegramNotif: 'Telegram Notifications',
      lowStock: 'Low Stock',
      newOrders: 'New Orders',
      payoutNotif: 'Payout Notification',
      reviewsNotif: 'Reviews & Ratings',
      testToken: 'Test Token',
      deleteAccount: 'Delete Account'
    }
  },
  zh: {
    sidebar: {
      dashboard: '仪表板',
      products: '产品',
      costPrice: '成本价',
      deductions: '扣除',
      payouts: '支付',
      settings: '设置',
      underpayments: '欠款',
      reports: '报告',
      stores: '商店',
      notifications: '通知',
      aiAnalytics: '人工智能分析'
    },
    dashboard: {
      revenue: '收入',
      deductions: '扣除',
      payouts: '已支付',
      tax: '税费',
      costs: '成本',
      expenses: '支出',
      profit: '利润',
      orders: '订单',
      trending: '与上周相比'
    },
    products: {
      title: '产品',
      search: '按名称或SKU搜索',
      name: '名称',
      sku: 'SKU',
      stock: '库存',
      price: '价格',
      sales: '销售',
      revenue: '收入',
      rating: '评分',
      edit: '编辑',
      delete: '删除',
      lowStock: '库存不足'
    },
    costPrice: {
      title: '成本价和利润',
      avgMargin: '平均利润',
      totalMargin: '总利润',
      monthlyProfit: '月利润',
      categories: '按类别',
      category: '类别',
      count: '数量',
      marginPercent: '利润率 %',
      monthProfit: '利润/月'
    },
    deductions: {
      title: '扣除',
      total: '总扣除',
      commission: '佣金',
      logistics: '物流',
      returns: '退货',
      penalties: '罚款',
      active: '活跃',
      resolved: '已解决'
    },
    payouts: {
      title: '支付',
      paid: '已支付',
      inTransit: '处理中',
      nextPayout: '下次支付',
      daysUntil: '天',
      expectedAmount: '预期金额',
      bankDetails: '银行详情',
      download: '下载报告'
    },
    settings: {
      title: '设置',
      profile: '个人资料',
      language: '界面语言',
      apiTokens: 'API令牌',
      bankDetails: '银行详情',
      notifications: '通知',
      dangerZone: '危险区域',
      firstName: '名字',
      lastName: '姓氏',
      email: '电子邮件',
      phone: '电话',
      company: '公司',
      edit: '编辑',
      save: '保存',
      cancel: '取消',
      saved: '已保存',
      bank: '银行名称',
      bik: 'BIK',
      inn: 'INN',
      kpp: 'KPP',
      account: '账户号码',
      emailNotif: '电子邮件通知',
      telegramNotif: 'Telegram通知',
      lowStock: '库存不足',
      newOrders: '新订单',
      payoutNotif: '支付通知',
      reviewsNotif: '评论和评分',
      testToken: '测试令牌',
      deleteAccount: '删除账户'
    }
  },
  tg: {
    sidebar: {
      dashboard: 'Панели',
      products: 'Маҳсулот',
      costPrice: 'Нархи Нараўақ',
      deductions: 'Баҳс',
      payouts: 'Пардохти',
      settings: 'Танзимот',
      underpayments: 'Қарзҳо',
      reports: 'Гузоришҳо',
      stores: 'Маҷозаҳо',
      notifications: 'Оғози хабар',
      aiAnalytics: 'Анализи AI'
    },
    dashboard: {
      revenue: 'Даромадҳо',
      deductions: 'Баҳси даромадҳо',
      payouts: 'Пардохти шуда',
      tax: 'Андоз',
      costs: 'Хароҷот',
      expenses: 'Сарфҳо',
      profit: 'Фоида',
      orders: 'Сафариш',
      trending: 'Нисбат ба ҳафтаи қаблӣ'
    },
    products: {
      title: 'Маҳсулот',
      search: 'Ҷустуҷӯ бо номи ё SKU',
      name: 'Номи маҳсул',
      sku: 'SKU',
      stock: 'Захираҳо',
      price: 'Нарх',
      sales: 'Фурӯшҳо',
      revenue: 'Даромадҳо',
      rating: 'Дараҷа',
      edit: 'Муқаррир кунед',
      delete: 'Ҳазф кунед',
      lowStock: 'Захираҳои паст'
    },
    costPrice: {
      title: 'Нархи Нараўақ ва Фоида',
      avgMargin: 'Фоидаи миёна',
      totalMargin: 'Фоидаи ҷами',
      monthlyProfit: 'Фоидаи моҳона',
      categories: 'Дар категорияҳо',
      category: 'Категория',
      count: 'Шумора',
      marginPercent: 'Фоида %',
      monthProfit: 'Фоида/моҳ'
    },
    deductions: {
      title: 'Баҳс',
      total: 'Баҳси ҷами',
      commission: 'Комиссия',
      logistics: 'Логистика',
      returns: 'Баргаштҳо',
      penalties: 'Ҷариматҳо',
      active: 'Фаъол',
      resolved: 'Ҳалшуда'
    },
    payouts: {
      title: 'Пардохти',
      paid: 'Пардохти шуда',
      inTransit: 'Дар роҳ',
      nextPayout: 'Пардохти навбатӣ',
      daysUntil: 'рӯзҳо',
      expectedAmount: 'Сумми мутавақҳо',
      bankDetails: 'Маълумоти бонк',
      download: 'Боргирӣ Гузориш'
    },
    settings: {
      title: 'Танзимот',
      profile: 'Профил',
      language: 'Забони интерфейс',
      apiTokens: 'Аламҳо API',
      bankDetails: 'Маълумоти бонк',
      notifications: 'Оғози хабар',
      dangerZone: 'Соҳаи хатарнок',
      firstName: 'Номи аввал',
      lastName: 'Номи охирин',
      email: 'Почтаи электронӣ',
      phone: 'Телефон',
      company: 'Ширкат',
      edit: 'Муқаррир кунед',
      save: 'Сохтани',
      cancel: 'Бекор',
      saved: 'Сохташуда',
      bank: 'Номи бонк',
      bik: 'BIK',
      inn: 'INN',
      kpp: 'KPP',
      account: 'Рақами ҳисоб',
      emailNotif: 'Оғози почтаи электронӣ',
      telegramNotif: 'Оғози Telegram',
      lowStock: 'Захираҳои паст',
      newOrders: 'Сафариши нав',
      payoutNotif: 'Оғози пардохт',
      reviewsNotif: 'Шарҳи ва ҷаҳӣ',
      testToken: 'Торе кунед Аламро',
      deleteAccount: 'Ҳисоб ҳазф кунед'
    }
  }
}

// React Hook для использования переводов
export const useTranslations = (language: Language) => {
  return translations[language]
}

// Функция для форматирования чисел по языку
export const formatNumber = (num: number, language: Language): string => {
  if (language === 'ru') {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  } else if (language === 'zh') {
    return num.toString()
  } else if (language === 'tg') {
    return num.toString()
  } else {
    return num.toLocaleString('en-US')
  }
}

// Функция для форматирования денег по языку
export const formatCurrency = (amount: number, language: Language): string => {
  const formatted = formatNumber(amount, language)
  if (language === 'ru') {
    return `${formatted} ₽`
  } else if (language === 'zh') {
    return `¥${formatted}`
  } else if (language === 'tg') {
    return `${formatted} сўм`
  } else {
    return `$${formatted}`
  }
}

// Функция для форматирования дат по языку
export const formatDate = (date: Date | string, language: Language): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }

  if (language === 'ru') {
    return dateObj.toLocaleDateString('ru-RU', options)
  } else if (language === 'en') {
    return dateObj.toLocaleDateString('en-US', options)
  } else if (language === 'zh') {
    return dateObj.toLocaleDateString('zh-CN', options)
  } else if (language === 'tg') {
    return dateObj.toLocaleDateString('tg-TJ', options)
  }
  
  return dateObj.toLocaleDateString()
}
