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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Google провайдер для OAuth
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let currentChannel = 'general';
let currentServer = 'home';
let users = {};
let voiceChannels = {};
let activeVoiceChannel = null;
let voiceConnected = false;
let microphoneEnabled = true;
let headphonesEnabled = true;

// Yandex.Telemost ссылки
const TELEMOST_ROOMS = {
    'general': 'https://telemost.yandex.ru/j/34914547450041',
    'gaming': 'https://telemost.yandex.ru/j/57528138882724',
    'music': 'https://telemost.yandex.ru/j/66937963558228'
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем аутентификацию
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            handleUserLogin(user);
        } else {
            showLoginScreen();
        }
    });

    // Настройка форм
    setupForms();
    setupEventListeners();
    
    // Загружаем голосовые каналы
    loadVoiceChannels();
});

// ========== ФОРМЫ И СОБЫТИЯ ==========
function setupForms() {
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }
}

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
    }
    
    // Закрытие модальных окон при клике вне
    document.addEventListener('click', function(e) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ========== АВТОРИЗАЦИЯ ==========
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

async function emailLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showNotification('Вход выполнен успешно!', 'success');
    } catch (error) {
        showNotification('Ошибка входа: ' + error.message, 'error');
    }
}

async function emailRegister() {
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    if (!username || !email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    if (!document.getElementById('acceptTerms').checked) {
        showNotification('Примите условия использования', 'error');
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({ displayName: username });
        
        await database.ref('users/' + result.user.uid).set({
            username: username,
            email: email,
            avatar: generateAvatar(username),
            status: 'online',
            createdAt: Date.now()
        });
        
        showNotification('Регистрация успешна!', 'success');
    } catch (error) {
        showNotification('Ошибка регистрации: ' + error.message, 'error');
    }
}

async function googleLogin() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            await userRef.set({
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                avatar: generateAvatar(user.displayName || user.email),
                status: 'online',
                createdAt: Date.now(),
                isGoogleUser: true
            });
        }
        
        showNotification('Вход через Google выполнен!', 'success');
    } catch (error) {
        showNotification('Ошибка входа через Google: ' + error.message, 'error');
    }
}

// ========== ПОЛЬЗОВАТЕЛЬ ==========
function generateAvatar(username) {
    const colors = [
        '#5865f2', '#3ba55d', '#faa81a', '#ed4245', '#9b59b6',
        '#e91e63', '#00bcd4', '#ff9800', '#4caf50', '#2196f3'
    ];
    
    const emojis = ['😊', '😎', '🤖', '🎮', '🎵', '📚', '🎨', '🚀', '🌟', '💻'];
    
    return {
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        text: (username || 'U').charAt(0).toUpperCase()
    };
}

async function handleUserLogin(user) {
    currentUser = user;
    await updateUserStatus('online');
    
    const userData = await getUserData(user.uid);
    updateUserUI(userData || {
        username: user.displayName || user.email.split('@')[0],
        avatar: generateAvatar(user.displayName || user.email)
    });
    
    showApp();
    loadChannels();
    loadMessages();
    setupRealtimeListeners();
}

async function getUserData(uid) {
    const snapshot = await database.ref('users/' + uid).once('value');
    return snapshot.val();
}

async function updateUserStatus(status) {
    if (!currentUser) return;
    
    await database.ref('users/' + currentUser.uid).update({
        status: status,
        lastSeen: Date.now()
    });
}

// ========== ГОЛОСОВЫЕ КАНАЛЫ ==========
async function loadVoiceChannels() {
    // Загружаем голосовые каналы из базы
    const snapshot = await database.ref('voiceChannels').once('value');
    voiceChannels = snapshot.val() || {
        'general-voice': {
            name: 'General Voice',
            telemostLink: TELEMOST_ROOMS.general,
            users: {},
            server: 'home'
        },
        'gaming-voice': {
            name: 'Gaming Voice',
            telemostLink: TELEMOST_ROOMS.gaming,
            users: {},
            server: 'gaming'
        },
        'music-voice': {
            name: 'Music Voice',
            telemostLink: TELEMOST_ROOMS.music,
            users: {},
            server: 'music'
        }
    };
    
    updateVoiceChannelsUI();
}

