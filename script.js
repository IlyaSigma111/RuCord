// =========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===========
let currentUser = null;
let currentChannel = 'general';
let users = {};
let messages = {};
let isRegisterMode = false;
let currentServer = 'home';
let isAuthProcessing = false;
let isVoiceActive = false;

// =========== ИНИЦИАЛИЗАЦИЯ ===========
document.addEventListener('DOMContentLoaded', function() {
    console.log('RuCord инициализирован');
    initializeApp();
    setupEventListeners();
    checkAuthState();
    updateTime();
    setInterval(updateTime, 1000);
});

function initializeApp() {
    // Проверяем Firebase
    if (!window.firebaseDatabase) {
        console.warn('Firebase не подключен, используется демо-режим');
        showNotification('Демо-режим активирован', 'info');
    }
    
    // Инициализация анимаций
    initializeAnimations();
}

function setupEventListeners() {
    // Форма логина
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAuth();
        });
    }
    
    // Поле ввода сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Серверы
    document.querySelectorAll('.server-item').forEach(item => {
        item.addEventListener('click', function() {
            const server = this.dataset.server;
            if (server) switchServer(server);
        });
    });
    
    // Каналы
    document.querySelectorAll('.channel-item').forEach(item => {
        item.addEventListener('click', function() {
            const channel = this.dataset.channel;
            if (channel) switchChannel(channel);
        });
    });
}

// =========== АВТОРИЗАЦИЯ (ИСПРАВЛЕННАЯ) ===========
window.toggleRegisterMode = function() {
    console.log('toggleRegisterMode вызван');
    
    isRegisterMode = !isRegisterMode;
    
    const modeText = document.getElementById('modeText');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const btnText = authButton.querySelector('.btn-text');
    
    if (isRegisterMode) {
        // РЕЖИМ РЕГИСТРАЦИИ
        modeText.textContent = 'Уже есть аккаунт?';
        registerToggleBtn.textContent = 'Войти';
        confirmPasswordGroup.style.display = 'block';
        btnText.textContent = 'Создать аккаунт';
    } else {
        // РЕЖИМ ВХОДА
        modeText.textContent = 'Нет аккаунта?';
        registerToggleBtn.textContent = 'Зарегистрироваться';
        confirmPasswordGroup.style.display = 'none';
        btnText.textContent = 'Войти в RuCord';
    }
    
    // Анимация
    authButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
        authButton.style.transform = '';
    }, 200);
};

window.handleAuth = function() {
    console.log('handleAuth вызван');
    
    if (isAuthProcessing) return;
    isAuthProcessing = true;
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const authButton = document.getElementById('authButton');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // ВАЛИДАЦИЯ
    if (!username || username.length < 3) {
        showNotification('Имя пользователя должно быть от 3 символов', 'error');
        shakeElement(usernameInput);
        isAuthProcessing = false;
        return;
    }
    
    if (!password || password.length < 1) {
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
    
    // Анимация загрузки
    const originalHTML = authButton.innerHTML;
    authButton.innerHTML = `
        <div class="loading-spinner-small"></div>
        <span style="opacity:0.8">${isRegisterMode ? 'Регистрация...' : 'Вход...'}</span>
    `;
    authButton.disabled = true;
    
    // Демо-авторизация (работает всегда)
    setTimeout(() => {
        // Создаём пользователя
        currentUser = {
            id: generateId(),
            username: username,
            displayName: username,
            avatarColor: getRandomGradient(),
            createdAt: new Date().toISOString(),
            online: true,
            status: 'online',
            discriminator: Math.floor(Math.random() * 9000) + 1000
        };
        
        // Сохраняем
        localStorage.setItem('rucord_user', JSON.stringify(currentUser));
        
        // Уведомление
        showNotification(
            isRegisterMode ? `Аккаунт ${username} создан! 🎉` : `Добро пожаловать, ${username}! 🚀`,
            'success'
        );
        
        // Переход в чат
        setTimeout(() => {
            showChatInterface();
            authButton.innerHTML = originalHTML;
            authButton.disabled = false;
            isAuthProcessing = false;
        }, 500);
        
    }, 1500);
};

// =========== ЧАТ ИНТЕРФЕЙС ===========
function showChatInterface() {
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    loginScreen.style.opacity = '0';
    loginScreen.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'block';
        
        // Инициализация чата
        initializeChat();
        
        // Анимация появления
        setTimeout(() => {
            chatScreen.style.opacity = '0';
            chatScreen.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                chatScreen.style.opacity = '1';
                chatScreen.style.transform = 'scale(1)';
                chatScreen.style.transition = 'all 0.5s ease';
            }, 10);
        }, 50);
    }, 300);
}

