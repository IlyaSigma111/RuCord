// =========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===========
let currentUser = null;
let currentChannel = 'general';
let users = {};
let messages = {};
let isRegisterMode = false;
let currentServer = 'home';
let isAuthProcessing = false;

// =========== ИНИЦИАЛИЗАЦИЯ ===========
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthState();
    updateTime();
    setInterval(updateTime, 30000);
});

function initializeApp() {
    console.log('RuCord инициализирован');
    // Проверяем подключение к Firebase
    if (!window.firebaseDatabase) {
        console.error('Firebase не инициализирован!');
        showNotification('Ошибка подключения к базе данных', 'error');
    }
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Анимация нажатия
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
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
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Переключение серверов
    document.querySelectorAll('.server-item').forEach(item => {
        item.addEventListener('click', function() {
            const server = this.dataset.server;
            if (server) {
                switchServer(server);
            }
        });
    });
    
    // Прямой клик по кнопке регистрации
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    if (registerToggleBtn) {
        registerToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleRegisterMode();
        });
    }
    
    // Форма для сброса состояния при фокусе
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
}

// =========== АУТЕНТИФИКАЦИЯ (ИСПРАВЛЕННАЯ) ===========
function toggleRegisterMode() {
    if (isAuthProcessing) return;
    
    isRegisterMode = !isRegisterMode;
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const authButton = document.getElementById('authButton');
    const modeText = document.getElementById('modeText');
    const registerToggleBtn = document.getElementById('registerToggleBtn');
    
    if (isRegisterMode) {
        confirmGroup.style.display = 'block';
        authButton.innerHTML = '<span class="btn-text">Создать аккаунт</span><i class="fas fa-user-plus btn-icon"></i>';
        modeText.textContent = 'Уже есть аккаунт?';
        registerToggleBtn.textContent = 'Войти';
        animateFormSwitch();
    } else {
        confirmGroup.style.display = 'none';
        authButton.innerHTML = '<span class="btn-text">Войти в RuCord</span><i class="fas fa-arrow-right btn-icon"></i>';
        modeText.textContent = 'Нет аккаунта?';
        registerToggleBtn.textContent = 'Зарегистрироваться';
        animateFormSwitch();
    }
}

function animateFormSwitch() {
    const form = document.getElementById('loginForm');
    form.style.opacity = '0.5';
    form.style.transform = 'translateX(-10px)';
    
    setTimeout(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateX(0)';
        form.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    }, 300);
}

async function handleAuth() {
    // Защита от двойного нажатия
    if (isAuthProcessing) return;
    isAuthProcessing = true;
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const authButton = document.getElementById('authButton');
    
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    
    // Валидация
    if (!username || username.length < 3 || username.length > 20) {
        showNotification('Имя пользователя должно быть от 3 до 20 символов', 'error');
        isAuthProcessing = false;
        return;
    }
    
    if (!password || password.length < 1) {
        showNotification('Введите пароль', 'error');
        isAuthProcessing = false;
        return;
    }
    
    if (isRegisterMode && password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        isAuthProcessing = false;
        return;
    }
    
    // Показываем анимацию загрузки
    const originalHTML = authButton.innerHTML;
    const originalText = authButton.querySelector('.btn-text')?.textContent || authButton.textContent;
    
    authButton.innerHTML = `
        <div class="loading-spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>
        <span style="opacity: 0.7; font-size: 0.9em;">${isRegisterMode ? 'Регистрация...' : 'Вход...'}</span>
    `;
    authButton.disabled = true;
    authButton.style.cursor = 'wait';
    
    // Анимация кнопки
    authButton.style.transform = 'scale(0.95)';
    
    // Имитация задержки сети (уменьшено для отзывчивости)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
        if (isRegisterMode) {
            await registerUser(username, password);
        } else {
            await loginUser(username, password);
        }
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        showNotification('Ошибка при выполнении операции', 'error');
    } finally {
        // Всегда восстанавливаем кнопку
        setTimeout(() => {
            authButton.innerHTML = originalHTML;
            authButton.disabled = false;
            authButton.style.cursor = 'pointer';
            authButton.style.transform = '';
            isAuthProcessing = false;
        }, 300);
    }
}

