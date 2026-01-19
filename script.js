// ========== КОНФИГУРАЦИЯ FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyD9aQcvK58mF2byEach9002M8AED8Mit6g",
    authDomain: "rucord-c222d.firebaseapp.com",
    projectId: "rucord-c222d",
    storageBucket: "rucord-c222d.firebasestorage.app",
    messagingSenderId: "21205944885",
    appId: "1:21205944885:web:28ee133fa547c8e21bff7c"
};

// Инициализация Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("✅ Firebase подключен");
} catch (error) {
    console.error("❌ Ошибка Firebase:", error);
}

const database = firebase.database();

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let currentChannel = 'general';
let users = {};
let messages = {};
let isTyping = false;
let typingTimeout = null;
let voicePanelVisible = false;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Заполняем даты для формы регистрации
    populateDates();
    
    // Проверяем сохранённую сессию
    const savedUser = localStorage.getItem('rucord_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showChat();
            setupFirebaseListeners();
            updateOnlineStatus('online');
        } catch (e) {
            localStorage.removeItem('rucord_user');
        }
    }

    // Настройка форм
    setupForms();
    setupEventListeners();
    
    // Загружаем статистику
    loadStatistics();
});

// ========== ЗАПОЛНЕНИЕ ДАТ ==========
function populateDates() {
    // Дни
    const daySelect = document.getElementById('dobDay');
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daySelect.appendChild(option);
    }
    
    // Месяцы
    const monthSelect = document.getElementById('dobMonth');
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    // Годы
    const yearSelect = document.getElementById('dobYear');
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 100; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
}

// ========== СТАТИСТИКА ==========
function loadStatistics() {
    // Имитация статистики
    const stats = {
        online: 1234,
        servers: 589,
        messages: 2400000
    };
    
    document.getElementById('onlineCountStat').textContent = stats.online.toLocaleString();
    document.getElementById('serversCountStat').textContent = stats.servers.toLocaleString();
    document.getElementById('messagesCountStat').textContent = (stats.messages / 1000000).toFixed(1) + 'M';
    
    // Обновляем каждые 30 секунд
    setInterval(() => {
        const change = Math.floor(Math.random() * 50) - 25;
        stats.online = Math.max(1000, stats.online + change);
        document.getElementById('onlineCountStat').textContent = stats.online.toLocaleString();
    }, 30000);
}

// ========== ФОРМЫ ==========
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loginUser();
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerUser();
        });
    }
}

function setupEventListeners() {
    // Ввод сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
    }
    
    // Клик вне элементов
    document.addEventListener('click', function(e) {
        const voicePanel = document.getElementById('voicePanel');
        const emojiPicker = document.getElementById('emojiPicker');
        
        if (voicePanel && !voicePanel.contains(e.target) && !e.target.closest('.join-btn') && !e.target.closest('.top-btn')) {
            voicePanel.style.display = 'none';
            voicePanelVisible = false;
        }
        
        if (emojiPicker && !emojiPicker.contains(e.target) && !e.target.closest('.tool-btn')) {
            emojiPicker.style.display = 'none';
        }
    });
}

// ========== ПЕРЕКЛЮЧЕНИЕ ФОРМ ==========
function toggleRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm.style.display === 'none') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const showPasswordBtn = document.querySelector('.show-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        showPasswordBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        showPasswordBtn.className = 'fas fa-eye';
    }
}

// ========== АВТОРИЗАЦИЯ ==========
function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    // Имитация входа
    showNotification('Вход выполняется...', 'info');
    
    setTimeout(() => {
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            username: email.split('@')[0],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            status: 'online',
            discriminator: Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        };
        
        currentUser = user;
        localStorage.setItem('rucord_user', JSON.stringify(user));
        
        // Сохраняем в Firebase
        database.ref('users/' + user.id).set({
            ...user,
            lastSeen: Date.now()
        });
        
        showNotification('Вход выполнен!', 'success');
        showChat();
        setupFirebaseListeners();
        updateOnlineStatus('online');
    }, 1000);
}

