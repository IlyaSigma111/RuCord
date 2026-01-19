// =========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ===========
let currentUser = null;
let currentChannel = 'general';
let currentServer = 'home';
let users = {};
let messages = {};
let isRegisterMode = false;
let isAuthProcessing = false;
let isVoiceActive = false;
let isMicrophoneMuted = false;
let isDeafened = false;
let isTyping = false;
let typingTimeout = null;
let currentTelemostLink = '';
let currentTelemostName = '';
let settings = {
    theme: 'dark',
    notifications: true,
    sounds: true,
    autoplayGifs: false,
    showEmojis: true,
    compactMode: false,
    fontSize: 16,
    language: 'ru'
};

// ДЕМО-ПОЛЬЗОВАТЕЛИ
const demoUsers = [
    { id: '1', username: 'Администратор', status: 'online', avatarColor: '#faa61a', isAdmin: true },
    { id: '2', username: 'Модератор', status: 'online', avatarColor: '#5865f2', isModerator: true },
    { id: '3', username: 'Игрок', status: 'online', avatarColor: '#43b581' },
    { id: '4', username: 'Стример', status: 'idle', avatarColor: '#9b59b6' },
    { id: '5', username: 'Разработчик', status: 'dnd', avatarColor: '#ff3366' },
    { id: '6', username: 'Дизайнер', status: 'online', avatarColor: '#00bcd4' },
    { id: '7', username: 'Тестировщик', status: 'offline', avatarColor: '#8e44ad' }
];

// ДЕМО-СООБЩЕНИЯ
const demoMessages = {
    general: [
        { id: '1', username: 'RuCord Bot', text: 'Добро пожаловать в общий чат! 🎉', time: '10:00' },
        { id: '2', username: 'Администратор', text: 'Правила чата: 1. Уважайте друг друга 2. Без спама 3. Без оскорблений', time: '10:01' },
        { id: '3', username: 'Игрок', text: 'Кто сегодня в игру? 🎮', time: '10:05' },
        { id: '4', username: 'Стример', text: 'Стримлю новую игру в 20:00! 🔴', time: '10:10' }
    ],
    games: [
        { id: '1', username: 'RuCord Bot', text: 'Добро пожаловать в игровой чат! 🎮', time: '09:00' },
        { id: '2', username: 'Игрок', text: 'Ищу тиммейтов для CS2', time: '09:30' },
        { id: '3', username: 'Стример', text: 'Кто играет в Valorant?', time: '10:00' }
    ],
    music: [
        { id: '1', username: 'RuCord Bot', text: 'Музыкальный чат 🎵', time: '11:00' },
        { id: '2', username: 'Дизайнер', text: 'Посоветуйте музыку для работы', time: '11:30' }
    ]
};

// =========== ИНИЦИАЛИЗАЦИЯ ===========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 RuCord инициализирован');
    
    // Проверяем сохранённого пользователя
    checkAuthState();
    
    // Загружаем настройки
    loadSettings();
    
    // Инициализация анимаций
    initializeAnimations();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Обновление времени
    startClock();
    
    // Инициализация частиц (если на десктопе)
    if (window.innerWidth > 768) {
        initializeParticles();
    }
    
    // Загружаем демо-пользователей
    loadDemoUsers();
    
    // Проверка мобильного устройства
    detectMobile();
    
    console.log('✅ Все системы готовы');
});

// =========== АВТОРИЗАЦИЯ ===========
window.toggleRegisterMode = function() {
    isRegisterMode = !isRegisterMode;
    
    const modeText = document.getElementById('modeText');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const btnText = authButton.querySelector('.btn-text');
    
    // Анимация переключения
    authButton.style.transform = 'scale(0.95)';
    authButton.style.opacity = '0.8';
    
    setTimeout(() => {
        if (isRegisterMode) {
            // РЕЖИМ РЕГИСТРАЦИИ
            modeText.textContent = 'Уже есть аккаунт?';
            registerToggleBtn.textContent = 'Войти';
            confirmPasswordGroup.style.display = 'block';
            btnText.textContent = 'Создать аккаунт';
            
            // Анимация появления
            confirmPasswordGroup.style.opacity = '0';
            confirmPasswordGroup.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                confirmPasswordGroup.style.opacity = '1';
                confirmPasswordGroup.style.transform = 'translateY(0)';
                confirmPasswordGroup.style.transition = 'all 0.3s ease';
            }, 10);
            
        } else {
            // РЕЖИМ ВХОДА
            modeText.textContent = 'Нет аккаунта?';
            registerToggleBtn.textContent = 'Зарегистрироваться';
            confirmPasswordGroup.style.display = 'none';
            btnText.textContent = 'Войти в RuCord';
        }
        
        // Возвращаем кнопку в исходное состояние
        authButton.style.transform = '';
        authButton.style.opacity = '1';
        
    }, 200);
    
    // Звуковой эффект
    playSound('notificationSound');
};

window.handleAuth = function() {
    if (isAuthProcessing) return;
    isAuthProcessing = true;
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const authButton = document.getElementById('authButton');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    
    // ВАЛИДАЦИЯ
    if (!username || username.length < 3) {
        showNotification('Имя должно быть от 3 символов', 'error');
        shakeElement(usernameInput);
        isAuthProcessing = false;
        return;
    }
    
    if (!password) {
        showNotification('Введите пароль', 'error');
        shakeElement(passwordInput);
        isAuthProcessing = false;
        return;
    }
    
    if (isRegisterMode && password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        shakeElement(confirmPasswordInput);
        isAuthProcessing = false;
        return;
    }
    
    // АНИМАЦИЯ ЗАГРУЗКИ
    const originalHTML = authButton.innerHTML;
    authButton.innerHTML = `
        <div class="loading-spinner" style="
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        "></div>
        <span style="opacity: 0.8; margin-top: 5px;">
            ${isRegisterMode ? 'Создание аккаунта...' : 'Вход в систему...'}
        </span>
    `;
    authButton.disabled = true;
    authButton.style.cursor = 'wait';
    
    // ИМИТАЦИЯ ЗАПРОСА НА СЕРВЕР
    setTimeout(() => {
        try {
            // СОЗДАЕМ/ВХОДИМ В АККАУНТ
            if (isRegisterMode) {
                // РЕГИСТРАЦИЯ
                registerUser(username, password);
            } else {
                // ВХОД
                loginUser(username, password);
            }
            
            // УСПЕШНАЯ АВТОРИЗАЦИЯ
            setTimeout(() => {
                // Переход в чат
                showChatInterface();
                
                // Восстанавливаем кнопку
                authButton.innerHTML = originalHTML;
                authButton.disabled = false;
                authButton.style.cursor = 'pointer';
                isAuthProcessing = false;
                
            }, 800);
            
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            showNotification('Ошибка при авторизации', 'error');
            
            // Восстанавливаем кнопку при ошибке
            authButton.innerHTML = originalHTML;
            authButton.disabled = false;
            authButton.style.cursor = 'pointer';
            isAuthProcessing = false;
        }
    }, 1500);
};