function initializeChat() {
    if (!currentUser) return;
    
    // Обновляем UI
    updateUserInfo();
    
    // Инициализируем каналы
    initializeChannels();
    
    // Загружаем сообщения
    loadDemoMessages();
    
    // Настраиваем Firebase (если есть)
    if (window.firebaseDatabase) {
        setupFirebaseListeners();
    }
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Аватар
    const avatarText = document.getElementById('avatarText');
    if (avatarText) avatarText.textContent = currentUser.username.charAt(0).toUpperCase();
    
    // Имя
    const userNameElements = document.querySelectorAll('#currentUserName, .username');
    userNameElements.forEach(el => {
        el.textContent = currentUser.username;
    });
    
    // ID
    const userIdElement = document.getElementById('sidebarUserId');
    if (userIdElement) {
        userIdElement.textContent = '#' + currentUser.discriminator;
    }
    
    // Цвет аватара
    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach(el => {
        el.style.background = currentUser.avatarColor;
    });
}

// =========== СООБЩЕНИЯ ===========
function loadDemoMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    // Очищаем, оставляя welcome
    const welcome = messagesContainer.querySelector('.welcome-message');
    messagesContainer.innerHTML = '';
    if (welcome) messagesContainer.appendChild(welcome);
    
    // Демо-сообщения
    const demoMessages = [
        {
            username: 'RuCord Bot',
            text: `Добро пожаловать в #${currentChannel}! 🎉`,
            time: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            avatarColor: 'linear-gradient(135deg, #5865f2, #9b59b6)'
        },
        {
            username: 'Администратор',
            text: 'Это демо-версия RuCord с анимациями',
            time: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            avatarColor: 'linear-gradient(135deg, #faa61a, #ff9900)'
        },
        {
            username: 'Гость',
            text: 'Попробуйте отправить сообщение!',
            time: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            avatarColor: 'linear-gradient(135deg, #43b581, #3ca374)'
        }
    ];
    
    demoMessages.forEach(msg => {
        addMessageToUI(msg);
    });
    
    scrollToBottom();
}

function addMessageToUI(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
        <div class="message-avatar" style="background: ${message.avatarColor}">
            ${message.username.charAt(0).toUpperCase()}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${message.username}</span>
                <span class="message-time">${message.time}</span>
            </div>
            <div class="message-text">${message.text}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

window.sendMessage = function() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
    // Создаём сообщение
    const message = {
        id: generateId(),
        username: currentUser.username,
        text: text,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
        avatarColor: currentUser.avatarColor
    };
    
    // Добавляем в UI
    addMessageToUI(message);
    
    // Очищаем input
    input.value = '';
    
    // Прокрутка
    scrollToBottom();
    
    // Ответ бота (демо)
    setTimeout(() => {
        const responses = [
            "Привет! 👋",
            "Интересное сообщение!",
            "Это демо-режим, сообщение сохранено локально",
            "Попробуйте голосовой чат! 🎤"
        ];
        
        const botMessage = {
            username: 'RuCord Bot',
            text: responses[Math.floor(Math.random() * responses.length)],
            time: new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            avatarColor: 'linear-gradient(135deg, #5865f2, #9b59b6)'
        };
        
        addMessageToUI(botMessage);
        scrollToBottom();
    }, 1000);
};

// =========== КАНАЛЫ И СЕРВЕРЫ ===========
function switchChannel(channel) {
    if (channel === currentChannel) return;
    
    currentChannel = channel;
    
    // UI
    const channelHeader = document.getElementById('channelHeaderName');
    if (channelHeader) channelHeader.textContent = channel;
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = `Написать сообщение в #${channel}...`;
    }
    
    // Активный канал
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.channel === channel) {
            item.classList.add('active');
        }
    });
    
    // Загружаем сообщения
    loadDemoMessages();
}

