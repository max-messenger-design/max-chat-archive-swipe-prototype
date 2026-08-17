(function () {
  const body = document.body;
  const screen = body.dataset.screen || "list";
  const app = document.getElementById("app");
  const params = new URLSearchParams(window.location.search);
  const storagePrefix = "max-chat-archive-swipe:";

  const state = {
    get(key, fallback = null) {
      try {
        const value = window.localStorage.getItem(`${storagePrefix}${key}`);
        return value === null ? fallback : value;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(`${storagePrefix}${key}`, String(value));
      } catch (_) {
        // The prototype still works if browser storage is unavailable.
      }
    }
  };

  let archiveHidden = params.has("archiveHidden")
    ? params.get("archiveHidden") === "1"
    : state.get("archive-hidden", "false") === "true";
  const isArchiveHidden = () => archiveHidden;
  const setArchiveHidden = (hidden) => {
    archiveHidden = hidden;
    state.set("archive-hidden", hidden);
  };

  if (screen === "hidden" && !params.has("archiveHidden")) {
    setArchiveHidden(true);
  }

  const archiveVerified = `
    <span class="verified archive-verified" aria-label="Верифицирован">
      <img src="assets/archive-verified-bg.svg" alt="">
      <img src="assets/archive-verified-check.svg" alt="">
    </span>`;

  const archiveChats = [
    {
      avatar: '<img class="archived-avatar" src="assets/archive-papa.png" alt="">',
      name: "Папа",
      time: "14:30",
      preview: "Собираемся завтра в 16:30",
      count: "2"
    },
    {
      avatar: '<img class="archived-avatar" src="assets/archive-alexandra.png" alt="">',
      name: "Александра Миронова",
      time: "12:41",
      preview: '<span class="archive-video"><img src="assets/archive-video.png" alt=""><span></span><img src="assets/archive-play.svg" alt=""></span>Видеосообщение'
    },
    {
      avatar: '<span class="archived-avatar initials-avatar"><img src="assets/archive-victoria-bg.svg" alt=""><span>ВГ</span></span>',
      name: "Виктория Горина",
      time: "08:30",
      status: '<img class="archive-read-status" src="assets/archive-read.svg" alt="Прочитано">',
      preview: '<img class="archive-preview-icon" src="assets/archive-mic.svg" alt="">Голосовое сообщение'
    },
    {
      avatar: '<img class="archived-avatar" src="assets/archive-gigachat.png" alt="">',
      name: "GigaChat",
      verified: true,
      time: "07:41",
      preview: '<span class="archive-photo"><img src="assets/archive-photo.png" alt=""></span>Рисуйте изображения с русским<br>текстом. Открытки, логотипы или постеры с собственными надписями.'
    }
  ];

  const renderArchiveRows = () => archiveChats.map((chat) => `
    <div class="archived-chat-row">
      <div class="archived-avatar-wrap">${chat.avatar}</div>
      <div class="archived-chat-content">
        <div class="archived-chat-head">
          <div class="archived-chat-name">${chat.name}${chat.verified ? archiveVerified : ""}</div>
          <div class="archived-chat-time">${chat.status || ""}${chat.time}</div>
        </div>
        <div class="archived-chat-preview ${chat.preview.includes("<br>") ? "" : "one-line"}">
          <span>${chat.preview}</span>
          ${chat.count ? `<span class="counter blue">${chat.count}</span>` : ""}
        </div>
      </div>
    </div>`).join("");

  const archiveFrom = () => {
    const from = params.get("from") || state.get("archive-from");
    return from === "list" || from === "hidden" || from === "settings"
      ? from
      : (isArchiveHidden() ? "hidden" : "list");
  };

  const archiveUrl = (fileName) => `${fileName}?from=${archiveFrom()}&archiveHidden=${isArchiveHidden() ? "1" : "0"}`;

  function returnFromArchive() {
    if (archiveFrom() === "settings") {
      window.location.href = `09-settings.html?archiveHidden=${isArchiveHidden() ? "1" : "0"}`;
      return;
    }
    window.location.href = isArchiveHidden()
      ? "03-archive-hidden.html?from=archive&archiveHidden=1"
      : "01-chat-list.html?from=archive&archiveHidden=0";
  }

  function enableArchiveReturnSwipe() {
    const phone = document.querySelector(".archive-return-phone");
    const list = document.querySelector("[data-archive-return-list]");
    const surface = document.querySelector("[data-archive-return-surface]");
    const preview = document.querySelector(".return-chat-preview");
    if (!phone || !list || !surface || !preview) return null;

    let gesture = null;
    let transitionTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionMs = reducedMotion ? 0 : 220;

    const setProgress = (distance, animate = false) => {
      const width = phone.getBoundingClientRect().width || 360;
      const x = Math.max(0, Math.min(distance, width));
      const progress = x / width;
      const duration = animate ? `${transitionMs}ms` : "0ms";
      surface.style.transitionDuration = duration;
      preview.style.transitionDuration = duration;
      surface.style.transform = `translate3d(${(-32 * progress).toFixed(2)}px, 0, 0) scale(${(1 - (0.015 * progress)).toFixed(4)})`;
      surface.style.opacity = String(1 - (0.22 * progress));
      preview.style.transform = `translate3d(${(width - x).toFixed(2)}px, 0, 0)`;
      preview.style.opacity = String(0.82 + (0.18 * progress));
      return { width, x };
    };

    const resetSwipe = () => {
      window.clearTimeout(transitionTimer);
      setProgress(0, true);
      phone.classList.remove("is-return-swiping");
      transitionTimer = window.setTimeout(() => {
        surface.removeAttribute("style");
        preview.removeAttribute("style");
      }, transitionMs + 10);
    };

    const closeArchive = (startDistance = 0) => {
      window.clearTimeout(transitionTimer);
      const { width } = setProgress(startDistance);
      phone.classList.add("is-return-swiping");
      window.requestAnimationFrame(() => setProgress(width, true));
      transitionTimer = window.setTimeout(() => {
        window.location.href = "03-archive-hidden.html?from=archive&archiveHidden=1";
      }, transitionMs + 5);
    };

    list.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      window.clearTimeout(transitionTimer);
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        distance: 0,
        axis: null
      };
    });

    list.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (!gesture.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dx < 0 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          gesture.axis = "horizontal";
          list.setPointerCapture?.(event.pointerId);
          phone.classList.add("is-return-swiping");
        } else {
          gesture.axis = "vertical";
          return;
        }
      }

      if (gesture.axis !== "horizontal") return;
      event.preventDefault();
      gesture.distance = Math.max(0, -dx);
      setProgress(gesture.distance);
    });

    const finishGesture = (event, cancelled = false) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const current = gesture;
      gesture = null;
      if (current.axis !== "horizontal") return;

      const elapsed = Math.max(1, performance.now() - current.startTime);
      const velocity = current.distance / elapsed;
      const width = phone.getBoundingClientRect().width || 360;
      const shouldClose = !cancelled && (
        current.distance >= Math.min(120, width * 0.34) ||
        (current.distance >= 48 && velocity >= 0.5)
      );

      if (shouldClose) closeArchive(current.distance);
      else resetSwipe();
    };

    list.addEventListener("pointerup", (event) => finishGesture(event));
    list.addEventListener("pointercancel", (event) => finishGesture(event, true));
    list.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "Escape") return;
      event.preventDefault();
      closeArchive();
    });

    return { closeArchive };
  }

  function renderArchive(showMenu) {
    const from = archiveFrom();
    const openedBySwipe = from === "hidden";
    state.set("archive-from", from);
    app.innerHTML = `
      <section class="phone archive-phone ${openedBySwipe ? "archive-return-phone" : ""}" aria-label="Архив">
        ${openedBySwipe ? `<section class="return-chat-preview" aria-hidden="true" inert>${hiddenChatPreviewMarkup()}</section>` : ""}
        <div class="archive-screen" data-archive-return-surface>
          <header class="archive-topbar">
            <div class="archive-header">
              <button class="archive-header-action archive-leading ${openedBySwipe ? "archive-close" : "archive-back"}" type="button" aria-label="${openedBySwipe ? "Закрыть архив" : "Назад"}">
                <img src="assets/${openedBySwipe ? "plus.svg" : "archive-back.svg"}" alt="">
              </button>
              <h1>Архив</h1>
              <button class="archive-header-action archive-more" type="button" aria-label="Меню архива" aria-expanded="${showMenu}">
                <img src="assets/archive-more.svg" alt="">
              </button>
            </div>
          </header>
          <main class="archive-chat-list" ${openedBySwipe && !showMenu ? 'data-archive-return-list tabindex="0" aria-label="Архив. Смахните влево, чтобы вернуться к чатам"' : ""}>${renderArchiveRows()}</main>
          ${showMenu ? `
            <button class="archive-menu-dismiss" type="button" aria-label="Закрыть меню"></button>
            <section class="archive-context-menu" aria-label="Меню архива">
              <button class="archive-menu-item" type="button" data-archive-read-all>
                <span class="archive-menu-icon"><img src="assets/icon-read-all.svg" alt=""></span><span>Прочитать всё</span>
              </button>
              <button class="archive-menu-item" type="button" data-archive-settings>
                <span class="archive-menu-icon"><img src="assets/icon-archive-settings.svg" alt=""></span><span>Настройки архива</span>
              </button>
            </section>` : ""}
        </div>
      </section>`;

    const returnSwipe = openedBySwipe && !showMenu ? enableArchiveReturnSwipe() : null;
    document.querySelector(".archive-leading")?.addEventListener("click", () => {
      if (returnSwipe) returnSwipe.closeArchive();
      else returnFromArchive();
    });
    document.querySelector(".archive-more")?.addEventListener("click", () => {
      window.location.href = showMenu ? archiveUrl("06-archive.html") : archiveUrl("07-archive-menu.html");
    });
    document.querySelector(".archive-menu-dismiss")?.addEventListener("click", () => {
      window.location.href = archiveUrl("06-archive.html");
    });
    document.querySelector("[data-archive-read-all]")?.addEventListener("click", () => {
      window.location.href = archiveUrl("06-archive.html");
    });
    document.querySelector("[data-archive-settings]")?.addEventListener("click", () => {
      window.location.href = archiveUrl("08-archive-settings.html");
    });
  }

  function switchMarkup(label, name, checked) {
    return `
      <button class="setting-card" type="button" role="switch" aria-checked="${checked}" data-setting="${name}">
        <span class="setting-label">${label}</span>
        <span class="setting-switch ${checked ? "is-on" : ""}" aria-hidden="true"><span></span></span>
      </button>`;
  }

  function renderArchiveSettings() {
    let keepChats = state.get("keep-archived", "true") === "true";
    let showArchive = !isArchiveHidden();

    const render = () => {
      app.innerHTML = `
        <section class="phone archive-settings-phone" aria-label="Настройки архива">
          <header class="archive-settings-header">
            <button class="archive-header-action archive-back settings-back" type="button" aria-label="Назад">
              <img src="assets/archive-back.svg" alt="">
            </button>
            <h1>Настройки архива</h1>
          </header>
          <main class="archive-settings-content">
            <section class="settings-group">
              <h2>Чаты</h2>
              <div class="setting-card-wrap">
                ${switchMarkup("Оставлять чаты в архиве", "keep", keepChats)}
              </div>
              <p class="settings-hint">Когда сообщение приходит в чат<br>с включёнными уведомлениями</p>
            </section>
            <section class="settings-group display-group">
              <h2>Отображение архива</h2>
              <div class="setting-card-wrap">
                ${switchMarkup("Показывать в списке чатов", "show", showArchive)}
              </div>
            </section>
          </main>
          <div class="settings-toast" role="status">Архив возвращён в список чатов</div>
        </section>`;

      document.querySelector(".settings-back")?.addEventListener("click", () => {
        window.location.href = archiveUrl("06-archive.html");
      });

      document.querySelector('[data-setting="keep"]')?.addEventListener("click", (event) => {
        keepChats = !keepChats;
        state.set("keep-archived", keepChats);
        updateSwitch(event.currentTarget, keepChats);
      });

      document.querySelector('[data-setting="show"]')?.addEventListener("click", (event) => {
        showArchive = !showArchive;
        setArchiveHidden(!showArchive);
        updateSwitch(event.currentTarget, showArchive);
        const toast = document.querySelector(".settings-toast");
        toast.textContent = showArchive ? "Архив возвращён в список чатов" : "Архив скрыт из списка чатов";
        toast.classList.add("is-visible");
        window.clearTimeout(toast.hideTimer);
        toast.hideTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2000);
      });
    };

    const updateSwitch = (control, checked) => {
      control.setAttribute("aria-checked", String(checked));
      control.querySelector(".setting-switch")?.classList.toggle("is-on", checked);
    };

    render();
  }

  function settingsMenuRow(label, icon, extra = "") {
    return `
      <button class="main-settings-row ${extra}" type="button" ${label === "Архив" ? "data-open-archive" : ""}>
        <span class="main-settings-row-icon"><img src="assets/${icon}" alt=""></span>
        <span class="main-settings-row-label">${label}</span>
        <img class="main-settings-chevron" src="assets/settings-chevron.svg" alt="">
      </button>`;
  }

  function renderSettings() {
    const chatsUrl = isArchiveHidden()
      ? "03-archive-hidden.html?archiveHidden=1"
      : "01-chat-list.html?archiveHidden=0";

    app.innerHTML = `
      <section class="phone main-settings-phone" aria-label="Настройки">
        <main class="main-settings-scroll">
          <section class="settings-profile" aria-label="Профиль">
            <button class="settings-profile-action profile-qr" type="button" aria-label="QR-код">
              <img src="assets/settings-qr.svg" alt="">
            </button>
            <button class="settings-profile-action profile-edit" type="button" aria-label="Редактировать профиль">
              <img src="assets/settings-edit.svg" alt="">
            </button>
            <img class="settings-profile-avatar" src="assets/settings-profile-avatar.png" alt="">
            <h1>Ирина Максимова</h1>
            <p>+7 901 888-12-24</p>
          </section>

          <div class="main-settings-content">
            <section class="main-settings-card sferum-card">
              <button class="main-settings-row main-settings-row-large" type="button">
                <span class="main-settings-row-icon sferum-icon"><img src="assets/settings-sferum-logo.png" alt=""></span>
                <span class="main-settings-row-label">Войти в Сферум</span>
                <img class="main-settings-chevron" src="assets/settings-chevron.svg" alt="">
              </button>
            </section>

            <section class="main-settings-card invite-card">
              <button class="main-settings-row main-settings-row-large" type="button">
                <span class="main-settings-row-icon"><img src="assets/settings-invite.svg" alt=""></span>
                <span class="main-settings-row-label invite-label">Пригласить друзей</span>
              </button>
            </section>

            <section class="main-settings-card">
              ${settingsMenuRow("Избранное", "settings-favorite.svg")}
              ${settingsMenuRow("Архив", "settings-archive.svg")}
            </section>

            <section class="main-settings-card">
              ${settingsMenuRow("Уведомления", "settings-notifications.svg")}
              ${settingsMenuRow("Приватность", "settings-privacy.svg")}
              ${settingsMenuRow("Сообщения", "settings-messages.svg")}
              ${settingsMenuRow("Папки", "settings-folders.svg")}
            </section>

            <section class="main-settings-card main-settings-card-full">
              ${settingsMenuRow("Экономия батареи и сети", "settings-battery.svg")}
              ${settingsMenuRow("Память", "settings-storage.svg")}
            </section>

            <section class="main-settings-card main-settings-card-full">
              ${settingsMenuRow("Оформление", "settings-appearance.svg")}
            </section>

            <section class="main-settings-card main-settings-card-full">
              ${settingsMenuRow("Поддержка", "settings-support.svg")}
              ${settingsMenuRow("О приложении", "settings-about.svg")}
            </section>
          </div>
        </main>

        <nav class="bottom-nav" aria-label="Основная навигация">
          <div class="nav-items">
            <a class="nav-tab" href="#digital-id" aria-label="Цифровой ID">
              <span class="nav-icon nav-icon-id"><img src="assets/tab-id.svg" alt=""></span><span class="nav-label">Цифровой ID</span>
            </a>
            <a class="nav-tab" href="#calls" aria-label="Звонки">
              <span class="nav-icon nav-icon-calls"><img src="assets/tab-calls.svg" alt=""></span><span class="nav-label">Звонки</span>
            </a>
            <a class="nav-tab tab-chats" href="${chatsUrl}" aria-label="Чаты">
              <span class="nav-icon nav-icon-chats"><img src="assets/tab-chats-inactive.svg" alt=""></span><span class="nav-label">Чаты</span><span class="nav-badge">1</span>
            </a>
            <button class="nav-tab active" type="button" aria-label="Настройки">
              <span class="nav-icon nav-icon-settings"><img src="assets/tab-settings-active.svg" alt=""></span><span class="nav-label">Настройки</span>
            </button>
          </div>
        </nav>
      </section>`;

    document.querySelector("[data-open-archive]")?.addEventListener("click", () => {
      state.set("archive-from", "settings");
      window.location.href = `06-archive.html?from=settings&archiveHidden=${isArchiveHidden() ? "1" : "0"}`;
    });
  }

  const archiveRow = (extraClass = "") => `
    <div class="chat-row archive-row ${extraClass}" data-longpress="archive" role="button" aria-label="Архив. Удерживайте, чтобы открыть действия">
      <div class="avatar-wrap">
        <div class="archive-avatar"><img src="assets/archive.svg" alt=""></div>
      </div>
      <div class="chat-content">
        <div class="chat-head">
          <div class="chat-name">Архив</div>
          <span class="archive-row-pin" aria-label="Закреплено"><img src="assets/pin.svg" alt=""></span>
        </div>
        <div class="chat-preview one-line">
          <span class="preview-text">Есть новые сообщения</span>
          <span class="row-counter counter">1</span>
        </div>
      </div>
    </div>`;

  const chats = [
    { avatar: "papa.png", name: "Папа", time: "11:08", preview: "Собираемся завтра в 16:30", online: true, count: "1", countClass: "blue" },
    { avatar: "max.png", name: "MAX", verified: true, time: "15:52", preview: "Добро пожаловать в MAX! 🎉<br>Это официальный бот для полезных сообщений и новостей" },
    { avatar: "elena.png", name: "Елена Елисеева", mute: true, time: "12:53", preview: "Привет", online: true, count: "1" },
    { avatar: "mira.png", name: "Мира Миронова", time: "17:05", preview: `<span class="video-preview"><img class="video-thumb" src="assets/video-thumb.png" alt=""><img class="play" src="assets/play.svg" alt=""></span>Видеосообщение`, online: true },
    { avatar: "rozetked.png", name: "Rozetked", time: "09:41", preview: "«Электронный паспорт» будет<br>работать в частных больницах и салонах связи" },
    { avatar: "yan.png", name: "Ян Юсов", time: "15:49", preview: `<img class="inline-icon" src="assets/mic.svg" alt="">Голосовое сообщение` }
  ];

  const verified = `
    <span class="verified" aria-label="Верифицирован">
      <img src="assets/verified-bg.svg" alt="">
      <img src="assets/verified-check.svg" alt="">
    </span>`;

  const chatRows = chats.map((chat) => `
    <div class="chat-row">
      <div class="avatar-wrap">
        <img class="avatar" src="assets/${chat.avatar}" alt="">
        ${chat.online ? '<span class="online" aria-label="В сети"></span>' : ""}
      </div>
      <div class="chat-content">
        <div class="chat-head">
          <div class="chat-name">
            ${chat.name}
            ${chat.verified ? verified : ""}
            ${chat.mute ? '<img class="inline-icon" src="assets/mute.svg" alt="Без звука">' : ""}
          </div>
          <div class="chat-time">${chat.time}</div>
        </div>
        <div class="chat-preview ${chat.preview.includes("<br>") ? "" : "one-line"}">
          <span class="preview-text">${chat.preview}</span>
          ${chat.count ? `<span class="row-counter counter ${chat.countClass || ""}">${chat.count}</span>` : ""}
        </div>
      </div>
    </div>`).join("");

  const hiddenChatPreviewMarkup = () => `
    <header class="topbar">
      <div class="header-main">
        <h1 class="top-title">Чаты</h1>
        <div class="header-actions" aria-hidden="true">
          <span class="round-action"><span><img src="assets/search.svg" alt=""></span></span>
          <span class="round-action dark"><span><img src="assets/plus.svg" alt=""></span></span>
        </div>
      </div>
      <div class="filter-tabs" aria-label="Фильтр чатов">
        <div class="filter-tab active">Все <span class="counter">1</span></div>
        <div class="filter-tab">Новые <span class="counter">1</span></div>
      </div>
    </header>
    <main class="chat-list">${chatRows}</main>
    <nav class="bottom-nav" aria-label="Основная навигация">
      <div class="nav-items">
        <span class="nav-tab">
          <span class="nav-icon nav-icon-id"><img src="assets/tab-id.svg" alt=""></span><span class="nav-label">Цифровой ID</span>
        </span>
        <span class="nav-tab">
          <span class="nav-icon nav-icon-calls"><img src="assets/tab-calls.svg" alt=""></span><span class="nav-label">Звонки</span>
        </span>
        <span class="nav-tab tab-chats active">
          <span class="nav-icon nav-icon-chats"><img src="assets/tab-chats.svg" alt=""></span><span class="nav-label">Чаты</span><span class="nav-badge">1</span>
        </span>
        <span class="nav-tab">
          <span class="nav-icon nav-icon-settings"><img src="assets/tab-settings.svg" alt=""></span><span class="nav-label">Настройки</span>
        </span>
      </div>
    </nav>`;

  if (screen === "archive" || screen === "archive-menu") {
    renderArchive(screen === "archive-menu");
    return;
  }

  if (screen === "archive-settings") {
    renderArchiveSettings();
    return;
  }

  if (screen === "settings") {
    renderSettings();
    return;
  }

  app.innerHTML = `
    <section class="phone chat-phone" aria-label="Прототип списка чатов">
      <section class="swipe-archive-preview" aria-hidden="true" inert>
        <header class="archive-topbar">
          <div class="archive-header">
            <span class="archive-header-action archive-close"><img src="assets/plus.svg" alt=""></span>
            <h1>Архив</h1>
            <span class="archive-header-action archive-more"><img src="assets/archive-more.svg" alt=""></span>
          </div>
        </header>
        <main class="archive-chat-list">${renderArchiveRows()}</main>
      </section>

      <div class="chat-screen" data-swipe-surface>
        <header class="topbar">
          <div class="header-main">
            <h1 class="top-title">Чаты</h1>
            <div class="header-actions" aria-hidden="true">
              <button class="round-action" tabindex="-1"><span><img src="assets/search.svg" alt=""></span></button>
              <button class="round-action dark" tabindex="-1"><span><img src="assets/plus.svg" alt=""></span></button>
            </div>
          </div>
          <div class="filter-tabs" aria-label="Фильтр чатов">
            <div class="filter-tab active">Все <span class="counter">1</span></div>
            <div class="filter-tab">Новые <span class="counter">1</span></div>
          </div>
        </header>

        <main class="chat-list" data-swipe-list tabindex="0" aria-label="Список чатов. Смахните вправо, чтобы открыть скрытый архив">
          <div class="archive-source">${archiveRow()}</div>
          ${chatRows}
        </main>

        <nav class="bottom-nav" aria-label="Основная навигация">
          <div class="nav-items">
            <a class="nav-tab" href="#digital-id" aria-label="Цифровой ID">
              <span class="nav-icon nav-icon-id"><img src="assets/tab-id.svg" alt=""></span><span class="nav-label">Цифровой ID</span>
            </a>
            <a class="nav-tab" href="#calls" aria-label="Звонки">
              <span class="nav-icon nav-icon-calls"><img src="assets/tab-calls.svg" alt=""></span><span class="nav-label">Звонки</span>
            </a>
            <button class="nav-tab tab-chats active" type="button" aria-label="Чаты">
              <span class="nav-icon nav-icon-chats"><img src="assets/tab-chats.svg" alt=""></span><span class="nav-label">Чаты</span><span class="nav-badge">1</span>
            </button>
            <a class="nav-tab" href="09-settings.html?archiveHidden=${isArchiveHidden() ? "1" : "0"}" aria-label="Настройки">
              <span class="nav-icon nav-icon-settings"><img src="assets/tab-settings.svg" alt=""></span><span class="nav-label">Настройки</span>
            </a>
          </div>
        </nav>

        <div class="swipe-hint" role="status" aria-live="polite">Смахните вправо,<br>чтобы открыть архив</div>
      </div>

      <div class="scrim" data-dismiss aria-hidden="true"></div>
      <div class="archive-clone">${archiveRow("is-clone")}</div>

      <section class="sheet archive-sheet" aria-label="Действия с архивом">
        <div class="sheet-handle"></div>
        <button class="sheet-action" type="button" data-read-all>
          <span class="sheet-icon"><img src="assets/read-all.svg" alt=""></span><span>Прочитать всё</span>
        </button>
        <button class="sheet-action" type="button" data-hide-archive>
          <span class="sheet-icon"><img src="assets/hide.svg" alt=""></span><span>Скрыть</span>
        </button>
      </section>

      <div class="prototype-toast" role="status"></div>
    </section>`;

  if (screen === "list" && isArchiveHidden()) body.classList.add("archive-is-hidden");

  if (screen === "hidden" && (params.get("showHint") === "1" || params.get("showTooltip") === "1")) {
    body.classList.add("show-swipe-hint");
    window.setTimeout(() => body.classList.remove("show-swipe-hint"), 2400);
  }

  function addLongPress(target) {
    let timer = null;
    let fired = false;

    const cancel = () => {
      window.clearTimeout(timer);
      timer = null;
      target.classList.remove("is-pressing");
    };

    target.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      fired = false;
      target.classList.add("is-pressing");
      timer = window.setTimeout(() => {
        fired = true;
        cancel();
        window.location.href = "02-archive-actions.html";
      }, 560);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => target.addEventListener(name, cancel));

    target.addEventListener("click", (event) => {
      if (fired) event.preventDefault();
      if (!fired && screen === "list") {
        state.set("archive-from", "list");
        window.location.href = "06-archive.html?from=list";
      }
    });

    target.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    target.addEventListener("dragstart", (event) => event.preventDefault());
  }

  document.querySelectorAll("[data-longpress]").forEach(addLongPress);

  function enableArchiveSwipe() {
    if (screen !== "hidden" || !isArchiveHidden()) return;

    const phone = document.querySelector(".chat-phone");
    const list = document.querySelector("[data-swipe-list]");
    const surface = document.querySelector("[data-swipe-surface]");
    const preview = document.querySelector(".swipe-archive-preview");
    if (!phone || !list || !surface || !preview) return;

    let gesture = null;
    let transitionTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionMs = reducedMotion ? 0 : 220;

    const setProgress = (distance, animate = false) => {
      const width = phone.getBoundingClientRect().width || 360;
      const x = Math.max(0, Math.min(distance, width));
      const progress = x / width;
      const duration = animate ? `${transitionMs}ms` : "0ms";
      surface.style.transitionDuration = duration;
      preview.style.transitionDuration = duration;
      surface.style.transform = `translate3d(${x}px, 0, 0)`;
      preview.style.transform = `translate3d(${(-32 + (32 * progress)).toFixed(2)}px, 0, 0) scale(${(0.985 + (0.015 * progress)).toFixed(4)})`;
      preview.style.opacity = String(0.78 + (0.22 * progress));
      return { width, x, progress };
    };

    const resetSwipe = () => {
      window.clearTimeout(transitionTimer);
      setProgress(0, true);
      phone.classList.remove("is-swiping");
      transitionTimer = window.setTimeout(() => {
        surface.removeAttribute("style");
        preview.removeAttribute("style");
      }, transitionMs + 10);
    };

    const openArchive = (startDistance = 0) => {
      window.clearTimeout(transitionTimer);
      const { width } = setProgress(startDistance);
      phone.classList.add("is-swiping");
      body.classList.remove("show-swipe-hint");
      window.requestAnimationFrame(() => setProgress(width, true));
      transitionTimer = window.setTimeout(() => {
        state.set("archive-from", "hidden");
        window.location.href = "06-archive.html?from=hidden&archiveHidden=1";
      }, transitionMs + 5);
    };

    list.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      window.clearTimeout(transitionTimer);
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        distance: 0,
        axis: null
      };
    });

    list.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (!gesture.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          gesture.axis = "horizontal";
          list.setPointerCapture?.(event.pointerId);
          phone.classList.add("is-swiping");
          body.classList.remove("show-swipe-hint");
        } else {
          gesture.axis = "vertical";
          return;
        }
      }

      if (gesture.axis !== "horizontal") return;
      event.preventDefault();
      gesture.distance = Math.max(0, dx);
      setProgress(gesture.distance);
    });

    const finishGesture = (event, cancelled = false) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const current = gesture;
      gesture = null;
      if (current.axis !== "horizontal") return;

      const elapsed = Math.max(1, performance.now() - current.startTime);
      const velocity = current.distance / elapsed;
      const width = phone.getBoundingClientRect().width || 360;
      const shouldOpen = !cancelled && (
        current.distance >= Math.min(120, width * 0.34) ||
        (current.distance >= 48 && velocity >= 0.5)
      );

      if (shouldOpen) openArchive(current.distance);
      else resetSwipe();
    };

    list.addEventListener("pointerup", (event) => finishGesture(event));
    list.addEventListener("pointercancel", (event) => finishGesture(event, true));

    list.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight") return;
      event.preventDefault();
      openArchive();
    });
  }

  enableArchiveSwipe();

  document.querySelector("[data-hide-archive]")?.addEventListener("click", () => {
    setArchiveHidden(true);
    state.set("archive-from", "hidden");
    window.location.href = "03-archive-hidden.html?showHint=1&archiveHidden=1";
  });

  document.querySelector("[data-read-all]")?.addEventListener("click", () => {
    window.location.href = "01-chat-list.html";
  });

  document.querySelector("[data-dismiss]")?.addEventListener("click", () => {
    window.location.href = screen === "actions" ? "01-chat-list.html" : "03-archive-hidden.html?archiveHidden=1";
  });
})();