function registerUser(username, password) {
    console.log('📝 Регистрация пользователя:', username);
    
    // Генерируем уникальный ID
    const userId = generateId();
    const userColor = getRandomGradient();
    
    // Создаем объект пользователя
    const userData = {
        id: userId,
        username: username,
        displayName: username,
        avatarColor: userColor,
        createdAt: new Date().toISOString(),
        lastSeen: Date.now(),
        status: 'online',
        discriminator: generateDiscriminator(),
        isAdmin: username.toLowerCase() === 'admin',
        isBot: false
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('rucord_user', JSON.stringify(userData));
    localStorage.setItem('rucord_username', username);
    
    currentUser = userData;
    
    // Уведомление
    showNotification(`Аккаунт ${username} успешно создан! 🎉`, 'success');
    playSound('notificationSound');
}

function loginUser(username, password) {
    console.log('🔑 Вход пользователя:', username);
    
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('rucord_user');
    let userData;
    
    if (savedUser) {
        userData = JSON.parse(savedUser);
        userData.lastSeen = Date.now();
        userData.status = 'online';
    } else {
        // Создаем нового пользователя (демо-режим)
        const userId = generateId();
        userData = {
            id: userId,
            username: username,
            displayName: username,
            avatarColor: getRandomGradient(),
            createdAt: new Date().toISOString(),
            lastSeen: Date.now(),
            status: 'online',
            discriminator: generateDiscriminator(),
            isAdmin: username.toLowerCase() === 'admin',
            isBot: false
        };
    }
    
    // Сохраняем
    localStorage.setItem('rucord_user', JSON.stringify(userData));
    localStorage.setItem('rucord_username', username);
    
    currentUser = userData;
    
    // Уведомление
    showNotification(`Добро пожаловать, ${username}! 🚀`, 'success');
    playSound('notificationSound');
}

// =========== ИНТЕРФЕЙС ЧАТА ===========
function showChatInterface() {
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    if (!loginScreen || !chatScreen) return;
    
    // Анимация исчезновения логина
    loginScreen.style.opacity = '0';
    loginScreen.style.transform = 'scale(0.95) rotate(-1deg)';
    loginScreen.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    setTimeout(() => {
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'block';
        
        // Инициализация чата
        initializeChat();
        
        // Анимация появления чата
        setTimeout(() => {
            chatScreen.style.opacity = '0';
            chatScreen.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                chatScreen.style.opacity = '1';
                chatScreen.style.transform = 'scale(1) rotate(0deg)';
                chatScreen.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                
                // Запускаем анимации интерфейса
                startInterfaceAnimations();
                
            }, 10);
        }, 50);
    }, 500);
}

function initializeChat() {
    if (!currentUser) return;
    
    console.log('💬 Инициализация чата для:', currentUser.username);
    
    // Обновляем информацию пользователя
    updateUserInfo();
    
    // Загружаем демо-данные
    loadDemoData();
    
    // Настраиваем каналы
    setupChannels();
    
    // Настраиваем серверы
    setupServers();
    
    // Настраиваем участников
    setupMembers();
    
    // Настраиваем отправку сообщений
    setupMessageSystem();
    
    // Настраиваем голосовой чат
    setupVoiceChat();
    
    // Активируем общий канал
    switchChannel('general');
    
    // Обновляем счетчик онлайн
    updateOnlineCount();
    
    // Запускаем симуляцию активности
    startActivitySimulation();
}

// =========== СООБЩЕНИЯ ===========
function loadMessages(channel = currentChannel) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    // Очищаем контейнер
    const welcomeMessage = container.querySelector('.welcome-message');
    container.innerHTML = '';
    
    // Добавляем приветственное сообщение
    if (welcomeMessage) {
        container.appendChild(welcomeMessage.cloneNode(true));
    }
    
    // Загружаем сообщения для канала
    const channelMessages = demoMessages[channel] || demoMessages.general;
    
    if (channelMessages && channelMessages.length > 0) {
        channelMessages.forEach(message => {
            addMessageToChat(message, false);
        });
        
        // Прокручиваем вниз
        setTimeout(scrollToBottom, 100);
    }
    
    // Сохраняем загруженные сообщения
    messages[channel] = channelMessages || [];
}

function addMessageToChat(messageData, animate = true) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${animate ? 'message-appear' : ''}`;
    
    // Определяем цвет аватара
    const userColor = getColorForUser(messageData.username);
    const isCurrentUser = currentUser && messageData.username === currentUser.username;
    const isSystem = messageData.username.includes('Bot') || messageData.username.includes('Система');
    
    messageElement.innerHTML = `
        <div class="message-avatar" style="
            background: ${userColor};
            ${isSystem ? 'border: 2px solid var(--brand-color);' : ''}
            ${isCurrentUser ? 'box-shadow: 0 0 0 2px var(--online);' : ''}
        ">
            ${messageData.username.charAt(0).toUpperCase()}
            ${isSystem ? '<div class="system-badge">🤖</div>' : ''}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author" style="
                    color: ${getUsernameColor(messageData.username)};
                    ${isCurrentUser ? 'font-weight: 800;' : ''}
                ">
                    ${messageData.username}
                    ${isSystem ? '<i class="fas fa-robot system-icon"></i>' : ''}
                    ${messageData.isAdmin ? '<i class="fas fa-crown admin-icon"></i>' : ''}
                    ${messageData.isModerator ? '<i class="fas fa-shield-alt mod-icon"></i>' : ''}
                </span>
                <span class="message-time">${messageData.time || getCurrentTime()}</span>
                ${isCurrentUser ? '<span class="message-you">(Вы)</span>' : ''}
            </div>
            <div class="message-text">
                ${formatMessageText(messageData.text)}
                ${messageData.edited ? '<span class="edited-badge">(изменено)</span>' : ''}
            </div>
            ${messageData.attachment ? `
                <div class="message-attachment">
                    <i class="fas fa-paperclip"></i>
                    <span>${messageData.attachment}</span>
                </div>
            ` : ''}
            <div class="message-actions">
                <button class="message-action" onclick="reactToMessage('${messageData.id}', '👍')">
                    👍
                </button>
                <button class="message-action" onclick="reactToMessage('${messageData.id}', '❤️')">
                    ❤️
                </button>
                <button class="message-action" onclick="replyToMessage('${messageData.id}')">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="message-action" onclick="showMessageMenu('${messageData.id}')">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(messageElement);
    
    // Анимация появления
    if (animate) {
        messageElement.style.animation = 'messageAppear 0.3s ease';
        setTimeout(() => {
            messageElement.style.animation = '';
        }, 300);
        
        // Прокрутка к новому сообщению
        scrollToBottom();
        
        // Звук нового сообщения (если не от текущего пользователя)
        if (!isCurrentUser && settings.sounds) {
            playSound('messageSound');
        }
    }
}