function switchServer(server) {
    currentServer = server;
    
    document.querySelectorAll('.server-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.server === server) {
            item.classList.add('active');
        }
    });
    
    showNotification(`Сервер: ${server}`, 'info');
}

// =========== ГОЛОСОВОЙ ЧАТ ===========
window.toggleVoiceChat = function() {
    isVoiceActive = !isVoiceActive;
    const btn = document.getElementById('voiceToggleBtn');
    const status = document.getElementById('voiceStatus');
    
    if (isVoiceActive) {
        btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        btn.style.background = 'rgba(240, 71, 71, 0.2)';
        if (status) status.style.display = 'flex';
        showNotification('Голосовой чат включён', 'success');
    } else {
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.style.background = '';
        if (status) status.style.display = 'none';
        showNotification('Голосовой чат выключен', 'info');
    }
};

// =========== ЯНДЕКС.ТЕЛЕМОСТ ===========
let currentTelemostLink = '';
let currentTelemostName = '';

window.joinTelemostChannel = function(link, name) {
    currentTelemostLink = link;
    currentTelemostName = name;
    
    showNotification(`Подключение к ${name}...`, 'info');
    
    setTimeout(() => {
        const modal = document.getElementById('telemostModal');
        if (modal) {
            document.getElementById('telemostChannelName').textContent = name;
            modal.style.display = 'flex';
        }
    }, 500);
};

window.closeTelemost = function() {
    const modal = document.getElementById('telemostModal');
    if (modal) modal.style.display = 'none';
};

window.openTelemostInNewTab = function() {
    window.open(currentTelemostLink, '_blank');
    showNotification('Телемост открывается...', 'info');
};

window.copyTelemostLink = function() {
    navigator.clipboard.writeText(currentTelemostLink)
        .then(() => showNotification('Ссылка скопирована', 'success'))
        .catch(() => showNotification('Не удалось скопировать', 'error'));
};

window.shareTelemostLink = function() {
    if (navigator.share) {
        navigator.share({
            title: `Присоединяйтесь к ${currentTelemostName}`,
            text: `Присоединяйтесь к голосовому чату ${currentTelemostName} в RuCord`,
            url: currentTelemostLink
        });
    } else {
        copyTelemostLink();
    }
};

// =========== УТИЛИТЫ ===========
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getRandomGradient() {
    const gradients = [
        'linear-gradient(135deg, #7289da, #43b581)',
        'linear-gradient(135deg, #5865f2, #9b59b6)',
        'linear-gradient(135deg, #faa61a, #ff9900)',
        'linear-gradient(135deg, #eb459e, #ed4245)',
        'linear-gradient(135deg, #ff3366, #ff9966)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f04747' : type === 'success' ? '#43b581' : '#5865f2'};
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: notificationSlideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        font-weight: 600;
        max-width: 350px;
    `;
    
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    notification.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => element.style.animation = '', 500);
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateTime() {
    const timeElement = document.getElementById('liveTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function checkAuthState() {
    const savedUser = localStorage.getItem('rucord_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            setTimeout(() => showChatInterface(), 1000);
        } catch(e) {
            localStorage.removeItem('rucord_user');
        }
    }
}

function initializeAnimations() {
    const style = document.createElement('style');
    style.textContent = `
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
        .loading-spinner-small {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// =========== ДРУГИЕ ФУНКЦИИ ===========
window.toggleServerList = function() {
    const sidebar = document.querySelector('.channel-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

window.toggleMemberList = function() {
    const sidebar = document.getElementById('memberSidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

window.showSettings = function() {
    showNotification('Настройки в разработке', 'info');
};

window.logout = function() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('rucord_user');
        currentUser = null;
        
        const loginScreen = document.getElementById('loginScreen');
        const chatScreen = document.getElementById('chatScreen');
        
        chatScreen.style.opacity = '0';
        
        setTimeout(() => {
            chatScreen.style.display = 'none';
            loginScreen.style.display = 'flex';
            
            setTimeout(() => {
                loginScreen.style.opacity = '1';
            }, 10);
        }, 300);
        
        showNotification('Вы вышли из системы', 'success');
    }
};

window.leaveVoiceChannel = function() {
    toggleVoiceChat();
};

window.editChannelTopic = function() {
    const topic = prompt('Новая тема канала:');
    if (topic) {
        const element = document.getElementById('channelTopic');
        if (element) element.querySelector('span').textContent = topic;
    }
};

// =========== FIREBASE (ЕСЛИ ЕСТЬ) ===========
function setupFirebaseListeners() {
    if (!window.firebaseDatabase) return;
    
    try {
        // Слушаем пользователей
        const usersRef = window.firebaseRef(window.firebaseDatabase, 'users');
        window.firebaseOnValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                users = snapshot.val();
                updateOnlineCount();
            }
        });
        
        // Слушаем сообщения
        const messagesRef = window.firebaseRef(window.firebaseDatabase, `messages/${currentChannel}`);
        window.firebaseOnValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                const newMessages = snapshot.val();
                messages[currentChannel] = newMessages;
            }
        });
        
    } catch (error) {
        console.error('Firebase error:', error);
    }
}