async function registerUser(username, password) {
    try {
        // В демо-режиме просто создаём пользователя локально
        console.log('Регистрация пользователя:', username);
        
        // Проверяем, существует ли пользователь
        const userRef = window.firebaseRef(window.firebaseDatabase, 'users/' + encodeUsername(username));
        const snapshot = await new Promise(resolve => {
            window.firebaseOnValue(userRef, resolve, { onlyOnce: true });
        });
        
        if (snapshot.exists()) {
            showNotification('Пользователь с таким именем уже существует', 'error');
            return;
        }
        
        // Создаём нового пользователя
        const userId = generateUserId();
        const userData = {
            id: userId,
            username: username,
            displayName: username,
            avatarColor: getRandomColor(),
            createdAt: Date.now(),
            lastSeen: Date.now(),
            online: true,
            status: 'online',
            discriminator: generateDiscriminator(),
            isAdmin: username.toLowerCase() === 'admin',
            isTeacher: username.toLowerCase() === 'teacher'
        };
        
        await window.firebaseSet(userRef, userData);
        
        // Сохраняем в localStorage для демо-режима
        localStorage.setItem('rucord_user', JSON.stringify(userData));
        localStorage.setItem('rucord_username', username);
        
        currentUser = userData;
        showNotification(`Аккаунт ${username} успешно создан!`, 'success');
        await new Promise(resolve => setTimeout(resolve, 800)); // Задержка для показа уведомления
        showChatInterface();
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw error;
    }
}

async function loginUser(username, password) {
    try {
        console.log('Вход пользователя:', username);
        
        // В демо-режиме проверяем пользователя в Firebase
        const userRef = window.firebaseRef(window.firebaseDatabase, 'users/' + encodeUsername(username));
        const snapshot = await new Promise(resolve => {
            window.firebaseOnValue(userRef, resolve, { onlyOnce: true });
        });
        
        let userData;
        
        if (snapshot.exists()) {
            // Пользователь существует, обновляем статус
            userData = snapshot.val();
            userData.lastSeen = Date.now();
            userData.online = true;
            userData.status = 'online';
            
            await window.firebaseUpdate(userRef, {
                lastSeen: userData.lastSeen,
                online: true,
                status: 'online'
            });
            
            currentUser = userData;
            
        } else {
            // Пользователь не существует, создаём демо-пользователя
            // В демо-режиме любой пароль работает
            const userId = generateUserId();
            userData = {
                id: userId,
                username: username,
                displayName: username,
                avatarColor: getRandomColor(),
                createdAt: Date.now(),
                lastSeen: Date.now(),
                online: true,
                status: 'online',
                discriminator: generateDiscriminator(),
                isAdmin: username.toLowerCase() === 'admin',
                isTeacher: username.toLowerCase() === 'teacher'
            };
            
            await window.firebaseSet(userRef, userData);
            currentUser = userData;
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('rucord_user', JSON.stringify(currentUser));
        localStorage.setItem('rucord_username', username);
        
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        await new Promise(resolve => setTimeout(resolve, 800)); // Задержка для показа уведомления
        showChatInterface();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw error;
    }
}

function checkAuthState() {
    const savedUser = localStorage.getItem('rucord_user');
    const savedUsername = localStorage.getItem('rucord_username');
    
    if (savedUser && savedUsername) {
        try {
            currentUser = JSON.parse(savedUser);
            // Автоматический вход с задержкой для плавности
            setTimeout(() => {
                showChatInterface();
            }, 500);
        } catch (e) {
            console.error('Ошибка восстановления сессии:', e);
            localStorage.removeItem('rucord_user');
            localStorage.removeItem('rucord_username');
        }
    }
}

function logout() {
    if (currentUser) {
        // Обновляем статус пользователя в Firebase
        const userRef = window.firebaseRef(window.firebaseDatabase, 'users/' + encodeUsername(currentUser.username));
        window.firebaseUpdate(userRef, {
            online: false,
            status: 'offline',
            lastSeen: Date.now()
        }).catch(console.error);
    }
    
    // Очищаем localStorage
    localStorage.removeItem('rucord_user');
    localStorage.removeItem('rucord_username');
    
    // Сбрасываем состояние
    currentUser = null;
    users = {};
    messages = {};
    
    // Показываем экран логина с анимацией
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    chatScreen.style.opacity = '0';
    chatScreen.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        chatScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        
        // Сброс формы
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Анимация появления
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.opacity = '1';
            loginScreen.style.transform = 'scale(1)';
            loginScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
    }, 300);
    
    showNotification('Вы успешно вышли из аккаунта', 'success');
}