window.sendMessage = function() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
    // Проверяем команды
    if (text.startsWith('/')) {
        handleCommand(text);
        input.value = '';
        return;
    }
    
    // Создаем сообщение
    const message = {
        id: generateId(),
        username: currentUser.username,
        text: text,
        time: getCurrentTime(),
        timestamp: Date.now(),
        channel: currentChannel,
        isAdmin: currentUser.isAdmin,
        avatarColor: currentUser.avatarColor
    };
    
    // Добавляем в чат
    addMessageToChat(message);
    
    // Очищаем поле ввода
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    
    // Сохраняем в историю
    if (!messages[currentChannel]) {
        messages[currentChannel] = [];
    }
    messages[currentChannel].push(message);
    
    // Сохраняем в localStorage
    saveMessages();
    
    // Ответ бота (демо)
    if (shouldBotReply(text)) {
        setTimeout(() => {
            const botResponses = [
                "Интересно! 🤔",
                "Спасибо за сообщение! 🙏",
                "Продолжайте общение! 💬",
                "Хорошая мысль! 💡",
                "Я вас понял! 👍"
            ];
            
            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
            const botMessage = {
                id: generateId(),
                username: 'RuCord Bot',
                text: randomResponse,
                time: getCurrentTime(),
                timestamp: Date.now(),
                channel: currentChannel,
                isBot: true,
                avatarColor: getColorForUser('RuCord Bot')
            };
            
            addMessageToChat(botMessage);
            messages[currentChannel].push(botMessage);
            saveMessages();
        }, 500 + Math.random() * 1000);
    }
};

// =========== КАНАЛЫ И СЕРВЕРЫ ===========
function setupChannels() {
    // Текстовые каналы
    const textChannels = ['general', 'games', 'music', 'memes', 'help', 'offtopic'];
    const textContainer = document.getElementById('textChannels');
    
    if (textContainer) {
        textContainer.innerHTML = '';
        textChannels.forEach(channel => {
            const channelElement = createChannelElement(channel, 'text');
            textContainer.appendChild(channelElement);
        });
    }
    
    // Голосовые каналы
    const voiceChannels = [
        { name: 'Общий чат', count: 5 },
        { name: 'Игровой лобби', count: 3 },
        { name: 'Музыкальная комната', count: 4 },
        { name: 'Стримерская', count: 2 },
        { name: 'Учебная группа', count: 5 }
    ];
    
    // Видео каналы
    const videoChannels = [
        { name: 'Видео-комната', count: 3 }
    ];
}

function createChannelElement(name, type) {
    const div = document.createElement('div');
    div.className = `channel-item ${type} ${name === 'general' ? 'active' : ''}`;
    div.dataset.channel = name;
    div.dataset.type = type;
    
    const icon = type === 'voice' ? 'fa-headphones' : 
                 type === 'video' ? 'fa-video' : 'fa-hashtag';
    
    div.innerHTML = `
        <div class="channel-icon-wrapper">
            <i class="fas ${icon}"></i>
            ${type === 'voice' ? '<div class="voice-waves"></div>' : ''}
            ${type === 'video' ? '<div class="video-indicator"></div>' : ''}
        </div>
        <span class="channel-name">${name}</span>
        ${type === 'voice' || type === 'video' ? 
            `<span class="${type}-count">0</span>` : ''}
        <div class="channel-hover-effect"></div>
        <div class="channel-notification"></div>
    `;
    
    div.addEventListener('click', () => switchChannel(name, type));
    return div;
}

window.switchChannel = function(channelName, type = 'text') {
    if (channelName === currentChannel) return;
    
    console.log(`🔄 Переключение на канал: ${channelName}`);
    
    // Анимация переключения
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        item.style.transform = 'scale(1)';
    });
    
    const activeChannel = document.querySelector(`[data-channel="${channelName}"]`);
    if (activeChannel) {
        activeChannel.classList.add('active');
        activeChannel.style.transform = 'scale(0.95)';
        setTimeout(() => {
            activeChannel.style.transform = 'scale(1)';
        }, 150);
    }
    
    // Обновляем текущий канал
    currentChannel = channelName;
    
    // Обновляем UI
    updateChannelUI(channelName, type);
    
    // Загружаем сообщения
    loadMessages(channelName);
    
    // Обновляем заголовок
    document.getElementById('channelHeaderName').textContent = channelName;
    document.getElementById('messageInput').placeholder = 
        `Написать сообщение в #${channelName}...`;
    
    // Уведомление (только для мобилок)
    if (window.innerWidth <= 768) {
        showNotification(`Канал: #${channelName}`, 'info');
    }
};

