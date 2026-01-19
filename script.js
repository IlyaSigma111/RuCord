// =========== ФУНКЦИИ ДЛЯ ЯНДЕКС.ТЕЛЕМОСТ ===========
let currentTelemostLink = '';
let currentTelemostName = '';

function joinTelemostChannel(link, name) {
    currentTelemostLink = link;
    currentTelemostName = name;
    
    // Обновляем информацию в модальном окне
    document.getElementById('telemostChannelName').textContent = name;
    document.getElementById('openTelemostBtn').dataset.link = link;
    
    // Показываем уведомление
    showNotification(`Подключение к ${name}... ✨`, 'info');
    playSound('voiceJoinSound');
    
    // Анимация открытия модального окна
    setTimeout(() => {
        const modal = document.getElementById('telemostModal');
        modal.style.display = 'flex';
        animateModal('telemostModal');
        
        // Имитация загрузки
        setTimeout(() => {
            showNotification(`Канал "${name}" готов! 🎉`, 'success');
        }, 1500);
    }, 500);
}

function closeTelemost() {
    const modal = document.getElementById('telemostModal');
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        modal.style.display = 'none';
        showNotification('Выход из голосового канала', 'info');
    }, 300);
}

function openTelemostInNewTab() {
    const btn = document.getElementById('openTelemostBtn');
    const link = btn.dataset.link || currentTelemostLink;
    
    // Анимация перед открытием
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = '';
        window.open(link, '_blank', 'noopener,noreferrer');
        showNotification('Телемост открыт в новой вкладке 🚀', 'success');
    }, 200);
}

function copyTelemostLink() {
    navigator.clipboard.writeText(currentTelemostLink)
        .then(() => {
            showNotification('Ссылка скопирована в буфер 📋', 'success');
            
            // Анимация иконки
            const icon = document.querySelector('.telemost-btn i.fa-link');
            icon.classList.remove('fa-link');
            icon.classList.add('fa-check');
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-link');
            }, 2000);
        })
        .catch(() => showNotification('Не удалось скопировать ссылку 😔', 'error'));
}

function shareTelemostLink() {
    if (navigator.share) {
        navigator.share({
            title: `Присоединяйся к ${currentTelemostName} на RuCord`,
            text: `Присоединяйся к голосовому чату ${currentTelemostName}`,
            url: currentTelemostLink
        }).then(() => showNotification('Приглашение отправлено! 📤', 'success'))
          .catch(() => copyTelemostLink());
    } else {
        copyTelemostLink();
    }
}

// Экспортируем функции
window.joinTelemostChannel = joinTelemostChannel;
window.closeTelemost = closeTelemost;
window.openTelemostInNewTab = openTelemostInNewTab;
window.copyTelemostLink = copyTelemostLink;
window.shareTelemostLink = shareTelemostLink;

// Остальной код остаётся как в предыдущем script.js...
