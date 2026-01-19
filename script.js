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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем сохранённую сессию
    const savedUser = localStorage.getItem('rucord_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showChat();
            loadChannels();
            loadUsers();
        } catch (e) {
            localStorage.removeItem('rucord_user');
        }
    }

    // Настройка форм
    setupForms();
    setupEventListeners();
});

// ========== ФОРМЫ ==========
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loginUser();
        });
    }
}

function setupEventListeners() {
    // Ввод сообщения
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
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

    // Имитация входа (в реальном проекте будет Firebase Auth)
    const user = {
        id: 'user_' + Date.now(),
        email: email,
        username: email.split('@')[0],
        avatar: '👤',
        status: 'online'
    };
    
    currentUser = user;
    localStorage.setItem('rucord_user', JSON.stringify(user));
    
    showNotification('Вход выполнен!', 'success');
    showChat();
}

function toggleRegister() {
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm.style.display === 'none') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function registerUser() {
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    
    if (!username || !email || !password || !confirm) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password !== confirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    // Имитация регистрации
    showNotification('Аккаунт создан! Теперь войдите', 'success');
    toggleRegister();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('rucord_user');
    location.reload();
}

// ========== ИНТЕРФЕЙС ==========
function showChat() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'block';
    
    // Устанавливаем аватар пользователя
    if (currentUser) {
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.innerHTML = `<i class="fas fa-user"></i>`;
        }
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
    const channelName = document.getElementById('currentChannel');
    if (channelName) channelName.textContent = channel;
    
    // Загружаем сообщения
    loadMessages();
    
    // Прокручиваем вниз
    setTimeout(() => {
        const container = document.getElementById('messagesContainer');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
}

function switchServer(server) {
    // Обновляем активный сервер
    document.querySelectorAll('.server').forEach(s => s.classList.remove('active'));
    const activeServer = document.querySelector(`.server[onclick*="${server}"]`);
    if (activeServer) activeServer.classList.add('active');
    
    // Обновляем название сервера
    const serverName = document.getElementById('currentServer');
    if (serverName) {
        const names = {
            'home': 'Главный сервер',
            'gaming': 'Игровой сервер',
            'study': 'Учебный сервер',
            'music': 'Музыкальный сервер',
            'ai': 'ИИ Чат'
        };
        serverName.textContent = names[server] || server;
    }
    
    // Загружаем каналы сервера
    loadChannels();
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
        timestamp: Date.now(),
        channel: currentChannel
    };
    
    // Сохраняем в Firebase
    database.ref('messages/' + currentChannel).push(message)
        .then(() => {
            input.value = '';
            stopTyping();
        })
        .catch(error => {
            console.error('Ошибка отправки:', error);
            showNotification('Ошибка отправки', 'error');
        });
}

function handleTyping() {
    if (!currentUser) return;
    
    if (!isTyping) {
        isTyping = true;
        // Отправляем статус печати
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
    isTyping = false;
    // Убираем статус печати
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    // Очищаем контейнер (кроме приветственного сообщения)
    const welcome = container.querySelector('.welcome-message');
    container.innerHTML = '';
    if (welcome) container.appendChild(welcome);
    
    // Загружаем сообщения из Firebase
    database.ref('messages/' + currentChannel).limitToLast(50).on('value', (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push(childSnapshot.val());
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
    div.className = 'message animate-fade-in';
    
    const time = new Date(msg.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    div.innerHTML = `
        <div class="message-header">
            <span class="message-user">${msg.username}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.text)}</div>
    `;
    
    return div;
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
function loadUsers() {
    database.ref('users').on('value', (snapshot) => {
        users = snapshot.val() || {};
        updateOnlineUsers();
    });
}

function updateOnlineUsers() {
    const onlineUsers = Object.values(users).filter(u => u.status === 'online');
    const countElement = document.getElementById('onlineCount');
    if (countElement) {
        countElement.textContent = onlineUsers.length;
    }
}

// ========== МОБИЛЬНЫЙ ИНТЕРФЕЙС ==========
function toggleSidebar() {
    const sidebar = document.querySelector('.channels-sidebar');
    sidebar.classList.toggle('active');
}

function toggleMembers() {
    const sidebar = document.querySelector('.right-sidebar');
    sidebar.classList.toggle('active');
}

// ========== УТИЛИТЫ ==========
function showNotification(text, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type} animate-fade-in`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${text}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ЗАГРУЗКА КАНАЛОВ ==========
function loadChannels() {
    // Здесь будет загрузка каналов из Firebase
    console.log('Загрузка каналов...');
}

// ========== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ==========
function createServer() {
    const name = prompt('Название сервера:');
    if (name) {
        showNotification(`Сервер "${name}" создан!`, 'success');
    }
}

function createChannel() {
    const name = prompt('Название канала:');
    if (name) {
        showNotification(`Канал #${name} создан!`, 'success');
    }
}

function joinVoice(channel) {
    showNotification(`Подключение к ${channel}...`, 'info');
}

function showUserProfile() {
    if (!currentUser) return;
    
    alert(`Профиль пользователя:\n\nИмя: ${currentUser.username}\nEmail: ${currentUser.email}\nСтатус: ${currentUser.status}`);
}

function openSettings() {
    showNotification('Настройки открыты', 'info');
}

function toggleEmojiPicker() {
    const modal = document.getElementById('emojiPickerModal');
    modal.style.display = 'flex';
}

function toggleGifPicker() {
    showNotification('Выбор GIF пока не доступен', 'info');
}

function uploadFile() {
    showNotification('Загрузка файлов пока не доступна', 'info');
}

// Закрытие модальных окон при клике вне их
window.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Добавляем базовые CSS для уведомлений
const style = document.createElement('style');
style.textContent = `
    .notification {
        background: #2f3136;
        border-left: 4px solid #5865f2;
        padding: 12px 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 300px;
    }
    
    .notification.success {
        border-left-color: #3ba55d;
    }
    
    .notification.error {
        border-left-color: #ed4245;
    }
    
    .notification.info {
        border-left-color: #5865f2;
    }
    
    .notification i {
        font-size: 18px;
    }
    
    .notification.success i {
        color: #3ba55d;
    }
    
    .notification.error i {
        color: #ed4245;
    }
    
    .notification.info i {
        color: #5865f2;
    }
    
    .notification.hiding {
        animation: fadeIn 0.3s ease reverse;
    }
`;
document.head.appendChild(style);