// =========== НАСТРОЙКИ ===========
window.showSettings = function() {
    console.log('⚙️ Открытие настроек');
    
    const modal = createModal('settings');
    modal.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-cog"></i> Настройки RuCord</h2>
            <button class="modal-close" onclick="closeModal('settings')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="settings-container">
            <!-- ВКЛАДКИ -->
            <div class="settings-tabs">
                <button class="tab-btn active" onclick="switchSettingsTab('general')">
                    <i class="fas fa-sliders-h"></i> Основные
                </button>
                <button class="tab-btn" onclick="switchSettingsTab('appearance')">
                    <i class="fas fa-palette"></i> Внешний вид
                </button>
                <button class="tab-btn" onclick="switchSettingsTab('notifications')">
                    <i class="fas fa-bell"></i> Уведомления
                </button>
                <button class="tab-btn" onclick="switchSettingsTab('voice')">
                    <i class="fas fa-microphone"></i> Голос и видео
                </button>
                <button class="tab-btn" onclick="switchSettingsTab('account')">
                    <i class="fas fa-user"></i> Аккаунт
                </button>
            </div>
            
            <!-- СОДЕРЖИМОЕ -->
            <div class="settings-content">
                <div id="general-settings" class="settings-tab active">
                    <div class="settings-category">
                        <h3><i class="fas fa-globe"></i> Язык и регион</h3>
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Язык интерфейса</span>
                                <span class="setting-description">Выберите язык RuCord</span>
                            </div>
                            <select class="setting-select" onchange="changeLanguage(this.value)">
                                <option value="ru" selected>Русский</option>
                                <option value="en">English</option>
                                <option value="de">Deutsch</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Часовой пояс</span>
                                <span class="setting-description">Автоматически по местоположению</span>
                            </div>
                            <span class="setting-value">UTC+3 (Москва)</span>
                        </div>
                    </div>
                    
                    <div class="settings-category">
                        <h3><i class="fas fa-bolt"></i> Производительность</h3>
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Анимации интерфейса</span>
                                <span class="setting-description">Эффекты и переходы</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" checked onchange="toggleAnimations(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Режим экономии трафика</span>
                                <span class="setting-description">Оптимизация для медленных соединений</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" onchange="toggleDataSaver(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="appearance-settings" class="settings-tab">
                    <div class="settings-category">
                        <h3><i class="fas fa-moon"></i> Тема оформления</h3>
                        <div class="theme-selector">
                            <div class="theme-option active" onclick="changeTheme('dark')">
                                <div class="theme-preview dark"></div>
                                <span>Тёмная</span>
                            </div>
                            <div class="theme-option" onclick="changeTheme('light')">
                                <div class="theme-preview light"></div>
                                <span>Светлая</span>
                            </div>
                            <div class="theme-option" onclick="changeTheme('oled')">
                                <div class="theme-preview oled"></div>
                                <span>OLED чёрная</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-category">
                        <h3><i class="fas fa-text-height"></i> Шрифты и размеры</h3>
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Размер шрифта</span>
                                <span class="setting-description">${settings.fontSize}px</span>
                            </div>
                            <input type="range" min="12" max="20" value="${settings.fontSize}" 
                                   oninput="changeFontSize(this.value)">
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Компактный режим</span>
                                <span class="setting-description">Меньше отступов, больше контента</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${settings.compactMode ? 'checked' : ''} 
                                       onchange="toggleCompactMode(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="notifications-settings" class="settings-tab">
                    <div class="settings-category">
                        <h3><i class="fas fa-bell"></i> Уведомления</h3>
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Включить уведомления</span>
                                <span class="setting-description">Получать уведомления о новых сообщениях</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${settings.notifications ? 'checked' : ''} 
                                       onchange="toggleNotifications(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-label">
                                <span class="setting-name">Звуковые оповещения</span>
                                <span class="setting-description">Звуки при новых сообщениях</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" ${settings.sounds ? 'checked' : ''} 
                                       onchange="toggleSounds(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="account-settings" class="settings-tab">
                    <div class="settings-category">
                        <h3><i class="fas fa-user-circle"></i> Профиль</h3>
                        <div class="profile-settings">
                            <div class="profile-avatar">
                                <div class="user-avatar large" style="background: ${currentUser.avatarColor}">
                                    ${currentUser.username.charAt(0).toUpperCase()}
                                </div>
                                <button class="btn-secondary" onclick="changeAvatar()">
                                    <i class="fas fa-camera"></i> Сменить аватар
                                </button>
                            </div>
                            
                            <div class="profile-info">
                                <div class="setting-item">
                                    <div class="setting-label">
                                        <span class="setting-name">Имя пользователя</span>
                                    </div>
                                    <input type="text" class="setting-input" value="${currentUser.username}" 
                                           onchange="changeUsername(this.value)">
                                </div>
                                
                                <div class="setting-item">
                                    <div class="setting-label">
                                        <span class="setting-name">Статус</span>
                                    </div>
                                    <select class="setting-select" onchange="changeStatus(this.value)">
                                        <option value="online" ${currentUser.status === 'online' ? 'selected' : ''}>
                                            🟢 Онлайн
                                        </option>
                                        <option value="idle" ${currentUser.status === 'idle' ? 'selected' : ''}>
                                            🟡 Не активен
                                        </option>
                                        <option value="dnd" ${currentUser.status === 'dnd' ? 'selected' : ''}>
                                            🔴 Не беспокоить
                                        </option>
                                        <option value="offline" ${currentUser.status === 'offline' ? 'selected' : ''}>
                                            ⚫ Не в сети
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="danger-zone">
                            <h3><i class="fas fa-exclamation-triangle"></i> Опасная зона</h3>
                            <button class="btn-danger" onclick="deleteAccount()">
                                <i class="fas fa-trash"></i> Удалить аккаунт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('settings');
};

// =========== ГОЛОСОВОЙ ЧАТ ===========
window.toggleVoiceChat = function() {
    if (!isVoiceActive) {
        // ВХОД В ГОЛОСОВОЙ ЧАТ
        isVoiceActive = true;
        
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (voiceToggleBtn) {
            voiceToggleBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            voiceToggleBtn.style.background = 'linear-gradient(135deg, rgba(240, 71, 71, 0.2), rgba(240, 71, 71, 0.1))';
            voiceToggleBtn.style.borderColor = 'rgba(240, 71, 71, 0.3)';
        }
        
        if (voiceStatus) {
            voiceStatus.style.display = 'flex';
            voiceStatus.style.animation = 'slideDown 0.3s ease';
        }
        
        showNotification('Подключение к голосовому чату...', 'info');
        playSound('voiceJoinSound');
        
        // Показываем голосовое модальное окно
        setTimeout(() => {
            showVoiceChatModal();
        }, 500);
        
    } else {
        // ВЫХОД ИЗ ГОЛОСОВОГО ЧАТА
        leaveVoiceChannel();
    }
};

window.leaveVoiceChannel = function() {
    isVoiceActive = false;
    
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceModal = document.getElementById('voiceChatModal');
    
    if (voiceToggleBtn) {
        voiceToggleBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceToggleBtn.style.background = '';
        voiceToggleBtn.style.borderColor = '';
    }
    
    if (voiceStatus) {
        voiceStatus.style.display = 'none';
    }
    
    if (voiceModal) {
        voiceModal.style.display = 'none';
    }
    
    showNotification('Вы вышли из голосового чата', 'info');
    playSound('notificationSound');
};

function showVoiceChatModal() {
    const modal = createModal('voiceChat');
    modal.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-microphone"></i> Голосовой чат</h2>
            <button class="modal-close" onclick="closeModal('voiceChat')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="voice-container">
            <div class="voice-info">
                <div class="voice-channel-name">
                    <i class="fas fa-headphones"></i>
                    <span>Общий голосовой канал</span>
                </div>
                <div class="voice-stats">
                    <span>5 участников онлайн</span>
                    <span class="voice-ping">Пинг: 24ms</span>
                </div>
            </div>
            
            <div class="voice-participants">
                <h3><i class="fas fa-users"></i> Участники</h3>
                <div class="participants-list">
                    ${generateParticipantsList()}
                </div>
            </div>
            
            <div class="voice-controls">
                <button class="voice-control-btn ${isMicrophoneMuted ? 'muted' : ''}" 
                        onclick="toggleMicrophone()">
                    <div class="control-icon">
                        <i class="fas ${isMicrophoneMuted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>
                    </div>
                    <span>${isMicrophoneMuted ? 'Включить' : 'Выключить'}</span>
                </button>
                
                <button class="voice-control-btn ${isDeafened ? 'deafened' : ''}" 
                        onclick="toggleDeafen()">
                    <div class="control-icon">
                        <i class="fas ${isDeafened ? 'fa-volume-mute' : 'fa-headphones'}"></i>
                    </div>
                    <span>${isDeafened ? 'Включить' : 'Выключить'}</span>
                </button>
                
                <button class="voice-control-btn" onclick="toggleVideo()">
                    <div class="control-icon">
                        <i class="fas fa-video"></i>
                    </div>
                    <span>Камера</span>
                </button>
                
                <button class="voice-control-btn disconnect" onclick="leaveVoiceChannel()">
                    <div class="control-icon">
                        <i class="fas fa-phone-slash"></i>
                    </div>
                    <span>Выйти</span>
                </button>
            </div>
            
            <div class="voice-settings">
                <h3><i class="fas fa-sliders-h"></i> Настройки звука</h3>
                <div class="setting-item">
                    <label>Громкость микрофона</label>
                    <input type="range" min="0" max="100" value="50" 
                           oninput="changeMicVolume(this.value)">
                    <span class="volume-value">50%</span>
                </div>
                
                <div class="setting-item">
                    <label>Громкость участников</label>
                    <input type="range" min="0" max="100" value="50" 
                           oninput="changeVoiceVolume(this.value)">
                    <span class="volume-value">50%</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('voiceChat');
    
    // Запускаем визуализатор звука
    startVoiceVisualizer();
};

// =========== ЯНДЕКС.ТЕЛЕМОСТ ===========
window.joinTelemostChannel = function(link, name) {
    currentTelemostLink = link;
    currentTelemostName = name;
    
    console.log(`🎤 Подключение к Телемосту: ${name}`);
    
    showNotification(`Подключение к ${name}... 🎧`, 'info');
    playSound('voiceJoinSound');
    
    // Анимация загрузки
    setTimeout(() => {
        const modal = createModal('telemost');
        modal.innerHTML = `
            <div class="modal-header">
                <h2><i class="fab fa-yandex"></i> Яндекс.Телемост</h2>
                <button class="modal-close" onclick="closeModal('telemost')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="telemost-container">
                <div class="telemost-info">
                    <div class="telemost-channel">
                        <i class="fas fa-headphones"></i>
                        <span>${name}</span>
                    </div>
                    <div class="telemost-stats">
                        <span>Подключение к Яндекс.Телемост...</span>
                        <div class="loading-indicator">
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                        </div>
                    </div>
                </div>
                
                <div class="telemost-frame-container">
                    <div class="telemost-placeholder">
                        <div class="placeholder-icon">
                            <i class="fab fa-yandex"></i>
                        </div>
                        <h3>Подключение к голосовому чату</h3>
                        <p>Используется интеграция с Яндекс.Телемост</p>
                        
                        <div class="telemost-actions">
                            <button class="btn-primary" onclick="openTelemostInNewTab()">
                                <i class="fas fa-external-link-alt"></i>
                                <span>Открыть в новой вкладке</span>
                            </button>
                            
                            <button class="btn-secondary" onclick="copyTelemostLink()">
                                <i class="fas fa-copy"></i>
                                <span>Копировать ссылку</span>
                            </button>
                        </div>
                    </div>
                    
                    <iframe id="telemostFrame" src="${link}" style="display: none;"></iframe>
                </div>
                
                <div class="telemost-controls">
                    <button class="telemost-btn" onclick="copyTelemostLink()">
                        <i class="fas fa-link"></i>
                        <span>Копировать ссылку</span>
                    </button>
                    
                    <button class="telemost-btn" onclick="shareTelemostLink()">
                        <i class="fas fa-share-alt"></i>
                        <span>Поделиться</span>
                    </button>
                    
                    <button class="telemost-btn" onclick="inviteToTelemost()">
                        <i class="fas fa-user-plus"></i>
                        <span>Пригласить</span>
                    </button>
                    
                    <button class="telemost-btn disconnect" onclick="closeModal('telemost')">
                        <i class="fas fa-times"></i>
                        <span>Закрыть</span>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        showModal('telemost');
        
        // Имитация загрузки
        setTimeout(() => {
            const placeholder = modal.querySelector('.telemost-placeholder');
            const iframe = modal.querySelector('#telemostFrame');
            const stats = modal.querySelector('.telemost-stats span');
            
            if (placeholder) placeholder.style.display = 'none';
            if (iframe) iframe.style.display = 'block';
            if (stats) stats.textContent = 'Подключено ✓';
            
            showNotification(`${name} готов к использованию! 🎉`, 'success');
            
        }, 2000);
        
    }, 500);
};

window.openTelemostInNewTab = function() {
    if (currentTelemostLink) {
        window.open(currentTelemostLink, '_blank', 'noopener,noreferrer');
        showNotification('Открывается Яндекс.Телемост...', 'info');
    }
};

window.copyTelemostLink = function() {
    if (currentTelemostLink) {
        navigator.clipboard.writeText(currentTelemostLink)
            .then(() => {
                showNotification('Ссылка скопирована в буфер! 📋', 'success');
                
                // Анимация иконки
                const buttons = document.querySelectorAll('.telemost-btn i.fa-link, .telemost-btn i.fa-copy');
                buttons.forEach(icon => {
                    const original = icon.className;
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = original;
                    }, 2000);
                });
            })
            .catch(() => {
                showNotification('Не удалось скопировать ссылку', 'error');
            });
    }
};

window.shareTelemostLink = function() {
    if (navigator.share && currentTelemostLink) {
        navigator.share({
            title: `Присоединяйтесь к ${currentTelemostName}`,
            text: `Присоединяйтесь к голосовому чату "${currentTelemostName}" в RuCord`,
            url: currentTelemostLink
        })
        .then(() => showNotification('Приглашение отправлено! 📤', 'success'))
        .catch(() => copyTelemostLink());
    } else {
        copyTelemostLink();
    }
};

// =========== ПРИГЛАШЕНИЯ ===========
window.showInviteModal = function() {
    console.log('👥 Создание приглашения');
    
    const modal = createModal('invite');
    modal.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-user-plus"></i> Пригласить друзей</h2>
            <button class="modal-close" onclick="closeModal('invite')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="invite-container">
            <div class="invite-info">
                <div class="invite-channel">
                    <i class="fas fa-hashtag"></i>
                    <span>#${currentChannel}</span>
                </div>
                <p>Пригласите друзей в этот канал</p>
            </div>
            
            <div class="invite-link">
                <div class="link-display">
                    <code id="inviteLink">https://rucord.app/invite/${generateInviteCode()}</code>
                    <button class="btn-copy" onclick="copyInviteLink()">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <p class="link-hint">Ссылка действительна 7 дней</p>
            </div>
            
            <div class="invite-settings">
                <h3><i class="fas fa-cog"></i> Настройки приглашения</h3>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-name">Срок действия</span>
                        <span class="setting-description">Время жизни ссылки</span>
                    </div>
                    <select class="setting-select" onchange="changeInviteExpiry(this.value)">
                        <option value="1">1 час</option>
                        <option value="24">1 день</option>
                        <option value="168" selected>7 дней</option>
                        <option value="0">Никогда (бессрочно)</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-name">Максимальное использование</span>
                        <span class="setting-description">Количество использований</span>
                    </div>
                    <select class="setting-select" onchange="changeInviteUses(this.value)">
                        <option value="1">1 использование</option>
                        <option value="10" selected>10 использований</option>
                        <option value="25">25 использований</option>
                        <option value="0">Без ограничений</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-name">Требовать регистрацию</span>
                        <span class="setting-description">Только для зарегистрированных пользователей</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" checked onchange="toggleInviteRegistration(this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="invite-share">
                <h3><i class="fas fa-share-alt"></i> Поделиться</h3>
                <div class="share-buttons">
                    <button class="share-btn telegram" onclick="shareToTelegram()">
                        <i class="fab fa-telegram"></i>
                        <span>Telegram</span>
                    </button>
                    
                    <button class="share-btn vk" onclick="shareToVK()">
                        <i class="fab fa-vk"></i>
                        <span>VK</span>
                    </button>
                    
                    <button class="share-btn whatsapp" onclick="shareToWhatsApp()">
                        <i class="fab fa-whatsapp"></i>
                        <span>WhatsApp</span>
                    </button>
                    
                    <button class="share-btn discord" onclick="shareToDiscord()">
                        <i class="fab fa-discord"></i>
                        <span>Discord</span>
                    </button>
                </div>
            </div>
            
            <div class="invite-stats">
                <h3><i class="fas fa-chart-bar"></i> Статистика</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">0</span>
                        <span class="stat-label">Использований</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">7</span>
                        <span class="stat-label">Дней осталось</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">10</span>
                        <span class="stat-label">Доступно</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('invite');
    
    // Генерируем QR-код
    generateInviteQR();
};

// =========== ФОРМАТИРОВАНИЕ И ЭМОДЗИ ===========
window.showEmojiPicker = function() {
    console.log('😊 Открытие пикера эмодзи');
    
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.style.cssText = `
        position: absolute;
        bottom: 70px;
        right: 20px;
        background: rgba(30, 30, 46, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 15px;
        width: 300px;
        max-height: 400px;
        overflow-y: auto;
        backdrop-filter: blur(20px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    // Категории эмодзи
    const emojiCategories = [
        { name: 'Смайлики', emojis: ['😀', '😂', '😍', '😎', '🥺', '😭', '🤔', '😴'] },
        { name: 'Жесты', emojis: ['👍', '👎', '👏', '🙏', '🤝', '✌️', '🤟', '👌'] },
        { name: 'Предметы', emojis: ['🎮', '🎧', '🎤', '📱', '💻', '🎨', '🎵', '🎬'] },
        { name: 'Еда', emojis: ['🍕', '🍔', '🍣', '🍩', '☕', '🍺', '🍎', '🍇'] },
        { name: 'Природа', emojis: ['🌞', '🌙', '⭐', '🌈', '🌹', '🐱', '🐶', '🦊'] }
    ];
    
    emojiCategories.forEach(category => {
        const section = document.createElement('div');
        section.className = 'emoji-section';
        section.innerHTML = `
            <div class="emoji-category">${category.name}</div>
            <div class="emoji-grid">
                ${category.emojis.map(emoji => `
                    <button class="emoji-btn" onclick="insertEmoji('${emoji}')">
                        ${emoji}
                    </button>
                `).join('')}
            </div>
        `;
        picker.appendChild(section);
    });
    
    document.querySelector('.message-input-area').appendChild(picker);
    
    // Закрытие при клике вне пикера
    setTimeout(() => {
        document.addEventListener('click', function closePicker(e) {
            if (!picker.contains(e.target) && e.target.id !== 'messageInput') {
                picker.remove();
                document.removeEventListener('click', closePicker);
            }
        });
    }, 10);
};

window.insertEmoji = function(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + emoji.length;
        
        // Анимация вставки
        input.style.transform = 'scale(1.02)';
        setTimeout(() => {
            input.style.transform = '';
        }, 150);
    }
    
    // Закрываем пикер
    const picker = document.querySelector('.emoji-picker');
    if (picker) picker.remove();
};

// =========== УПРАВЛЕНИЕ МОБИЛЬНЫМ ИНТЕРФЕЙСОМ ===========
function detectMobile() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile');
        
        // Оптимизации для мобильных устройств
        optimizeForMobile();
        
        console.log('📱 Мобильное устройство обнаружено');
    } else {
        document.body.classList.add('desktop');
        console.log('💻 Десктопное устройство');
    }
}

function optimizeForMobile() {
    // Уменьшаем количество анимаций
    const animations = document.querySelectorAll('.pulse-glow, .float-animation, .flicker');
    animations.forEach(el => {
        el.style.animationDuration = 'calc(var(--duration, 2s) * 2)';
    });
    
    // Увеличиваем тач-цели
    const touchTargets = document.querySelectorAll('button, .channel-item, .server-item');
    touchTargets.forEach(el => {
        el.style.minHeight = '44px';
        el.style.minWidth = '44px';
    });
    
    // Добавляем свайп-жесты
    setupSwipeGestures();
    
    // Оптимизация производительности
    if (window.innerWidth <= 768) {
        // Отключаем тяжелые эффекты на мобилках
        const particles = document.getElementById('particles-js');
        if (particles) particles.style.display = 'none';
        
        const threejs = document.getElementById('three-container');
        if (threejs) threejs.style.display = 'none';
    }
}

function setupSwipeGestures() {
    let startX, startY;
    const threshold = 50; // Минимальное расстояние свайпа
    
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        const diffX = startX - currentX;
        const diffY = startY - currentY;
        
        // Горизонтальный свайп
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Свайп влево - показать правую панель
                if (window.innerWidth <= 768) {
                    document.getElementById('memberSidebar').classList.add('active');
                }
            } else {
                // Свайп вправо - показать левую панель
                if (window.innerWidth <= 768) {
                    document.querySelector('.channel-sidebar').classList.add('active');
                }
            }
            
            startX = null;
            startY = null;
        }
    });
}

