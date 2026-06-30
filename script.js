// Shared logic for AIKON Website
document.addEventListener('DOMContentLoaded', () => {
    // Navigation highlighting (simple simulation)
    const currentPath = window.location.pathname.split('/').pop() || 'home.html';
    const navLinks = document.querySelectorAll('.nav-links a, .nav-item');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Search simulation
    const searchInput = document.querySelector('.search-container input, .search-kb input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                alert('Mencari: ' + searchInput.value + '... (Fitur simulasi)');
            }
        });
    }

    // Chat sidebar toggle or interaction simulation
    const chatInput = document.querySelector('.chat-input input');
    const chatBtn = document.querySelector('.chat-send');
    const chatMessages = document.querySelector('.chat-messages');

    if (chatBtn && chatInput) {
        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (text) {
                const userBubble = document.createElement('div');
                userBubble.className = 'chat-bubble user';
                userBubble.textContent = text;
                chatMessages.appendChild(userBubble);
                chatInput.value = '';
                
                // Bot response simulation
                setTimeout(() => {
                    const botBubble = document.createElement('div');
                    botBubble.className = 'chat-bubble bot';
                    botBubble.innerHTML = 'Saya sedang memproses pertanyaan Anda mengenai "' + text + '". Mohon tunggu sebentar...';
                    chatMessages.appendChild(botBubble);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1000);
                
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        };

        chatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});