function updateOnlineCount() {
    const online = Object.values(users).filter(u => u.online).length;
    const countElements = document.querySelectorAll('#onlineMembersCount, #memberCount');
    countElements.forEach(el => {
        if (el) el.textContent = online;
    });
}

// ИНИЦИАЛИЗАЦИЯ КАНАЛОВ
function initializeChannels() {
    // Текстовые каналы
    const textChannels = ['general', 'games', 'music', 'memes', 'help'];
    const textContainer = document.getElementById('textChannels');
    
    if (textContainer) {
        textContainer.innerHTML = '';
        textChannels.forEach(channel => {
            const div = document.createElement('div');
            div.className = `channel-item ${channel === 'general' ? 'active' : ''}`;
            div.dataset.channel = channel;
            div.innerHTML = `
                <i class="fas fa-hashtag"></i>
                <span class="channel-name">${channel}</span>
            `;
            div.addEventListener('click', () => switchChannel(channel));
            textContainer.appendChild(div);
        });
    }
}

// ВОСПРОИЗВЕДЕНИЕ ЗВУКОВ
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Sound error:', e));
    }
}

// ЭКСПОРТ ОСТАЛЬНЫХ ФУНКЦИЙ
window.showInviteModal = function() {
    showNotification('Функция приглашения в разработке', 'info');
};

window.showCreateChannelModal = function(type) {
    showNotification(`Создание ${type}-канала в разработке`, 'info');
};

window.startNewDM = function() {
    showNotification('Личные сообщения в разработке', 'info');
};

window.toggleMicrophone = function() {
    const btn = document.getElementById('micBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('fa-microphone')) {
            icon.className = 'fas fa-microphone-slash';
            showNotification('Микрофон выключен', 'info');
        } else {
            icon.className = 'fas fa-microphone';
            showNotification('Микрофон включён', 'success');
        }
    }
};

window.toggleDeafen = function() {
    const btn = document.getElementById('deafenBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('fa-headphones')) {
            icon.className = 'fas fa-headphones-alt';
            showNotification('Звук отключён', 'info');
        } else {
            icon.className = 'fas fa-headphones';
            showNotification('Звук включён', 'success');
        }
    }
};

window.showUserProfile = function() {
    showNotification('Профиль пользователя в разработке', 'info');
};

window.showChannelSettings = function() {
    showNotification('Настройки канала в разработке', 'info');
};

window.showSearch = function() {
    showNotification('Поиск в разработке', 'info');
};

window.showPinnedMessages = function() {
    showNotification('Закреплённые сообщения в разработке', 'info');
};

window.toggleNotifications = function() {
    showNotification('Уведомления в разработке', 'info');
};

window.showAttachmentMenu = function() {
    showNotification('Прикрепление файлов в разработке', 'info');
};

window.showGIFPicker = function() {
    showNotification('GIF в разработке', 'info');
};

window.showEmojiPicker = function() {
    showNotification('Эмодзи в разработке', 'info');
};

window.showStickerPicker = function() {
    showNotification('Стикеры в разработке', 'info');
};

window.showFormattingMenu = function() {
    showNotification('Форматирование в разработке', 'info');
};

console.log('RuCord script.js загружен полностью! 🚀');