function updateVoiceChannelsUI() {
    const container = document.getElementById('voiceChannels');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(voiceChannels).forEach(([id, channel]) => {
        if (channel.server === currentServer) {
            const userCount = Object.keys(channel.users || {}).length;
            
            const channelElement = document.createElement('div');
            channelElement.className = 'voice-channel';
            if (activeVoiceChannel === id) {
                channelElement.classList.add('active');
            }
            
            channelElement.innerHTML = `
                <div class="voice-channel-icon">
                    <i class="fas fa-volume-up"></i>
                </div>
                <div class="voice-channel-info">
                    <div class="voice-channel-name">${channel.name}</div>
                    <div class="voice-channel-users">
                        <i class="fas fa-user"></i>
                        ${userCount} участников
                    </div>
                </div>
                <button class="voice-channel-join ${activeVoiceChannel === id ? 'active' : ''}" 
                        onclick="joinVoiceChannel('${id}')">
                    <i class="fas ${activeVoiceChannel === id ? 'fa-phone-slash' : 'fa-headphones'}"></i>
                </button>
            `;
            
            container.appendChild(channelElement);
        }
    });
}

async function joinVoiceChannel(channelId) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт', 'error');
        return;
    }
    
    if (activeVoiceChannel === channelId) {
        // Отключаемся от канала
        await disconnectFromVoice();
        return;
    }
    
    const channel = voiceChannels[channelId];
    if (!channel) {
        showNotification('Канал не найден', 'error');
        return;
    }
    
    try {
        // Отключаемся от предыдущего канала
        if (activeVoiceChannel) {
            await disconnectFromVoice();
        }
        
        // Подключаемся к новому каналу
        activeVoiceChannel = channelId;
        voiceConnected = true;
        
        // Добавляем пользователя в канал
        await database.ref(`voiceChannels/${channelId}/users/${currentUser.uid}`).set({
            username: currentUser.displayName || 'Пользователь',
            avatar: generateAvatar(currentUser.displayName),
            joinedAt: Date.now(),
            microphone: microphoneEnabled,
            headphones: headphonesEnabled
        });
        
        // Обновляем UI
        updateVoiceChannelsUI();
        showVoiceControls();
        updateVoiceControls(channel);
        
        // Открываем ссылку в новой вкладке
        const telemostLink = document.getElementById('telemostLink');
        if (telemostLink) {
            telemostLink.href = channel.telemostLink;
        }
        
        showNotification(`Подключен к ${channel.name}`, 'success');
        
        // Слушаем изменения в голосовом канале
        setupVoiceChannelListener(channelId);
        
    } catch (error) {
        showNotification('Ошибка подключения: ' + error.message, 'error');
        activeVoiceChannel = null;
        voiceConnected = false;
    }
}

async function disconnectFromVoice() {
    if (!activeVoiceChannel || !currentUser) return;
    
    try {
        // Удаляем пользователя из канала
        await database.ref(`voiceChannels/${activeVoiceChannel}/users/${currentUser.uid}`).remove();
        
        // Обновляем UI
        activeVoiceChannel = null;
        voiceConnected = false;
        
        updateVoiceChannelsUI();
        hideVoiceControls();
        
        showNotification('Отключено от голосового канала', 'info');
        
    } catch (error) {
        showNotification('Ошибка отключения: ' + error.message, 'error');
    }
}

function setupVoiceChannelListener(channelId) {
    database.ref(`voiceChannels/${channelId}/users`).on('value', (snapshot) => {
        const users = snapshot.val() || {};
        updateVoiceParticipants(users);
    });
}

