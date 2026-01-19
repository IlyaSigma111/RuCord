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
let isTyping = false;
let typingTimeout = null;

// Эмодзи для аватарок
const avatarEmojis = ['😊', '😂', '😎', '🤖', '🎮', '🎵', '📚', '🎨', '🚀', '🌟', '💻', '🎯', '⚡', '🌈', '🔥'];

// Градиенты для аватарок
const avatarGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
    'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    'linear-gradient(135deg, #ebbba7 0%, #cfc7f8 100%)'
];

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Обновляем онлайн-статус каждые 30 секунд
    setInterval(() => {
        if (currentUser) {
            updateOnlineStatus('online');
        }
    }, 30000);
});

// ========== ФОРМЫ ==========
function setupForms() {
    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            this.classList.add('active');
            const formId = this.textContent === 'Вход' ? 'loginForm' : 'registerForm';
            document.getElementById(formId).classList.add('active');
        });
    });
}

function setupEventListeners() {
    // Ввод сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
    }
}

// ========== ПЕРЕКЛЮЧЕНИЕ ФОРМ ==========
function switchTab(tab) {
    const loginTab = document.querySelector('.tab-btn:first-child');
    const registerTab = document.querySelector('.tab-btn:last-child');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.show-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'fas fa-eye';
    }
}

// ========== ГЕНЕРАЦИЯ АВАТАРКИ ==========
function generateAvatar() {
    const randomGradient = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];
    const randomEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
    
    return {
        gradient: randomGradient,
        emoji: randomEmoji
    };
}

function createAvatarElement(gradient, emoji, size = 'normal') {
    const div = document.createElement('div');
    div.className = size === 'small' ? 'user-avatar-small' : 'user-avatar';
    div.style.background = gradient;
    div.textContent = emoji;
    return div;
}

// ========== АВТОРИЗАЦИЯ ==========
function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    // Генерируем аватарку
    const avatar = generateAvatar();
    
    // Создаём пользователя
    const user = {
        id: 'user_' + Date.now(),
        email: email,
        username: email.split('@')[0],
        avatar: avatar,
        status: 'online',
        discriminator: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        lastSeen: Date.now()
    };
    
    currentUser = user;
    localStorage.setItem('rucord_user', JSON.stringify(user));
    
    // Показываем уведомление
    showNotification('Вход выполнен успешно!', 'success');
    
    // Переключаемся в чат
    setTimeout(() => {
        showChat();
        setupFirebaseListeners();
        updateOnlineStatus('online');
    }, 500);
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
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
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
    
    // Генерируем аватарку
    const avatar = generateAvatar();
    
    // Создаём пользователя
    const user = {
        id: 'user_' + Date.now(),
        email: email,
        username: username,
        avatar: avatar,
        status: 'online',
        discriminator: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        lastSeen: Date.now()
    };
    
    currentUser = user;
    localStorage.setItem('rucord_user', JSON.stringify(user));
    
    // Показываем уведомление
    showNotification('Регистрация успешна! Добро пожаловать!', 'success');
    
    // Переключаемся в чат
    setTimeout(() => {
        showChat();
        setupFirebaseListeners();
        updateOnlineStatus('online');
        switchTab('login');
    }, 500);
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
    updateUserProfile();
    
    // Загружаем сообщения
    loadMessages();
    
    // Обновляем онлайн-статус
    updateOnlineUsers();
}