// =========== УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===========
// (Остальные функции из предыдущего ответа...)

// Генерация ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Генерация дискриминатора
function generateDiscriminator() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Генерация кода приглашения
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Получение случайного градиента
function getRandomGradient() {
    const gradients = [
        'linear-gradient(135deg, #7289da, #43b581)',
        'linear-gradient(135deg, #5865f2, #9b59b6)',
        'linear-gradient(135deg, #faa61a, #ff9900)',
        'linear-gradient(135deg, #eb459e, #ed4245)',
        'linear-gradient(135deg, #ff3366, #ff9966)',
        'linear-gradient(135deg, #43b581, #3ca374)',
        'linear-gradient(135deg, #00bcd4, #0097a7)',
        'linear-gradient(135deg, #8e44ad, #9b59b6)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// Получение цвета для пользователя
function getColorForUser(username) {
    const userColors = {
        'RuCord Bot': 'linear-gradient(135deg, #5865f2, #9b59b6)',
        'Администратор': 'linear-gradient(135deg, #faa61a, #ff9900)',
        'Модератор': 'linear-gradient(135deg, #43b581, #3ca374)',
        'Система': 'linear-gradient(135deg, #ff3366, #ff9966)'
    };
    
    return userColors[username] || getRandomGradient();
}

// Получение цвета имени пользователя
function getUsernameColor(username) {
    const colors = {
        'RuCord Bot': '#5865f2',
        'Администратор': '#faa61a',
        'Модератор': '#43b581',
        'Система': '#ff3366'
    };
    
    // Генерируем цвет на основе имени
    if (colors[username]) return colors[username];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 65%)`;
}

// Форматирование текста сообщения
function formatMessageText(text) {
    // Простое форматирование
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Жирный
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Курсив
        .replace(/~~(.*?)~~/g, '<del>$1</del>') // Зачеркнутый
        .replace(/`(.*?)`/g, '<code>$1</code>') // Код
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Блок кода
        .replace(/\n/g, '<br>'); // Переносы строк
}

// Проверка, должен ли бот ответить
function shouldBotReply(text) {
    const triggers = [
        'привет', 'hello', 'hi', 'здравствуйте',
        'бот', 'bot', 'помоги', 'help',
        'как', 'how', 'что', 'what',
        '?', '??', '???'
    ];
    
    const lowerText = text.toLowerCase();
    return triggers.some(trigger => lowerText.includes(trigger));
}

// Показать уведомление
function showNotification(message, type = 'info') {
    if (!settings.notifications && type !== 'error') return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f04747' : type === 'success' ? '#43b581' : '#5865f2'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: notificationSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        font-weight: 600;
        max-width: 350px;
    `;
    
    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type]}" style="font-size: 18px;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 4 секунды
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
    
    // Звуковое уведомление
    if (settings.sounds) {
        playSound('notificationSound');
    }
}