function updateVoiceParticipants(users) {
    const container = document.getElementById('voiceParticipants');
    if (!container) return;
    
    let html = '';
    
    Object.entries(users).forEach(([userId, user]) => {
        html += `
            <div class="voice-participant ${userId === currentUser?.uid ? 'speaking' : ''}">
                <div class="voice-participant-avatar" style="background: ${user.avatar?.color || '#5865f2'}">
                    ${user.avatar?.emoji || user.avatar?.text || 'U'}
                    ${userId === currentUser?.uid ? '<div class="voice-participant-speaking"></div>' : ''}
                </div>
                <div class="voice-participant-name">${user.username}</div>
                <div class="voice-participant-status">
                    <i class="fas ${user.microphone ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
                    <i class="fas ${user.headphones ? 'fa-headphones' : 'fa-headphones-slash'}"></i>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="no-participants">Нет участников</div>';
}

function showVoiceControls() {
    const controls = document.getElementById('voiceControls');
    if (controls) {
        controls.style.display = 'block';
    }
}

function hideVoiceControls() {
    const controls = document.getElementById('voiceControls');
    if (controls) {
        controls.style.display = 'none';
    }
}

function updateVoiceControls(channel) {
    const channelName = document.getElementById('currentVoiceChannel');
    const voiceStatus = document.getElementById('voiceStatus');
    const telemostLink = document.getElementById('telemostLink');
    
    if (channelName) {
        channelName.textContent = channel.name;
    }
    
    if (voiceStatus) {
        voiceStatus.textContent = 'Подключено';
        voiceStatus.className = 'voice-status voice-status-connected';
    }
    
    if (telemostLink) {
        telemostLink.href = channel.telemostLink;
    }
}

async function toggleMicrophone() {
    if (!activeVoiceChannel || !currentUser) return;
    
    microphoneEnabled = !microphoneEnabled;
    
    // Обновляем статус в базе
    await database.ref(`voiceChannels/${activeVoiceChannel}/users/${currentUser.uid}/microphone`).set(microphoneEnabled);
    
    // Обновляем UI
    const micBtn = document.querySelector('.mic-btn');
    if (micBtn) {
        micBtn.classList.toggle('active', microphoneEnabled);
        micBtn.innerHTML = `<i class="fas fa-${microphoneEnabled ? 'microphone' : 'microphone-slash'}"></i>`;
    }
    
    showNotification(`Микрофон ${microphoneEnabled ? 'включен' : 'выключен'}`, 'info');
}

async function toggleHeadphones() {
    if (!activeVoiceChannel || !currentUser) return;
    
    headphonesEnabled = !headphonesEnabled;
    
    // Обновляем статус в базе
    await database.ref(`voiceChannels/${activeVoiceChannel}/users/${currentUser.uid}/headphones`).set(headphonesEnabled);
    
    // Обновляем UI
    const headphoneBtn = document.querySelector('.headphone-btn');
    if (headphoneBtn) {
        headphoneBtn.classList.toggle('active', headphonesEnabled);
        headphoneBtn.innerHTML = `<i class="fas fa-${headphonesEnabled ? 'headphones' : 'headphones-slash'}"></i>`;
    }
    
    showNotification(`Наушники ${headphonesEnabled ? 'включены' : 'выключены'}`, 'info');
}

async function disconnectVoice() {
    await disconnectFromVoice();
}

// ========== СОЗДАНИЕ ГОЛОСОВОГО КАНАЛА ==========
function createVoiceChannel() {
    document.getElementById('createVoiceChannelModal').style.display = 'flex';
}

function closeVoiceModal() {
    document.getElementById('createVoiceChannelModal').style.display = 'none';
}

async function createNewVoiceChannel() {
    const name = document.getElementById('voiceChannelName').value;
    if (!name.trim()) {
        showNotification('Введите название канала', 'error');
        return;
    }
    
    const telemostLink = document.querySelector('input[name="telemostLink"]:checked').value;
    if (!telemostLink) {
        showNotification('Выберите ссылку на Telemost', 'error');
        return;
    }
    
    try {
        const channelId = 'voice_' + Date.now();
        
        await database.ref(`voiceChannels/${channelId}`).set({
            name: name,
            telemostLink: telemostLink,
            server: currentServer,
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            users: {}
        });
        
        showNotification(`Голосовой канал "${name}" создан!`, 'success');
        closeVoiceModal();
        
        // Перезагружаем каналы
        await loadVoiceChannels();
        
    } catch (error) {
        showNotification('Ошибка создания канала: ' + error.message, 'error');
    }
}

// ========== ТЕКСТОВЫЙ ЧАТ ==========
async function sendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentUser) return;
    
    const userData = await getUserData(currentUser.uid);
    
    const message = {
        text: text,
        userId: currentUser.uid,
        username: userData?.username || currentUser.displayName || 'Пользователь',
        userAvatar: userData?.avatar || generateAvatar(currentUser.displayName),
        timestamp: Date.now(),
        channel: currentChannel,
        server: currentServer
    };
    
    try {
        await database.ref(`messages/${currentServer}/${currentChannel}`).push(message);
        input.value = '';
        stopTyping();
        
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    } catch (error) {
        showNotification('Ошибка отправки сообщения', 'error');
    }
}

async function loadMessages() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="welcome-message"><h2>Загрузка сообщений...</h2></div>';
    
    try {
        const snapshot = await database.ref(`messages/${currentServer}/${currentChannel}`)
            .limitToLast(50)
            .once('value');
        
        const messages = [];
        snapshot.forEach(child => {
            messages.push({ id: child.key, ...child.val() });
        });
        
        messages.sort((a, b) => a.timestamp - b.timestamp);
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h2>Добро пожаловать в #${currentChannel}!</h2>
                    <p>Это начало канала. Отправьте первое сообщение!</p>
                </div>
            `;
        } else {
            messages.forEach(msg => {
                const messageElement = createMessageElement(msg);
                container.appendChild(messageElement);
            });
        }
        
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    } catch (error) {
        container.innerHTML = `
            <div class="welcome-message">
                <h2>Ошибка загрузки сообщений</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = 'message';
    
    const time = new Date(msg.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (msg.userAvatar) {
        avatar.style.background = msg.userAvatar.color || '#5865f2';
        avatar.textContent = msg.userAvatar.emoji || msg.userAvatar.text || 'U';
    } else {
        avatar.style.background = '#5865f2';
        avatar.textContent = (msg.username || 'U').charAt(0).toUpperCase();
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

// ========== REALTIME LISTENERS ==========
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    database.ref(`messages/${currentServer}/${currentChannel}`)
        .limitToLast(1)
        .on('child_added', (snapshot) => {
            if (snapshot.val().userId !== currentUser.uid) {
                loadMessages();
            }
        });
    
    database.ref(`typing/${currentServer}/${currentChannel}`)
        .on('value', (snapshot) => {
            updateTypingIndicator(snapshot.val());
        });
    
    database.ref('users')
        .on('value', (snapshot) => {
            users = snapshot.val() || {};
            updateOnlineUsers();
            updateMembersList();
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
        database.ref(`typing/${currentServer}/${currentChannel}/${currentUser.uid}`).set({
            username: currentUser.displayName || 'Пользователь',
            timestamp: Date.now()
        });
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
    if (!currentUser || !isTyping) return;
    
    isTyping = false;
    database.ref(`typing/${currentServer}/${currentChannel}/${currentUser.uid}`).remove();
}

// ========== УТИЛИТЫ ==========
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function togglePassword() {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function switchServer(serverId) {
    currentServer = serverId;
    document.querySelectorAll('.server').forEach(s => s.classList.remove('active'));
    const activeServer = document.querySelector(`.server[onclick*="${serverId}"]`);
    if (activeServer) activeServer.classList.add('active');
    
    const serverNames = {
        'home': 'Главный сервер',
        'gaming': 'Игровой сервер',
        'music': 'Музыкальный сервер',
        'study': 'Учебный сервер',
        'random': 'Рандомный сервер'
    };
    
    const serverName = document.getElementById('serverName');
    if (serverName) {
        serverName.textContent = serverNames[serverId] || 'Сервер';
    }
    
    loadChannels();
}

function switchChannel(channelId) {
    currentChannel = channelId;
    document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
    const activeChannel = document.querySelector(`.channel[onclick*="${channelId}"]`);
    if (activeChannel) activeChannel.classList.add('active');
    
    const channelName = document.getElementById('channelName');
    if (channelName) channelName.textContent = channelId;
    
    loadMessages();
}

async function loadChannels() {
    // Загрузка текстовых каналов
    const snapshot = await database.ref(`servers/${currentServer}/channels`).once('value');
    const channels = snapshot.val() || {
        general: { name: 'general', type: 'text' },
        memes: { name: 'memes', type: 'text' },
        help: { name: 'help', type: 'text' }
    };
    
    const textChannels = document.getElementById('textChannels');
    if (textChannels) {
        textChannels.innerHTML = '';
        
        Object.entries(channels).forEach(([id, channel]) => {
            if (channel.type === 'text') {
                const channelElement = document.createElement('a');
                channelElement.href = '#';
                channelElement.className = 'channel';
                channelElement.innerHTML = `
                    <i class="fas fa-hashtag"></i>
                    <span>${channel.name}</span>
                `;
                channelElement.onclick = () => switchChannel(id);
                
                if (id === currentChannel) {
                    channelElement.classList.add('active');
                }
                
                textChannels.appendChild(channelElement);
            }
        });
    }
    
    // Обновляем голосовые каналы
    updateVoiceChannelsUI();
}

function createServer() {
    document.getElementById('createServerModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('createServerModal').style.display = 'none';
}

async function createNewServer() {
    const name = document.getElementById('serverNameInput').value;
    if (!name.trim()) {
        showNotification('Введите название сервера', 'error');
        return;
    }
    
    try {
        const serverId = 'server_' + Date.now();
        await database.ref(`servers/${serverId}`).set({
            name: name,
            owner: currentUser.uid,
            createdAt: Date.now(),
            channels: {
                general: { name: 'general', type: 'text' }
            }
        });
        
        showNotification(`Сервер "${name}" создан!`, 'success');
        closeModal();
    } catch (error) {
        showNotification('Ошибка создания сервера', 'error');
    }
}

function toggleMembers() {
    const sidebar = document.getElementById('membersSidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

function updateOnlineUsers() {
    if (!users) return;
    
    const onlineCount = Object.values(users).filter(u => u.status === 'online').length;
    const countElement = document.getElementById('onlineCount');
    if (countElement) {
        countElement.textContent = onlineCount;
    }
}

function updateMembersList() {
    const container = document.getElementById('membersList');
    if (!container || !users) return;
    
    const onlineUsers = Object.entries(users)
        .filter(([id, user]) => user.status === 'online')
        .sort((a, b) => a[1].username?.localeCompare(b[1].username));
    
    let html = '';
    
    onlineUsers.forEach(([id, user]) => {
        html += `
            <div class="member">
                <div class="member-avatar" style="background: ${user.avatar?.color || '#5865f2'}">
                    ${user.avatar?.emoji || user.avatar?.text || (user.username?.charAt(0).toUpperCase() || 'U')}
                </div>
                <span class="member-name">${user.username || 'Пользователь'}</span>
            </div>
        `;
    });
    
    container.innerHTML = html || '<div class="member"><span class="member-name">Нет онлайн пользователей</span></div>';
}

function showNotification(message, type = 'info') {
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
        <span style="margin-left: 10px;">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавляем стили для анимации
const style = document.createElement('style');
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

// Очистка при закрытии
window.addEventListener('beforeunload', async () => {
    if (currentUser) {
        await updateUserStatus('offline');
        if (activeVoiceChannel) {
            await disconnectFromVoice();
        }
    }
});

// Периодическое обновление статуса
setInterval(() => {
    if (currentUser) {
        updateUserStatus('online');
    }
}, 30000);