function updateUserProfile() {
    if (!currentUser) return;
    
    // Обновляем аватарки
    const smallAvatar = document.getElementById('currentUserAvatar');
    const mainAvatar = document.getElementById('userAvatar');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (smallAvatar) {
        smallAvatar.innerHTML = '';
        smallAvatar.appendChild(createAvatarElement(
            currentUser.avatar.gradient,
            currentUser.avatar.emoji,
            'small'
        ));
    }
    
    if (mainAvatar) {
        mainAvatar.innerHTML = '';
        mainAvatar.appendChild(createAvatarElement(
            currentUser.avatar.gradient,
            currentUser.avatar.emoji
        ));
    }
    
    if (usernameDisplay) {
        usernameDisplay.textContent = currentUser.username;
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    
    // Обновляем активный канал
    document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
    const activeChannel = document.querySelector(`.channel[onclick*="${channel}"]`);
    if (activeChannel) activeChannel.classList.add('active');
    
    // Обновляем заголовок
    const channelName = document.getElementById('channelName');
    if (channelName) channelName.textContent = channel;
    
    // Обновляем placeholder
    const input = document.getElementById('messageInput');
    if (input) {
        input.placeholder = `Написать сообщение в #${channel}...`;
    }
    
    // Загружаем сообщения
    loadMessages();
}

function switchServer(server) {
    document.querySelectorAll('.server-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.server-btn[data-server="${server}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

// ========== СООБЩЕНИЯ ==========
function sendMessage(event) {
    event.preventDefault();
    
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
            showNotification('Ошибка отправки сообщения', 'error');
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
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
    if (!currentUser || !isTyping) return;
    
    isTyping = false;
    // Убираем статус печати
    database.ref('typing/' + currentChannel + '/' + currentUser.id).remove();
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
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Добавляем приветственное сообщение
    const welcome = document.createElement('div');
    welcome.className = 'welcome-message';
    welcome.innerHTML = `
        <h2>Добро пожаловать в #${currentChannel}!</h2>
        <p>Это начало канала. Отправьте первое сообщение!</p>
    `;
    container.appendChild(welcome);
    
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
    div.className = 'message';
    
    const time = new Date(msg.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Создаём аватарку
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (msg.userAvatar && msg.userAvatar.gradient && msg.userAvatar.emoji) {
        avatar.style.background = msg.userAvatar.gradient;
        avatar.textContent = msg.userAvatar.emoji;
    } else {
        // Если нет аватарки, генерируем на основе имени
        const randomGradient = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];
        const randomEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
        avatar.style.background = randomGradient;
        avatar.textContent = randomEmoji;
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `
        <div class="message-header">
            <span class="message-author">${msg.username}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(msg.text)}</div>
    `;
    
    div.appendChild(avatar);
    div.appendChild(content);
    
    return div;
}

function updateTypingIndicator(typingUsers) {
    const indicator = document.getElementById('typingIndicator');
    const typingText = document.getElementById('typingText');
    
    if (!indicator || !typingText) return;
    
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
        
        typingText.textContent = text;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
function updateOnlineUsers() {
    if (!users) return;
    
    const onlineUsers = Object.values(users).filter(u => u.status === 'online');
    const count = onlineUsers.length;
    
    const countElement = document.getElementById('onlineCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

function updateMembersList() {
    const container = document.getElementById('membersList');
    if (!container || !users) return;
    
    // Группируем пользователей по статусу
    const online = Object.values(users).filter(u => u.status === 'online');
    
    // Создаем HTML
    let html = '';
    
    // Онлайн пользователи
    online.forEach(user => {
        if (user.id === currentUser?.id) return;
        
        // Создаём аватарку
        const avatar = user.avatar ? 
            createAvatarElement(user.avatar.gradient, user.avatar.emoji, 'small') :
            (() => {
                const randomGradient = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];
                const randomEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
                return createAvatarElement(randomGradient, randomEmoji, 'small');
            })();
        
        const avatarHTML = avatar.outerHTML;
        
        html += `
            <div class="member">
                ${avatarHTML}
                <span class="member-name">${user.username}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ========== ГОЛОСОВЫЕ КАНАЛЫ ==========
function joinVoice(channel) {
    toggleVoicePanel();
    showNotification(`Подключение к ${channel}...`, 'info');
}

function toggleVoicePanel() {
    const panel = document.getElementById('voicePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// ========== УТИЛИТЫ ==========
function showNotification(text, type = 'info') {
    // Создаём уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ed4245' : type === 'success' ? '#3ba55d' : '#5865f2'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'error' ? 'exclamation-circle' : 
                          'info-circle'}"></i>
        <span style="margin-left: 10px;">${text}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Добавляем стили для анимации
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ==========
function toggleMembers() {
    const sidebar = document.getElementById('rightSidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

function toggleMic() {
    showNotification('Микрофон переключен', 'info');
}

function toggleDeafen() {
    showNotification('Звук переключен', 'info');
}

function openSettings() {
    showNotification('Настройки скоро будут доступны', 'info');
}

function addEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

function uploadFile() {
    showNotification('Загрузка файлов скоро будет доступна', 'info');
}

function addChannel() {
    showNotification('Создание каналов скоро будет доступно', 'info');
}

function addVoiceChannel() {
    showNotification('Создание голосовых каналов скоро будет доступно', 'info');
}

// Обновляем статус при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        updateOnlineStatus('offline');
    }
});
