// Applies to static forms and dynamically opened login/register dialogs.
(() => {
    'use strict';
    const icon = (visible) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible ? '<path d="m3 3 18 18"/>' : ''}</svg>`;
    function enhance(root) {
        root.querySelectorAll('input[type="password"]').forEach(input => {
            if (input.parentElement.classList.contains('password-control')) return;
            const wrap = document.createElement('span');
            wrap.className = 'password-control';
            input.before(wrap);
            wrap.append(input);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'password-toggle';
            if (input.id) button.setAttribute('aria-controls', input.id);
            const update = () => {
                const visible = input.type === 'text';
                const en = document.documentElement.lang === 'en';
                button.setAttribute('aria-label', visible ? (en ? 'Hide password' : 'Ẩn mật khẩu') : (en ? 'Show password' : 'Hiện mật khẩu'));
                button.setAttribute('aria-pressed', String(visible));
                button.innerHTML = icon(visible);
            };
            button.addEventListener('click', (event) => {
                event.preventDefault();
                input.type = input.type === 'password' ? 'text' : 'password';
                update();
            });
            wrap.append(button);
            update();
        });
    }
    enhance(document);
    new MutationObserver(() => enhance(document)).observe(document.body, { childList: true, subtree: true });
})();
