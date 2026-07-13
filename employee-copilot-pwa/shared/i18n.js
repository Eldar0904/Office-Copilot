/* Employee Copilot — i18n (internationalisation)
   Supports: en (English), kk (Kazakh), ru (Russian)
   Load AFTER data.js, BEFORE app.js in each app.
   Exposes: window.CopilotI18n  */
(function () {
  'use strict';

  var LANG_KEY = 'copilot_lang';

  /* ═══════════════════════════════════════════════════════════════
     UI STRINGS
  ═══════════════════════════════════════════════════════════════ */
  var UI = {
    en: {
      /* nav */
      nav_tasks: 'Tasks',
      nav_today: 'Today',
      nav_week: 'This Week',
      nav_channels: 'Channels',
      nav_dms: 'Direct Messages',

      /* tabs (PWA) */
      tab_today: 'Today',
      tab_week: 'Week',
      tab_messages: 'Messages',
      tab_me: 'Me',

      /* topbar / chat */
      dept_channel: 'Dept. channel',
      online: 'Online',
      message_placeholder: 'Message',
      search_placeholder: 'Search tasks & messages…',
      reply_placeholder: 'Reply in thread…',
      voice_title: 'Voice message',
      recording: 'Recording',
      attach_file: 'Attach file',
      send: 'Send',

      /* thread */
      thread_title: 'Thread',
      reply_one: 'reply',
      reply_many: 'replies',

      /* copilot button */
      copilot_btn: 'Copilot',

      /* profile stats */
      stat_done: 'Done',
      stat_pending: 'Pending',
      stat_week: 'Week',

      /* today / hero */
      greeting_morning: 'Good morning',
      greeting_afternoon: 'Good afternoon',
      greeting_evening: 'Good evening',
      all_done_msg: "You've cleared your plate for today. Excellent work!",
      urgent_msg: '{n} task left, {u} high priority. Tackle those first.',
      urgent_msg_pl: '{n} tasks left, {u} high priority. Tackle those first.',
      ontrack_msg: '{n} task remaining. You\'re on track.',
      ontrack_msg_pl: '{n} tasks remaining. You\'re on track.',
      chip_done: 'done',
      chip_pending: 'pending',
      chip_urgent: 'urgent',
      top_priority: '🔴 Top Priority',
      other_tasks: 'Other tasks',
      todays_tasks: "Today's tasks",
      add_task: 'Add a task',
      add_channel: 'Add a channel',
      add_task_placeholder: 'Add a task for today…',
      add_btn: 'Add',
      cancel_btn: 'Cancel',
      no_tasks_day: 'No tasks for this day',
      this_week: 'This week',
      week_done_suffix: 'done',

      /* task detail */
      due_prefix: 'Due',
      priority_suffix: 'priority',
      mark_done: 'Mark as Done',
      mark_pending: 'Mark as Pending',

      /* swipe hints */
      swipe_defer: 'Defer',
      swipe_done: 'Done',
      swipe_undo: 'Undo',
      priority_badge: '✦ Priority',

      /* dept names */
      dept_Finance: 'Finance',
      dept_Engineering: 'Engineering',
      dept_HR: 'HR',
      dept_PMO: 'PMO',
      dept_Sales: 'Sales',
      dept_Design: 'Design',
      dept_IT: 'IT',

      /* AI panel */
      ai_briefing_title: "Today's Briefing",
      ai_task_done_one: 'task done today',
      ai_task_done_many: 'tasks done today',
      ai_urgent_one: 'high priority task pending',
      ai_urgent_many: 'high priority tasks pending',
      ai_scheduled_one: 'task scheduled today',
      ai_scheduled_many: 'tasks scheduled today',
      ai_suggested_title: 'Suggested Focus',
      ai_go_task: 'Go to task',
      ai_draft_title: 'Draft a Message',
      ai_draft_placeholder: 'e.g. tell finance the budget report is ready…',
      ai_generate: 'Generate',
      ai_generating: 'Generating…',
      ai_copy: 'Copy',
      ai_copied: 'Copied!',
      ai_send_chat: 'Send to chat',
      ai_quick_title: 'Quick Actions',
      ai_action_summarise: 'Summarise today',
      ai_action_urgent: 'Show urgent',
      ai_action_draft: 'Draft update',
      ai_action_week: 'Week overview',

      /* settings */
      setting_notifications: 'Notifications',
      setting_privacy: 'Privacy & Security',
      setting_appearance: 'Appearance',
      setting_help: 'Help & Support',

      /* language switcher */
      lang_label: 'Language',

      /* quick add (web) */
      quick_add_placeholder: 'New task…',

      /* agent / voice */
      tab_assistant: 'Assistant',
      tab_voice_agent: '🎙️ Voice Agent',
      agent_tap_speak: 'Tap to speak',
      agent_listening: 'Listening…',
      agent_thinking: 'Thinking…',
      agent_speaking: 'Speaking…',
      agent_type_placeholder: 'Or type a request…',

      /* notifications */
      notif_title: 'Notifications',
      notif_clear: 'Clear all',
      notif_empty: 'No notifications',

      /* create channel */
      create_channel_title: 'Create a Channel',
      create_channel_name: 'Channel name',
      create_channel_emoji: 'Emoji (optional)',
      create_channel_submit: 'Create Channel',

      /* thread */
      thread_tap_reply: 'Reply in thread…',

      /* topbar */
      topbar_today: 'Today',
      topbar_week: 'This Week',
    },

    kk: {
      /* nav */
      nav_tasks: 'Тапсырмалар',
      nav_today: 'Бүгін',
      nav_week: 'Осы апта',
      nav_channels: 'Арналар',
      nav_dms: 'Тікелей хабарлар',

      /* tabs (PWA) */
      tab_today: 'Бүгін',
      tab_week: 'Апта',
      tab_messages: 'Хабарлар',
      tab_me: 'Мен',

      /* topbar / chat */
      dept_channel: 'Бөлім арнасы',
      online: 'Желіде',
      message_placeholder: 'Хабар жазу',
      search_placeholder: 'Тапсырмалар мен хабарларды іздеу…',
      reply_placeholder: 'Жіпке жауап беру…',
      voice_title: 'Дауыстық хабар',
      recording: 'Жазба',
      attach_file: 'Файл тіркеу',
      send: 'Жіберу',

      /* thread */
      thread_title: 'Жіп',
      reply_one: 'жауап',
      reply_many: 'жауап',

      /* copilot button */
      copilot_btn: 'Көмекші',

      /* profile stats */
      stat_done: 'Аяқталды',
      stat_pending: 'Күтуде',
      stat_week: 'Апта',

      /* today / hero */
      greeting_morning: 'Қайырлы таң',
      greeting_afternoon: 'Қайырлы күн',
      greeting_evening: 'Қайырлы кеш',
      all_done_msg: 'Бүгінгі барлық тапсырмаларыңызды орындадыңыз. Керемет жұмыс!',
      urgent_msg: '{n} тапсырма қалды, {u} жоғары басымдықты. Оларды бірінші орында шешіңіз.',
      urgent_msg_pl: '{n} тапсырма қалды, {u} жоғары басымдықты. Оларды бірінші орында шешіңіз.',
      ontrack_msg: '{n} тапсырма қалды. Сіз дұрыс жолдасыз.',
      ontrack_msg_pl: '{n} тапсырма қалды. Сіз дұрыс жолдасыз.',
      chip_done: 'аяқталды',
      chip_pending: 'күтуде',
      chip_urgent: 'шұғыл',
      top_priority: '🔴 Жоғары басымдық',
      other_tasks: 'Басқа тапсырмалар',
      todays_tasks: 'Бүгінгі тапсырмалар',
      add_task: 'Тапсырма қосу',
      add_channel: 'Арна қосу',
      add_task_placeholder: 'Бүгінге тапсырма қосу…',
      add_btn: 'Қосу',
      cancel_btn: 'Болдырмау',
      no_tasks_day: 'Бұл күнге тапсырмалар жоқ',
      this_week: 'Осы апта',
      week_done_suffix: 'аяқталды',

      /* task detail */
      due_prefix: 'Мерзімі',
      priority_suffix: 'басымдық',
      mark_done: 'Орындалды деп белгілеу',
      mark_pending: 'Күтуде деп белгілеу',

      /* swipe hints */
      swipe_defer: 'Кейінге қалдыру',
      swipe_done: 'Аяқталды',
      swipe_undo: 'Болдырмау',
      priority_badge: '✦ Басымдық',

      /* dept names */
      dept_Finance: 'Қаржы',
      dept_Engineering: 'Инженерия',
      dept_HR: 'HR',
      dept_PMO: 'ЖБК',
      dept_Sales: 'Сату',
      dept_Design: 'Дизайн',
      dept_IT: 'АТ',

      /* AI panel */
      ai_briefing_title: 'Бүгінгі брифинг',
      ai_task_done_one: 'тапсырма орындалды',
      ai_task_done_many: 'тапсырма орындалды',
      ai_urgent_one: 'жоғары басымдықты тапсырма күтуде',
      ai_urgent_many: 'жоғары басымдықты тапсырма күтуде',
      ai_scheduled_one: 'тапсырма жоспарланды',
      ai_scheduled_many: 'тапсырма жоспарланды',
      ai_suggested_title: 'Ұсынылған фокус',
      ai_go_task: 'Тапсырмаға өту',
      ai_draft_title: 'Хабар жасау',
      ai_draft_placeholder: 'мысалы, қаржыға бюджет есебі дайын екенін хабарлаңыз…',
      ai_generate: 'Жасау',
      ai_generating: 'Жасалуда…',
      ai_copy: 'Көшіру',
      ai_copied: 'Көшірілді!',
      ai_send_chat: 'Чатқа жіберу',
      ai_quick_title: 'Жылдам әрекеттер',
      ai_action_summarise: 'Бүгінді қорытындылау',
      ai_action_urgent: 'Шұғылдарды көрсету',
      ai_action_draft: 'Жаңарту жасау',
      ai_action_week: 'Апта шолуы',

      /* settings */
      setting_notifications: 'Хабарландырулар',
      setting_privacy: 'Құпиялылық және қауіпсіздік',
      setting_appearance: 'Сыртқы түрі',
      setting_help: 'Анықтама және қолдау',

      /* language switcher */
      lang_label: 'Тіл',

      /* quick add (web) */
      quick_add_placeholder: 'Жаңа тапсырма…',

      /* agent / voice */
      tab_assistant: 'Көмекші',
      tab_voice_agent: '🎙️ Дауыс агенті',
      agent_tap_speak: 'Сөйлеу үшін түртіңіз',
      agent_listening: 'Тыңдауда…',
      agent_thinking: 'Ойлауда…',
      agent_speaking: 'Сөйлеуде…',
      agent_type_placeholder: 'Немесе сұрауды теріңіз…',

      /* notifications */
      notif_title: 'Хабарламалар',
      notif_clear: 'Барлығын тазалау',
      notif_empty: 'Хабарламалар жоқ',

      /* create channel */
      create_channel_title: 'Арна құру',
      create_channel_name: 'Арна атауы',
      create_channel_emoji: 'Эмодзи (міндетті емес)',
      create_channel_submit: 'Арна құру',

      /* thread */
      thread_tap_reply: 'Тармаққа жауап беру…',

      /* topbar */
      topbar_today: 'Бүгін',
      topbar_week: 'Осы апта',
    },

    ru: {
      /* nav */
      nav_tasks: 'Задачи',
      nav_today: 'Сегодня',
      nav_week: 'Эта неделя',
      nav_channels: 'Каналы',
      nav_dms: 'Личные сообщения',

      /* tabs (PWA) */
      tab_today: 'Сегодня',
      tab_week: 'Неделя',
      tab_messages: 'Сообщения',
      tab_me: 'Я',

      /* topbar / chat */
      dept_channel: 'Канал отдела',
      online: 'В сети',
      message_placeholder: 'Написать',
      search_placeholder: 'Поиск задач и сообщений…',
      reply_placeholder: 'Ответить в треде…',
      voice_title: 'Голосовое сообщение',
      recording: 'Запись',
      attach_file: 'Прикрепить файл',
      send: 'Отправить',

      /* thread */
      thread_title: 'Тред',
      reply_one: 'ответ',
      reply_many: 'ответов',

      /* copilot button */
      copilot_btn: 'Помощник',

      /* profile stats */
      stat_done: 'Готово',
      stat_pending: 'В работе',
      stat_week: 'Неделя',

      /* today / hero */
      greeting_morning: 'Доброе утро',
      greeting_afternoon: 'Добрый день',
      greeting_evening: 'Добрый вечер',
      all_done_msg: 'Все задачи на сегодня выполнены. Отличная работа!',
      urgent_msg: 'Осталась {n} задача, {u} высокоприоритетная. Начните с неё.',
      urgent_msg_pl: 'Осталось {n} задачи, {u} высокоприоритетных. Начните с них.',
      ontrack_msg: 'Осталась {n} задача. Всё по плану.',
      ontrack_msg_pl: 'Осталось {n} задачи. Всё по плану.',
      chip_done: 'готово',
      chip_pending: 'в работе',
      chip_urgent: 'срочно',
      top_priority: '🔴 Приоритет',
      other_tasks: 'Другие задачи',
      todays_tasks: 'Задачи на сегодня',
      add_task: 'Добавить задачу',
      add_channel: 'Добавить канал',
      add_task_placeholder: 'Добавить задачу на сегодня…',
      add_btn: 'Добавить',
      cancel_btn: 'Отмена',
      no_tasks_day: 'На этот день задач нет',
      this_week: 'Эта неделя',
      week_done_suffix: 'выполнено',

      /* task detail */
      due_prefix: 'Срок',
      priority_suffix: 'приоритет',
      mark_done: 'Отметить выполненной',
      mark_pending: 'Вернуть в работу',

      /* swipe hints */
      swipe_defer: 'Отложить',
      swipe_done: 'Готово',
      swipe_undo: 'Отменить',
      priority_badge: '✦ Приоритет',

      /* dept names */
      dept_Finance: 'Финансы',
      dept_Engineering: 'Разработка',
      dept_HR: 'HR',
      dept_PMO: 'ПМО',
      dept_Sales: 'Продажи',
      dept_Design: 'Дизайн',
      dept_IT: 'ИТ',

      /* AI panel */
      ai_briefing_title: 'Сводка на сегодня',
      ai_task_done_one: 'задача выполнена',
      ai_task_done_many: 'задачи выполнено',
      ai_urgent_one: 'срочная задача ожидает',
      ai_urgent_many: 'срочных задачи ожидают',
      ai_scheduled_one: 'задача запланирована',
      ai_scheduled_many: 'задачи запланировано',
      ai_suggested_title: 'Рекомендуемый фокус',
      ai_go_task: 'Перейти к задаче',
      ai_draft_title: 'Составить сообщение',
      ai_draft_placeholder: 'напр., сообщите финансам, что отчёт по бюджету готов…',
      ai_generate: 'Создать',
      ai_generating: 'Создаю…',
      ai_copy: 'Копировать',
      ai_copied: 'Скопировано!',
      ai_send_chat: 'Отправить в чат',
      ai_quick_title: 'Быстрые действия',
      ai_action_summarise: 'Итоги дня',
      ai_action_urgent: 'Срочные задачи',
      ai_action_draft: 'Написать обновление',
      ai_action_week: 'Обзор недели',

      /* settings */
      setting_notifications: 'Уведомления',
      setting_privacy: 'Конфиденциальность и безопасность',
      setting_appearance: 'Внешний вид',
      setting_help: 'Помощь и поддержка',

      /* language switcher */
      lang_label: 'Язык',

      /* quick add (web) */
      quick_add_placeholder: 'Новая задача…',

      /* agent / voice */
      tab_assistant: 'Ассистент',
      tab_voice_agent: '🎙️ Голосовой агент',
      agent_tap_speak: 'Нажмите, чтобы говорить',
      agent_listening: 'Слушаю…',
      agent_thinking: 'Думаю…',
      agent_speaking: 'Говорю…',
      agent_type_placeholder: 'Или введите запрос…',

      /* notifications */
      notif_title: 'Уведомления',
      notif_clear: 'Очистить всё',
      notif_empty: 'Нет уведомлений',

      /* create channel */
      create_channel_title: 'Создать канал',
      create_channel_name: 'Название канала',
      create_channel_emoji: 'Эмодзи (необязательно)',
      create_channel_submit: 'Создать канал',

      /* thread */
      thread_tap_reply: 'Ответить в ветке…',

      /* topbar */
      topbar_today: 'Сегодня',
      topbar_week: 'Эта неделя',
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     DATE / CALENDAR TRANSLATIONS
  ═══════════════════════════════════════════════════════════════ */
  var DATES = {
    en: {
      day_letters:   ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      weekday_full:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      weekday_short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      months_full:   ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      months_short:  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    kk: {
      day_letters:   ['Д', 'С', 'С', 'Б', 'Ж', 'С', 'Ж'],
      weekday_full:  ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'],
      weekday_short: ['Дүй', 'Сей', 'Сәр', 'Бей', 'Жұм', 'Сен', 'Жек'],
      months_full:   ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'],
      months_short:  ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел']
    },
    ru: {
      day_letters:   ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'],
      weekday_full:  ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
      weekday_short: ['Пон', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      months_full:   ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      months_short:  ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     MOCK DATA TRANSLATIONS
     Keys match data.js IDs exactly.
  ═══════════════════════════════════════════════════════════════ */

  /* Task titles */
  var TASK_TITLES = {
    1:  { kk: 'Q3 бюджет есебін қарау',              ru: 'Проверить отчёт по бюджету Q3' },
    2:  { kk: 'Команда стендапы — Инженерия',        ru: 'Стендап команды — Разработка' },
    3:  { kk: 'HR адаптация хатына жауап беру',      ru: 'Ответить на меморандум HR' },
    4:  { kk: 'Жоба кестесі слайдтарын жаңарту',    ru: 'Обновить слайды с графиком проекта' },
    5:  { kk: 'Клиент қоңырауы — Acme Corp',        ru: 'Звонок с клиентом — Acme Corp' },
    6:  { kk: 'Спринт жоспарлау сессиясы',          ru: 'Сессия планирования спринта' },
    7:  { kk: 'UX командасымен дизайн тексеру',     ru: 'Обзор дизайна с командой UX' },
    8:  { kk: 'Жеткізуші келісімшартын бекіту',     ru: 'Утверждение договора с поставщиком' },
    9:  { kk: 'Ай сайынғы жалпы жиналыс дайындығы',ru: 'Подготовка к ежемесячному совещанию' },
    10: { kk: 'Жұмыс тиімділігін бағалауды бастау', ru: 'Запуск оценки эффективности' },
    11: { kk: 'Өнім жол картасын ұсыну',            ru: 'Презентация дорожной карты продукта' },
    12: { kk: 'АТ қауіпсіздік оқытуы',              ru: 'Тренинг по IT-безопасности' }
  };

  /* Channel last messages */
  var CHANNEL_LASTMSGS = {
    ch1: { kk: 'Жалпы жиналыс жұма күні 15:00-де — күнтізбеге белгілеңіз!', ru: 'Общее совещание в пятницу в 15:00 — отметьте в календаре!' },
    ch2: { kk: 'Бүгін аутентификация модуліне PR тексеру қажет',             ru: 'Сегодня нужен PR-ревью модуля аутентификации' },
    ch3: { kk: 'Q3 бюджет есептері бүгін жұмыс күні соңына дейін',          ru: 'Отчёты по бюджету Q3 нужны до конца рабочего дня' },
    ch4: { kk: 'Жаңа адаптация материалдары тексеруге дайын',               ru: 'Новые материалы для адаптации готовы к проверке' },
    ch5: { kk: 'Жоба күй жаңартуы ортақ дискіге жіберілді',                 ru: 'Обновление статуса проекта опубликовано на общем диске' }
  };

  /* DM last messages */
  var DM_LASTMSGS = {
    dm1: { kk: 'Q3 презентациясын тексердіңіз бе?',              ru: 'Вы просмотрели колоду Q3?' },
    dm2: { kk: '14:00-дегі дизайн қоңырауға қоса аласыз ба?',   ru: 'Можете присоединиться к дизайн-звонку в 14:00?' },
    dm3: { kk: 'Жылдам жауапты рахмет!',                        ru: 'Спасибо за быстрый ответ!' },
    dm4: { kk: 'Жеткізуші ұсынысы жақсы көрінеді.',             ru: 'Предложение поставщика выглядит хорошо.' }
  };

  /* DM role titles */
  var DM_ROLES = {
    dm1: { kk: 'Инженерия менеджері',     ru: 'Менеджер по разработке' },
    dm2: { kk: 'UX Дизайнер',            ru: 'UX Дизайнер' },
    dm3: { kk: 'Қаржы жетекшісі',        ru: 'Руководитель финансов' },
    dm4: { kk: 'HR іскери серіктес',      ru: 'HR бизнес-партнёр' }
  };

  /* Chat messages — keyed by chatId then msgId */
  var CHAT_MSGS = {
    ch1: {
      1: { kk: 'Қайырлы таң! Жалпы жиналыс жұма күні 15:00-де.', ru: 'Доброе утро! Общее совещание в пятницу в 15:00.' },
      2: { kk: 'Белгіледім! Жазба болады ма?',                    ru: 'Отметила! Будет ли запись?' },
      3: { kk: 'Иә, кейін дискіге жіберіледі.',                   ru: 'Да, потом загрузим на диск.' }
    },
    ch2: {
      1: { kk: 'PR тексеру қажет — аутентификация модулі.',       ru: 'Нужен PR-ревью — модуль аутентификации.' },
      2: { kk: 'Стендаптан кейін қарайын!',                      ru: 'Займусь после стендапа!' },
      3: { kk: 'Жадқа комментарийлер қалдырдым.',                ru: 'Уже оставила комментарии, Джад.' },
      4: { kk: 'Рахмет екеуіңе! Түскі асқа дейін шешемін.',      ru: 'Спасибо обоим! Разберусь до полудня.' },
      5: { kk: 'Өзгертулер керемет — мақұлданды!',               ru: 'Изменения отличные — одобрено!' }
    },
    ch3: {
      1: { kk: 'Q3 бюджет есептері бүгін жұмыс соңына дейін.',   ru: 'Отчёты Q3 нужны до конца рабочего дня сегодня.' },
      2: { kk: 'PMO есебі тапсырылды.',                          ru: 'Отчёт PMO отправлен.' }
    },
    ch4: {
      1: { kk: 'Жаңа адаптация материалдары дайын. Пікірлер бейсенбіге дейін.', ru: 'Новые материалы готовы. Отзывы — до четверга.' }
    },
    ch5: {
      1: { kk: 'Күй жаңартуы жіберілді. Барлық кезеңдер кестеде.', ru: 'Обновление статуса опубликовано. Все этапы по плану.' },
      2: { kk: 'Жақсы жұмыс! Спринт кестеден алда.',              ru: 'Отличная работа! Спринт опережает график.' }
    },
    dm1: {
      1: { kk: 'Қайырлы таң! Спринт кестесіне жылдам жаңарту?', ru: 'Доброе утро! Быстрое обновление по графику спринта?' },
      2: { kk: 'Кестеде. Презентация жұмыс соңына дейін дайын.', ru: 'По плану. Презентация будет готова до конца дня.' },
      3: { kk: 'Q3 презентациясын тексердіңіз бе?',             ru: 'Вы просмотрели колоду Q3?' }
    },
    dm2: {
      1: { kk: 'Тексеруге жаңа адаптация процесін жіберіп жатырмын.', ru: 'Делюсь новым процессом адаптации для проверки.' },
      2: { kk: 'Жаңа навигация ұнады! Әлдеқайда таза.',               ru: 'Нравится новая навигация! Намного чище.' },
      3: { kk: '14:00-дегі дизайн қоңырауға қоса аласыз ба?',         ru: 'Можете присоединиться к дизайн-звонку в 14:00?' }
    },
    dm3: {
      1: { kk: 'Бюджет тапсырылды. Қажет болса хабарлаңыз.', ru: 'Бюджет отправлен. Сообщите, если нужно.' },
      2: { kk: 'Жылдам жауапты рахмет!',                     ru: 'Спасибо за быстрый ответ!' }
    },
    dm4: {
      1: { kk: 'Жеткізуші ұсынысын тексердім — берік.',      ru: 'Просмотрела предложение поставщика — выглядит надёжно.' },
      2: { kk: 'Жеткізуші ұсынысы жақсы.',                   ru: 'Предложение поставщика выглядит хорошо.' }
    }
  };

  /* Thread messages */
  var THREAD_MSGS = {
    'ch1:1': {
      101: { kk: 'Қашықтан жұмыс жасаушылар үшін кіру сілтемесі болады ма?', ru: 'Будет ли ссылка для подключения для удалённых сотрудников?' },
      102: { kk: 'Иә — Zoom сілтемесі 15 минуттан кейін жіберіледі.',         ru: 'Да — ссылка Zoom будет отправлена через 15 минут.' },
      103: { kk: 'Тамаша, рахмет Тариқ!',                                     ru: 'Отлично, спасибо Тарик!' }
    },
    'ch2:1': {
      201: { kk: 'Қандай тармақтан алуым керек?',                          ru: 'С какой ветки мне нужно сделать pull?' },
      202: { kk: 'feature/auth-refactor — барлық соңғы коммиттер осында.', ru: 'feature/auth-refactor — здесь все последние коммиты.' }
    },
    'ch5:1': {
      501: { kk: 'Қандай кезең қауіп астында?',                            ru: 'Какой этап под угрозой?' },
      502: { kk: 'Қазір ешқайсысы жоқ — біз 2-фазада 2 күн алда.',        ru: 'Пока ни один — мы опережаем 2-ю фазу на 2 дня.' }
    }
  };

  /* Settings labels */
  var SETTINGS_LABELS = {
    'Notifications':     { kk: 'Хабарландырулар',              ru: 'Уведомления' },
    'Privacy & Security':{ kk: 'Құпиялылық және қауіпсіздік', ru: 'Конфиденциальность и безопасность' },
    'Appearance':        { kk: 'Сыртқы түрі',                  ru: 'Внешний вид' },
    'Help & Support':    { kk: 'Анықтама және қолдау',         ru: 'Помощь и поддержка' }
  };

  /* ═══════════════════════════════════════════════════════════════
     AI DRAFT TEMPLATES (translated)
  ═══════════════════════════════════════════════════════════════ */
  var AI_DRAFTS_I18N = {
    en: {
      budget:   'Hi team, just a heads-up that the Q3 budget report is complete and ready for your review. Please take a look when you get a chance.',
      standup:  "Good morning team! Here's our quick standup update: work is progressing well, blockers are being handled, and we're on track for sprint goals.",
      deadline: 'Hi everyone, a reminder that the deadline is approaching. Please ensure your deliverables are submitted on time. Reach out if you need support.',
      meeting:  "Hi team, I'd like to schedule a quick sync to align on priorities and next steps. Could you share your availability for this week?",
      default:  'Hi team, wanted to share a quick update on our progress. Things are moving forward well. Will share more details in our next sync.'
    },
    kk: {
      budget:   'Сәлем, команда! Q3 бюджет есебі аяқталды және тексеруге дайын. Мүмкіндік болғанда қарауыңызды сұраймын.',
      standup:  'Қайырлы таң, команда! Жылдам стендап жаңартуы: жұмыс жақсы жүруде, кедергілер шешілуде, спринт мақсаттары кестеде.',
      deadline: 'Сәлем, барлығы! Мерзім жақындап жатқанын еске саламын. Тапсырмаларыңызды уақытында тапсыруыңызды сұраймын. Көмек керек болса хабарласыңыз.',
      meeting:  'Сәлем, команда! Басымдықтар мен келесі қадамдарды келісу үшін қысқа кездесу өткізгім келеді. Осы аптадағы бос уақытыңызды жіберіңіз.',
      default:  'Сәлем, команда! Жұмысымыздың жылдам жаңартуын жеткізгім келді. Барлығы жақсы дамуда. Толығырақ ақпаратты келесі кездесуде беремін.'
    },
    ru: {
      budget:   'Привет, команда! Отчёт по бюджету Q3 готов и доступен для проверки. Пожалуйста, ознакомьтесь при первой возможности.',
      standup:  'Доброе утро, команда! Краткое обновление по стендапу: работа идёт хорошо, блокеры решаются, мы укладываемся в цели спринта.',
      deadline: 'Всем привет, напоминаю, что дедлайн приближается. Пожалуйста, убедитесь, что ваши задачи выполнены в срок. Обращайтесь, если нужна помощь.',
      meeting:  'Привет, команда! Хочу организовать короткую встречу для согласования приоритетов и следующих шагов. Поделитесь своей доступностью на этой неделе.',
      default:  'Привет, команда! Хочу поделиться кратким обновлением о нашем прогрессе. Всё движется хорошо. Подробности — на следующей встрече.'
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     CORE i18n ENGINE
  ═══════════════════════════════════════════════════════════════ */

  var _lang = 'en';

  /* Load persisted language */
  try {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored && (stored === 'en' || stored === 'kk' || stored === 'ru')) _lang = stored;
  } catch (e) {}

  function t(key) {
    var strings = UI[_lang] || UI.en;
    return strings[key] !== undefined ? strings[key] : (UI.en[key] || key);
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'kk' && lang !== 'ru') return;
    _lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    /* Notify apps to re-render */
    if (typeof window.copilotRerender === 'function') window.copilotRerender();
  }

  function getLang() { return _lang; }

  /* Get dates object for current language */
  function dates() { return DATES[_lang] || DATES.en; }

  /* Translate a task title */
  function taskTitle(task) {
    if (_lang === 'en') return task.title;
    var tr = TASK_TITLES[task.id];
    return (tr && tr[_lang]) ? tr[_lang] : task.title;
  }

  /* Translate dept name */
  function dept(deptName) {
    var key = 'dept_' + deptName;
    return t(key) !== key ? t(key) : deptName;
  }

  /* Translate channel last message */
  function channelLastMsg(ch) {
    if (_lang === 'en') return ch.lastMsg;
    var tr = CHANNEL_LASTMSGS[ch.id];
    return (tr && tr[_lang]) ? tr[_lang] : ch.lastMsg;
  }

  /* Translate DM last message */
  fun