// Воспроизведение звука
function playSound(soundId) {
    if (!settings.sounds) return;
    
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => {
            console.log('Звук не воспроизведён:', e);
        });
    }
}

// Анимация тряски элемента
function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Прокрутка вниз
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Получение текущего времени
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

// Проверка состояния авторизации
function checkAuthState() {
    const savedUser = localStorage.getItem('rucord_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('🔓 Автоматический вход:', currentUser.username);
            
            // Автоматический вход с задержкой
            setTimeout(() => {
                showChatInterface();
                showNotification(`С возвращением, ${currentUser.username}! 👋`, 'success');
            }, 1000);
            
        } catch(e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('rucord_user');
        }
    }
}

// =========== СОХРАНЕНИЕ И ЗАГРУЗКА ДАННЫХ ===========
function saveMessages() {
    try {
        localStorage.setItem('rucord_messages', JSON.stringify(messages));
    } catch(e) {
        console.error('Ошибка сохранения сообщений:', e);
    }
}

function loadMessagesFromStorage() {
    try {
        const saved = localStorage.getItem('rucord_messages');
        if (saved) {
            messages = JSON.parse(saved);
        }
    } catch(e) {
        console.error('Ошибка загрузки сообщений:', e);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('rucord_settings', JSON.stringify(settings));
    } catch(e) {
        console.error('Ошибка сохранения настроек:', e);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('rucord_settings');
        if (saved) {
            settings = JSON.parse(saved);
        }
    } catch(e) {
        console.error('Ошибка загрузки настроек:', e);
    }
}

