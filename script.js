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
                
                // Bot response using smart category-based responder
                setTimeout(() => {
                    const botBubble = document.createElement('div');
                    botBubble.className = 'chat-bubble bot';

                    let responseHtml = window.aikonChatRespond(text);
                    responseHtml += `
                        <div class="feedback-container" style="margin-top: 10px; border-top: 1px solid #E2E8F0; padding-top: 8px;">
                            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">Apakah jawaban ini membantu?</div>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="handleFeedbackClick(this, this.getAttribute('data-query'), 'thumbs_up')" data-query="${text.replace(/\"/g, '&quot;').replace(/'/g, '&#39;')}" style="background: none; border: 1px solid #E2E8F0; border-radius: 4px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748B;"><i data-lucide="thumbs-up" size="12"></i> Ya</button>
                                <button onclick="handleFeedbackClick(this, this.getAttribute('data-query'), 'thumbs_down')" data-query="${text.replace(/\"/g, '&quot;').replace(/'/g, '&#39;')}" style="background: none; border: 1px solid #E2E8F0; border-radius: 4px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748B;"><i data-lucide="thumbs-down" size="12"></i> Tidak</button>
                            </div>
                        </div>
                    `;
                    botBubble.innerHTML = responseHtml;

                    chatMessages.appendChild(botBubble);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    if (window.lucide) window.lucide.createIcons();
                }, 800);
                
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        };

        chatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});

// Global Feedback Functions — used by home.html, knowledge-base.html, and update.html
window.handleFeedbackClick = function(btn, query, type) {
    const container = btn.closest('.feedback-container');

    const currentUser = JSON.parse(localStorage.getItem('aikon_current_user')) || { npp: 'Unknown', nama: 'Unknown User' };
    const now = new Date();
    const timeString = now.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const data = {
        user_npp: currentUser.npp,
        user_name: currentUser.nama,
        query: query,
        feedback_type: type,
        komentar: '-',
        tanggal: timeString
    };
    const savedRow = window.AikonDB.addRow('feedback', data);

    container.innerHTML = `
        <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">Terima kasih! (Opsional) tambahkan komentar:</div>
        <input type="text" class="feedback-input" placeholder="Tulis komentar..." style="width: 100%; padding: 6px 8px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 11px; margin-bottom: 6px; box-sizing: border-box; color: #1E293B;">
        <button onclick="submitFeedbackComment(this, ${savedRow.id})" style="background: #1B4F9B; color: white; border: none; border-radius: 4px; padding: 4px 12px; font-size: 11px; cursor: pointer;">Kirim</button>
    `;
};

window.submitFeedbackComment = function(btn, id) {
    const container = btn.closest('.feedback-container');
    const comment = container.querySelector('.feedback-input').value.trim();
    if (comment) {
        const db = window.AikonDB.get();
        const index = db.feedback.findIndex(f => f.id === id);
        if (index !== -1) {
            db.feedback[index].komentar = comment;
            window.AikonDB.save(db);
        }
    }
    container.innerHTML = `<div style="font-size: 11px; color: #10B981;"><i data-lucide="check-circle" size="12" style="vertical-align: middle;"></i> Feedback terkirim.</div>`;
    if (window.lucide) window.lucide.createIcons();
};