function registerUser() {
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    
    if (!email || !username || !password || !confirm) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password !== confirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (!document.getElementById('acceptTerms').checked) {
        showNotification('Примите условия использования', 'error');
        return;
    }
    
    // Имитация регистрации
    showNotification('Регистрация...', 'info');
    
    setTimeout(() => {
        const user = {
            id: 'user_' + Date.now(),
            email: email,
            username: username,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            status: 'online',
            discriminator: Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        };
        
        currentUser = user;
        localStorage.setItem('rucord_user', JSON.stringify(user));
        
        // Сохраняем в Firebase
        database.ref('users/' + user.id).set({
            ...user,
            lastSeen: Date.now()
        });
        
        showNotification('Аккаунт создан! Добро пожаловать!', 'success');
        showChat();
        setupFirebaseListeners();
        updateOnlineStatus('online');
    }, 1500);
}

function logout() {
    if (currentUser) {
        updateOnlineStatus('offline');
        database.ref('users/' + currentUser.id).update({
            status: 'offline',
            lastSeen: Date.now()
        });
    }
    
    currentUser = null;
    localStorage.removeItem('rucord_user');
    location.reload();
}

// ========== ОНЛАЙН СТАТУС ==========
function updateOnlineStatus(status) {
    if (!currentUser) return;
    
    database.ref('users/' + currentUser.id).update({
        status: status,
        lastSeen: Date.now()
    });
}

// ========== ИНТЕРФЕЙС ==========
function showChat() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'block';
    
    // Обновляем информацию пользователя
    if (currentUser) {
        updateUserProfile();
    }
    
    // Загружаем сообщения
    loadMessages();
    
    // Прокручиваем вниз
    setTimeout(() => {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 100);
}