// =========== СОЗДАНИЕ МОДАЛЬНЫХ ОКОН ===========
function createModal(id) {
    // Удаляем существующее модальное окно
    const existing = document.getElementById(id + 'Modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = id + 'Modal';
    modal.className = 'modal';
    modal.style.display = 'none';
    return modal;
}

function showModal(id) {
    const modal = document.getElementById(id + 'Modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
            modal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
        
        // Блокируем скролл фона
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id + 'Modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

// =========== ОБНОВЛЕНИЕ ВРЕМЕНИ ===========
function startClock() {
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('liveTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
}

// =========== АНИМАЦИИ И ЭФФЕКТЫ ===========
function initializeAnimations() {
    // Добавляем CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes notificationSlideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes notificationSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes messageAppear {
            from { 
                opacity: 0; 
                transform: translateY(10px) scale(0.95); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
            }
        }
        
        @keyframes slideUp {
            from { 
                transform: translateY(20px); 
                opacity: 0; 
            }
            to { 
                transform: translateY(0); 
                opacity: 1; 
            }
        }
        
        @keyframes slideDown {
            from { 
                transform: translateY(-20px); 
                opacity: 0; 
            }
            to { 
                transform: translateY(0); 
                opacity: 1; 
            }
        }
        
        @keyframes modalFadeIn {
            from { 
                opacity: 0; 
                backdrop-filter: blur(0); 
            }
            to { 
                opacity: 1; 
                backdrop-filter: blur(10px); 
            }
        }
        
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
    
    // Добавляем эффект ripple для кнопок
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Создаем ripple эффект
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// =========== ЭКСПОРТ ФУНКЦИЙ ДЛЯ HTML ===========
// Делаем все функции доступными глобально
window.initializeParticles = function() {
    if (window.particlesJS && window.innerWidth > 768) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 60, density: { enable: true, value_area: 800 } },
                color: { value: "#5865f2" },
                shape: { type: "circle" },
                opacity: { value: 0.3, random: true },
                size: { value: 2, random: true },
                line_linked: {
                    enable: true,
                    distance: 120,
                    color: "#5865f2",
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 1.5,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "repulse" },
                    onclick: { enable: true, mode: "push" }
                }
            }
        });
    }
};