// =========== ОТОБРАЖЕНИЕ ИНТЕРФЕЙСА ===========
function showChatInterface() {
    // Анимация перехода
    const loginScreen = document.getElementById('loginScreen');
    const chatScreen = document.getElementById('chatScreen');
    
    if (!loginScreen || !chatScreen) return;
    
    loginScreen.style.opacity = '0';
    loginScreen.style.transform = 'scale(0.9)';
    loginScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        loginScreen.style.display = 'none';
        chatScreen.style.display = 'block';
        
        // Инициализируем чат
        initializeChat();
        
        // Анимация появления
        chatScreen.style.opacity = '0';
        chatScreen.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            chatScreen.style.opacity = '1';
            chatScreen.style.transform = 'scale(1)';
            chatScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 10);
    }, 300);
}

function initializeChat() {
    if (!currentUser) return;
    
    // Обновляем информацию о пользователе
    updateUserInfo();
    
    // Загружаем пользователей
    loadUsers();
    
    // Загружаем сообщения текущего канала
    loadMessages();
    
    // Слушаем новые сообщения
    setupMessageListener();
    
    // Слушаем изменения пользователей
    setupUsersListener();
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Обновляем аватар
    const avatarText = document.getElementById('avatarText');
    const avatarElements = document.querySelectorAll('.user-avatar span');
    
    if (avatarText) avatarText.textContent = currentUser.displayName.charAt(0).toUpperCase();
    avatarElements.forEach(el => {
        el.textContent = currentUser.displayName.charAt(0).toUpperCase();
    });
    
    // Обновляем имя
    const userNameElements = document.querySelectorAll('#currentUserName, .username');
    userNameElements.forEach(el => {
        el.textContent = currentUser.displayName;
    });
    
    // Обновляем ID
    const userIdElement = document.getElementById('sidebarUserId');
    if (userIdElement) {
        userIdElement.textContent = '#' + (currentUser.discriminator || '0001');
    }
    
    // Обновляем аватар цветом
    const avatarElementsDiv = document.querySelectorAll('.user-avatar');
    avatarElementsDiv.forEach(el => {
        el.style.background = currentUser.avatarColor || 'linear-gradient(135deg, #7289da, #43b581)';
    });
}

// =========== РАБОТА С СООБЩЕНИЯМИ ===========
async function loadMessages() {
    try {
        const messagesRef = window.firebaseRef(window.firebaseDatabase, `messages/${currentChannel}`);
        const snapshot = await new Promise(resolve => {
            window.firebaseOnValue(messagesRef, resolve, { onlyOnce: true });
        });
        
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        // Очищаем контейнер, кроме приветственного сообщения
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }
        
        if (snapshot.exists()) {
            const messagesData = snapshot.val();
            messages[currentChannel] = messagesData;
            
            // Сортируем сообщения по времени
            const sortedMessages = Object.values(messagesData).sort((a, b) => a.timestamp - b.timestamp);
            
            // Отображаем сообщения
            sortedMessages.forEach(message => {
                addMessageToUI(message);
            });
            
            // Прокручиваем вниз
            scrollToBottom();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

function setupMessageListener() {
    const messagesRef = window.firebaseRef(window.firebaseDatabase, `messages/${currentChannel}`);
    
    window.firebaseOnValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
            const newMessages = snapshot.val();
            const lastMessage = Object.values(newMessages).pop();
            
            // Добавляем только новые сообщения
            if (lastMessage && (!messages[currentChannel] || !messages[currentChannel][lastMessage.id])) {
                addMessageToUI(lastMessage);
                scrollToBottom();
                
                // Воспроизводим звук, если это не наше сообщение
                if (lastMessage.username !== currentUser.username) {
                    playMessageSound();
                }
            }
            
            messages[currentChannel] = newMessages;
        }
    });
}