function updateUserProfile() {
    const usernameElement = document.querySelector('.username');
    const statusElement = document.querySelector('.status-text');
    
    if (usernameElement) {
        usernameElement.textContent = currentUser.username;
    }
    
    if (statusElement) {
        statusElement.textContent = '#' + currentUser.discriminator;
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    
    // Обновляем активный канал
    document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
    const activeChannel = Array.from(document.querySelectorAll('.channel'))
        .find(c => c.onclick && c.onclick.toString().includes(channel));
    if (activeChannel) activeChannel.classList.add('active');
    
    // Обновляем заголовок
    const channelName = document.querySelector('.channel-title h1');
    if (channelName) channelName.textContent = channel;
    
    // Обновляем placeholder
    const input = document.getElementById('messageInput');
    if (input) {
        input.placeholder = `Написать сообщение в #${channel}...`;
    }
    
    // Загружаем сообщения
    loadMessages();
    
    // Прокручиваем вниз
    setTimeout(() => {
        const container = document.getElementById('messagesContainer');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
}

// ========== ГОЛОСОВЫЕ КАНАЛЫ ==========
function joinVoice(channel) {
    // Показываем панель с ссылками
    const voicePanel = document.getElementById('voicePanel');
    voicePanel.style.display = 'block';
    voicePanelVisible = true;
    
    // Добавляем анимацию к иконке
    const voiceIcon = document.querySelector(`.voice-channel[onclick*="${channel}"] .voice-icon`);
    if (voiceIcon) {
        voiceIcon.classList.add('animate-pulse');
        setTimeout(() => voiceIcon.classList.remove('animate-pulse'), 2000);
    }
    
    showNotification(`Подключение к ${channel}...`, 'info');
}

function toggleVoicePanel() {
    const voicePanel = document.getElementById('voicePanel');
    voicePanelVisible = !voicePanelVisible;
    voicePanel.style.display = voicePanelVisible ? 'block' : 'none';
}

// ========== СООБЩЕНИЯ ==========
function handleMessageKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
    // Создаём сообщение
    const message = {
        id: 'msg_' + Date.now(),
        text: text,
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        timestamp: Date.now(),
        channel: currentChannel,
        reactions: {}
    };
    
    // Сохраняем в Firebase
    database.ref('messages/' + currentChannel).push(message)
        .then(() => {
            input.value = '';
            stopTyping();
            
            // Прокручиваем вниз
            setTimeout(() => {
                const container = document.getElementById('messagesContainer');
                if (container) container.scrollTop = container.scrollHeight;
            }, 100);
        })
        .catch(error => {
            console.error('Ошибка отправки:', error);
            showNotification('Ошибка отправки', 'error');
        });
}

function handleTyping() {
    if (!currentUser) return;
    
    const input = document.getElementById('messageInput');
    if (!input.value.trim()) {
        stopTyping();
        return;
    }
    
    if (!isTyping) {
        isTyping = true;
        // Отправляем статус печати в Firebase
        database.ref('typing/' + currentChannel + '/' + currentUser.id).set({
            username: currentUser.username,
            timestamp: Date.now()
        });
        
        // Показываем индикатор
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.style.display = 'flex';
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
    if (!currentUser || !isTyping) return;
    
    isTyping = false;
    // Убираем статус печати
    database.ref('typing/' + currentChannel + '/' + currentUser.id).remove();
    
    // Скрываем индикатор
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = 'none';
}

function setupFirebaseListeners() {
    if (!currentUser) return;
    
    // Слушаем сообщения
    database.ref('messages/' + currentChannel).on('value', (snapshot) => {
        loadMessages();
    });
    
    // Слушаем статусы печатания
    database.ref('typing/' + currentChannel).on('value', (snapshot) => {
        updateTypingIndicator(snapshot.val());
    });
    
    // Слушаем пользователей
    database.ref('users').on('value', (snapshot) => {
        users = snapshot.val() || {};
        updateOnlineUsers();
        updateMembersList();
    });
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    // Очищаем контейнер (кроме приветственного сообщения)
    const welcome = container.querySelector('.welcome-section');
    container.innerHTML = '';
    if (welcome) container.appendChild(welcome);
    
    // Загружаем сообщения из Firebase
    database.ref('messages/' + currentChannel).limitToLast(50).once('value', (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        
        // Сортируем по времени
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Отображаем сообщения
        messages.forEach(msg => {
            const messageElement = createMessageElement(msg);
            container.appendChild(messageElement);
        });
        
        // Прокручиваем вниз
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    });
}

function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message-container animate-fade-in';
    
    const time = new Date(msg.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    div.innerHTML = `
        <div class="message-avatar">
            <img src="${msg.userAvatar}" alt="${msg.username}">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${msg.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${escapeHtml(msg.text)}</div>
            ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 
                `<div class="message-reactions">
                    ${Object.entries(msg.reactions).map(([emoji, count]) => 
                        `<button class="reaction" onclick="addReaction('${msg.id}', '${emoji}')">${emoji} ${count}</button>`
                    ).join('')}
                </div>` : ''
            }
        </div>
    `;
    
    return div;
}

function updateTypingIndicator(typingUsers) {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;
    
    if (!typingUsers || Object.keys(typingUsers).length === 0) {
        indicator.style.display = 'none';
        return;
    }
    
    const users = Object.values(typingUsers)
        .filter(u => u.userId !== currentUser?.id)
        .map(u => u.username);
    
    if (users.length > 0) {
        const text = users.length === 1 ? 
            `${users[0]} печатает...` : 
            `${users.slice(0, 2).join(', ')} печатают...`;
        
        indicator.querySelector('span').textContent = text;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function addReaction(messageId, emoji) {
    if (!currentUser) return;
    
    database.ref(`messages/${currentChannel}/${messageId}/reactions/${emoji}`)
        .transaction((current) => (current || 0) + 1);
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
function updateOnlineUsers() {
    const onlineUsers = Object.values(users).filter(u => u.status === 'online');
    const count = onlineUsers.length;
    
    const countElement = document.getElementById('onlineCount');
    const badgeElement = document.getElementById('onlineCountBadge');
    
    if (countElement) countElement.textContent = count;
    if (badgeElement) badgeElement.textContent = count;
}

function updateMembersList() {
    const container = document.querySelector('.members-list');
    if (!container) return;
    
    // Группируем пользователей по статусу
    const online = Object.values(users).filter(u => u.status === 'online');
    const idle = Object.values(users).filter(u => u.status === 'idle');
    const dnd = Object.values(users).filter(u => u.status === 'dnd');
    const offline = Object.values(users).filter(u => u.status === 'offline' || !u.status);
    
    // Обновляем счетчики
    document.getElementById('membersCount').textContent = Object.keys(users).length;
    document.getElementById('onlineCount').textContent = online.length;
    document.getElementById('offlineCount').textContent = offline.length;
    
    // Создаем HTML
    let html = '';
    
    // Онлайн
    if (online.length > 0) {
        html += `
            <div class="member-category">
                <span class="category-title">ОНЛАЙН — ${online.length}</span>
            </div>
        `;
        
        online.forEach(user => {
            if (user.id === currentUser?.id) return;
            
            html += `
                <div class="member" data-status="online" onclick="startDM('${user.id}')">
                    <div class="member-avatar">
                        <img src="${user.avatar}" alt="${user.username}">
                        <div class="status online"></div>
                    </div>
                    <div class="member-info">
                        <span class="member-name">${user.username}</span>
                        <span class="member-activity">${getUserActivity(user)}</span>
                    </div>
                </div>
            `;
        });
    }
    
    // Остальные статусы...
    // (аналогично для idle, dnd, offline)
    
    container.innerHTML = html;
}

function getUserActivity(user) {
    const activities = [
        'Слушает музыку',
        'Играет в Valorant',
        'Смотрит стрим',
        'Работает над проектом',
        'Общается в чате'
    ];
    
    return activities[Math.floor(Math.random() * activities.length)];
}

// ========== УТИЛИТЫ ==========
function showNotification(text, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type} animate__animated animate__fadeInRight`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          'info-circle'}"></i>
        <span>${text}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('animate__fadeOutRight');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== МОБИЛЬНЫЙ ИНТЕРФЕЙС ==========
function toggleMembers() {
    const sidebar = document.querySelector('.members-sidebar');
    sidebar.classList.toggle('active');
}

function toggleMic() {
    const btn = document.querySelector('.profile-btn:nth-child(1) i');
    const muted = btn.classList.contains('fa-microphone-slash');
    
    if (muted) {
        btn.className = 'fas fa-microphone';
        showNotification('Микрофон включён', 'success');
    } else {
        btn.className = 'fas fa-microphone-slash';
        showNotification('Микрофон выключен', 'warning');
    }
}

function toggleDeafen() {
    const btn = document.querySelector('.profile-btn:nth-child(2) i');
    const deafened = btn.classList.contains('fa-headphones-alt');
    
    if (deafened) {
        btn.className = 'fas fa-headphones';
        showNotification('Звук включён', 'success');
    } else {
        btn.className = 'fas fa-headphones-alt';
        showNotification('Звук выключен', 'warning');
    }
}

function openSettings() {
    showNotification('Настройки откроются скоро', 'info');
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
}

function toggleGifPicker() {
    showNotification('GIF-пикер скоро будет добавлен', 'info');
}

function uploadFile() {
    showNotification('Загрузка файлов скоро будет доступна', 'info');
}

function showFriends() {
    showNotification('Список друзей откроется скоро', 'info');
}

function toggleNotifications() {
    showNotification('Уведомления скоро будут доступны', 'info');
}

function toggleUserMenu() {
    showNotification('Меню пользователя откроется скоро', 'info');
}

function startDM(userId) {
    const user = users[userId];
    if (user) {
        showNotification(`Начинаем диалог с ${user.username}`, 'info');
    }
}

// Обновляем статус при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        updateOnlineStatus('offline');
    }
});