window.toggleMicrophone = function() {
    isMicrophoneMuted = !isMicrophoneMuted;
    const btn = document.getElementById('micBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (isMicrophoneMuted) {
            icon.className = 'fas fa-microphone-slash';
            btn.style.background = 'rgba(240, 71, 71, 0.2)';
            showNotification('Микрофон выключен 🔇', 'info');
        } else {
            icon.className = 'fas fa-microphone';
            btn.style.background = '';
            showNotification('Микрофон включен 🎤', 'success');
        }
    }
};

window.toggleDeafen = function() {
    isDeafened = !isDeafened;
    const btn = document.getElementById('deafenBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (isDeafened) {
            icon.className = 'fas fa-deaf';
            btn.style.background = 'rgba(240, 71, 71, 0.2)';
            showNotification('Звук отключен 🔇', 'info');
        } else {
            icon.className = 'fas fa-headphones';
            btn.style.background = '';
            showNotification('Звук включен 🔊', 'success');
        }
    }
};

window.showUserProfile = function() {
    if (!currentUser) return;
    
    const modal = createModal('profile');
    modal.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-user-circle"></i> Профиль пользователя</h2>
            <button class="modal-close" onclick="closeModal('profile')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="profile-container">
            <div class="profile-header">
                <div class="user-avatar xlarge" style="background: ${currentUser.avatarColor}">
                    ${currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                    <h3>${currentUser.displayName || currentUser.username}</h3>
                    <p class="profile-tag">#${currentUser.discriminator}</p>
                    <div class="profile-status">
                        <span class="status-dot ${currentUser.status}"></span>
                        <span class="status-text">${getStatusText(currentUser.status)}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div class="detail-content">
                        <span class="detail-label">Дата регистрации</span>
                        <span class="detail-value">${formatDate(currentUser.createdAt)}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <div class="detail-content">
                        <span class="detail-label">Последний вход</span>
                        <span class="detail-value">${formatDate(currentUser.lastSeen)}</span>
                    </div>
                </div>
                
                ${currentUser.isAdmin ? `
                    <div class="detail-item admin">
                        <i class="fas fa-crown"></i>
                        <div class="detail-content">
                            <span class="detail-label">Роль</span>
                            <span class="detail-value">Администратор</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="profile-actions">
                <button class="btn-primary" onclick="startNewDM()">
                    <i class="fas fa-comment"></i>
                    <span>Написать сообщение</span>
                </button>
                
                <button class="btn-secondary" onclick="showUserSettings()">
                    <i class="fas fa-cog"></i>
                    <span>Настройки профиля</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('profile');
};

// =========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===========
function getStatusText(status) {
    const statuses = {
        'online': 'В сети',
        'idle': 'Не активен',
        'dnd': 'Не беспокоить',
        'offline': 'Не в сети'
    };
    return statuses[status] || 'Неизвестно';
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateParticipantsList() {
    return demoUsers.map(user => `
        <div class="participant">
            <div class="participant-avatar" style="background: ${user.avatarColor}">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="participant-info">
                <span class="participant-name">${user.username}</span>
                <span class="participant-status ${user.status}"></span>
            </div>
            <div class="participant-volume">
                <input type="range" min="0" max="100" value="50" 
                       oninput="adjustParticipantVolume('${user.id}', this.value)">
            </div>
        </div>
    `).join('');
}

// =========== ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ ===========
function loadDemoUsers() {
    demoUsers.forEach(user => {
        users[user.id] = user;
    });
}

function loadDemoData() {
    // Загружаем сообщения из localStorage или используем демо
    loadMessagesFromStorage();
    
    if (!messages.general || messages.general.length === 0) {
        messages = demoMessages;
    }
}

console.log('🎮 RuCord полностью загружен и готов к работе!');