function addMessageToUI(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    // Создаём элемент сообщения
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // Определяем цвет аватара
    const avatarColor = users[message.username]?.avatarColor || getColorFromString(message.username);
    
    // Форматируем время
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageElement.innerHTML = `
        <div class="message-avatar" style="background: ${avatarColor}">
            ${message.username.charAt(0).toUpperCase()}
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author" style="color: ${getUsernameColor(message.username)}">
                    ${message.username}
                    ${message.isAdmin ? '<i class="fas fa-crown admin-badge"></i>' : ''}
                    ${message.isTeacher ? '<i class="fas fa-chalkboard-teacher teacher-badge"></i>' : ''}
                </span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;
    
    // Удаляем приветственное сообщение, если оно есть
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage && Object.keys(messagesContainer.children).length > 1) {
        welcomeMessage.remove();
    }
    
    messagesContainer.appendChild(messageElement);
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput ? messageInput.value.trim() : '';
    
    if (!text || !currentUser) return;
    
    if (text.startsWith('/')) {
        handleCommand(text);
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        return;
    }
    
    // Создаём объект сообщения
    const message = {
        id: generateMessageId(),
        username: currentUser.username,
        displayName: currentUser.displayName,
        text: text,
        timestamp: Date.now(),
        channel: currentChannel,
        isAdmin: currentUser.isAdmin,
        isTeacher: currentUser.isTeacher,
        avatarColor: currentUser.avatarColor
    };
    
    try {
        // Сохраняем в Firebase
        const messageRef = window.firebaseRef(window.firebaseDatabase, `messages/${currentChannel}/${message.id}`);
        await window.firebaseSet(messageRef, message);
        
        // Очищаем поле ввода
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        
        // Прокручиваем к новому сообщению
        scrollToBottom();
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        showNotification('Ошибка отправки сообщения', 'error');
    }
}

// =========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ===========
async function loadUsers() {
    try {
        const usersRef = window.firebaseRef(window.firebaseDatabase, 'users');
        const snapshot = await new Promise(resolve => {
            window.firebaseOnValue(usersRef, resolve, { onlyOnce: true });
        });
        
        if (snapshot.exists()) {
            users = snapshot.val();
            updateMembersList();
            updateOnlineCount();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

function setupUsersListener() {
    const usersRef = window.firebaseRef(window.firebaseDatabase, 'users');
    
    window.firebaseOnValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            users = snapshot.val();
            updateMembersList();
            updateOnlineCount();
        }
    });
}

function updateMembersList() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    membersList.innerHTML = '';
    
    // Сортируем пользователей: сначала онлайн, потом по имени
    const sortedUsers = Object.values(users).sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return a.username.localeCompare(b.username);
    });
    
    sortedUsers.forEach(user => {
        const memberElement = document.createElement('div');
        memberElement.className = 'member';
        
        memberElement.innerHTML = `
            <div class="user-avatar small" style="background: ${user.avatarColor || getRandomColor()}">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <span class="username">${user.username}</span>
                <span class="user-status ${user.online ? 'online' : 'offline'}">
                    ${user.online ? 'online' : 'offline'}
                </span>
            </div>
            ${user.isAdmin ? '<i class="fas fa-crown admin-badge"></i>' : ''}
            ${user.isTeacher ? '<i class="fas fa-chalkboard-teacher teacher-badge"></i>' : ''}
        `;
        
        membersList.appendChild(memberElement);
    });
}

function updateOnlineCount() {
    const onlineCount = Object.values(users).filter(u => u.online).length;
    
    const countElements = document.querySelectorAll('#onlineMembersCount, #memberCount, .member-count');
    countElements.forEach(el => {
        el.textContent = onlineCount;
    });
}

// =========== УПРАВЛЕНИЕ КАНАЛАМИ ===========
function switchChannel(channel) {
    if (channel === currentChannel) return;
    
    // Анимация переключения
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.channel === channel) {
            item.classList.add('active');
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.transform = '';
            }, 150);
        }
    });
    
    // Обновляем заголовок
    const channelNameElement = document.getElementById('channelHeaderName');
    const channelTopicElement = document.getElementById('channelTopic');
    
    if (channelNameElement) channelNameElement.textContent = channel;
    if (channelTopicElement) {
        const topics = {
            'general': 'Обсуждение на любые темы',
            'games': 'Обсуждение игр и игровых новостей',
            'music': 'Делимся музыкой и обсуждаем треки',
            'memes': 'Смешные картинки и мемы'
        };
        channelTopicElement.textContent = topics[channel] || 'Обсуждение';
    }
    
    // Обновляем поле ввода
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = `Написать сообщение в #${channel}...`;
    }
    
    // Меняем канал
    currentChannel = channel;
    
    // Загружаем сообщения нового канала
    loadMessages();
    
    // Обновляем слушатель сообщений
    setupMessageListener();
}

function switchServer(server) {
    if (server === currentServer) return;
    
    currentServer = server;
    
    // Обновляем активный сервер в UI
    document.querySelectorAll('.server-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.server === server) {
            item.classList.add('active');
        }
    });
    
    // Обновляем заголовок
    const serverNameElement = document.querySelector('.server-text');
    if (serverNameElement) {
        const serverNames = {
            'home': 'RuCord Main',
            'gaming': 'Игровой сервер',
            'study': 'Учебный сервер'
        };
        serverNameElement.textContent = serverNames[server] || 'RuCord';
    }
    
    showNotification(`Переключено на сервер: ${server}`, 'info');
}

// =========== КОМАНДЫ ===========
function handleCommand(command) {
    const args = command.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
        case 'help':
            showHelp();
            break;
            
        case 'users':
            showUsersList();
            break;
            
        case 'clear':
            clearChat();
            break;
            
        case 'me':
            const action = args.slice(1).join(' ');
            if (action) {
                sendActionMessage(action);
            }
            break;
            
        case 'emoji':
            const emoji = args[1];
            if (emoji) {
                addEmojiToInput(emoji);
            }
            break;
            
        case 'admin':
            if (currentUser && currentUser.isAdmin) {
                const adminCmd = args[1];
                handleAdminCommand(adminCmd, args.slice(2));
            } else {
                showNotification('У вас нет прав администратора', 'error');
            }
            break;
            
        default:
            showNotification(`Неизвестная команда: ${cmd}. Используйте /help`, 'warning');
    }
}

function showHelp() {
    const helpMessage = `
        <strong>Доступные команды:</strong><br>
        • <code>/help</code> - показать это сообщение<br>
        • <code>/users</code> - список онлайн пользователей<br>
        • <code>/clear</code> - очистить чат<br>
        • <code>/me [действие]</code> - отправить действие<br>
        • <code>/emoji [имя]</code> - добавить эмодзи<br>
        ${currentUser?.isAdmin ? '• <code>/admin [команда]</code> - команды администратора<br>' : ''}
    `;
    
    // Добавляем системное сообщение
    addSystemMessage(helpMessage);
}

// =========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===========
function showNotification(message, type = 'info') {
    // Создаём элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-title">${type === 'error' ? 'Ошибка' : type === 'success' ? 'Успех' : 'Информация'}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-message">${message}</div>
    `;
    
    // Добавляем в тело документа
    document.body.appendChild(notification);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function playMessageSound() {
    const sound = document.getElementById('messageSound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Звук не воспроизведён:', e));
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

function toggleServerList() {
    const sidebar = document.querySelector('.channel-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function toggleMemberList() {
    const sidebar = document.querySelector('.member-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function showSettings() {
    showNotification('Настройки будут доступны в следующем обновлении', 'info');
}

// =========== УТИЛИТЫ ===========
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDiscriminator() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function encodeUsername(username) {
    return btoa(encodeURIComponent(username)).replace(/[=+/]/g, '');
}

function getRandomColor() {
    const colors = [
        'linear-gradient(135deg, #7289da, #43b581)',
        'linear-gradient(135deg, #ff3366, #ff9966)',
        'linear-gradient(135deg, #5865f2, #9b59b6)',
        'linear-gradient(135deg, #43b581, #3ca374)',
        'linear-gradient(135deg, #faa61a, #ff9900)',
        'linear-gradient(135deg, #eb459e, #ed4245)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 30) % 360}, 70%, 60%))`;
}

function getUsernameColor(username) {
    const colors = {
        'admin': '#faa61a',
        'teacher': '#43b581',
        'moderator': '#5865f2'
    };
    
    if (users[username]?.isAdmin) return colors.admin;
    if (users[username]?.isTeacher) return colors.teacher;
    
    // Генерируем цвет на основе имени
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 65%)`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function addSystemMessage(text) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Дополнительные функции для кнопок
function clearChat() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = '<div class="welcome-message"><div class="welcome-icon"><i class="fas fa-comment-alt"></i></div><h3>Добро пожаловать в #общий!</h3><p>Это начало канала #общий.</p></div>';
        showNotification('Чат очищен', 'success');
    }
}

function showUsersList() {
    const onlineUsers = Object.values(users).filter(u => u.online);
    const offlineUsers = Object.values(users).filter(u => !u.online);
    
    let message = `<strong>Пользователи онлайн (${onlineUsers.length}):</strong><br>`;
    onlineUsers.forEach(user => {
        message += `• ${user.username}${user.isAdmin ? ' 👑' : ''}${user.isTeacher ? ' 🎓' : ''}<br>`;
    });
    
    if (offlineUsers.length > 0) {
        message += `<br><strong>Оффлайн (${offlineUsers.length}):</strong><br>`;
        offlineUsers.forEach(user => {
            message += `• ${user.username}<br>`;
        });
    }
    
    addSystemMessage(message);
}

// Экспортируем функции для использования в HTML
window.handleAuth = handleAuth;
window.toggleRegisterMode = toggleRegisterMode;
window.sendMessage = sendMessage;
window.switchChannel = switchChannel;
window.toggleServerList = toggleServerList;
window.toggleMemberList = toggleMemberList;
window.showSettings = showSettings;
window.logout = logout;
window.clearChat = clearChat;
