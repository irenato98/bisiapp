/* Auth V1 OAuth handoff: real Google/Microsoft auth for cross-site DEV. */
(() => {
    'use strict';

    const Backend = window.BisiBackend;
    const Persistence = window.WabiPersistence;
    const Config = window.BISI_BACKEND_CONFIG;
    if (!Backend || !Persistence || !Config?.apiBase) return;

    const SESSION_KEY = 'wabi.beta.session';
    const PROFILE_KEY = 'wabi.beta.profile';
    const AUTH_MODE_KEY = 'bisi.auth.oauth.mode.v1';
    const HANDOFF_PARAM = 'bisi_auth_handoff';
    const handoffAtLoad = !!new URLSearchParams(window.location.hash.replace(/^#/, '')).get(HANDOFF_PARAM);
    window.__bisiOAuthHandoffPending = handoffAtLoad;
    let starting = false;
    let exchanging = false;

    const providerSlug = value => value === 'Google' ? 'google' : value === 'Microsoft' ? 'microsoft' : null;
    const providerLabel = value => value === 'microsoft' ? 'Microsoft' : 'Google';

    function saveAuthMode(mode) {
        try { sessionStorage.setItem(AUTH_MODE_KEY, mode === 'register' ? 'register' : 'login'); } catch {}
    }

    function takeAuthMode() {
        let mode = 'login';
        try {
            mode = sessionStorage.getItem(AUTH_MODE_KEY) === 'register' ? 'register' : 'login';
            sessionStorage.removeItem(AUTH_MODE_KEY);
        } catch {}
        return mode;
    }

    function cleanAuthUrl({ clearHash = false } = {}) {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('auth');
            url.searchParams.delete('provider');
            if (clearHash) url.hash = '';
            history.replaceState(history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
        } catch {}
    }

    function authModeFromButton(button) {
        const shell = button?.closest?.('[data-auth-mode]');
        const layer = document.getElementById('wabi-entry-onboarding');
        const mode = shell?.dataset?.authMode || layer?.dataset?.authMode || 'login';
        return mode === 'register' ? 'register' : 'login';
    }

    function showAuthError(message) {
        console.warn('[Bisi Auth]', message);
        try { window.alert(message); } catch {}
    }

    async function startOAuth(provider, mode) {
        if (starting) return;
        starting = true;
        try {
            const available = await Backend.request('/auth/providers');
            if (available?.providers?.[provider] !== true) {
                showAuthError(`${providerLabel(provider)} todavía no está configurado en el entorno DEV.`);
                return;
            }
            saveAuthMode(mode);
            const startUrl = `${String(Config.apiBase).replace(/\/$/, '')}/auth/${provider}/start`;
            window.location.assign(startUrl);
        } catch (error) {
            showAuthError(`No pudimos iniciar sesión con ${providerLabel(provider)}. Inténtalo nuevamente.`);
            console.warn('[Bisi Auth] OAuth start failed', error?.code || error?.status || error?.message || error);
        } finally {
            starting = false;
        }
    }

    function writeCompatibilitySession(session, provider) {
        const now = Date.now();
        const label = providerLabel(provider);
        const existingSession = Persistence.readJSON(SESSION_KEY, {}) || {};
        const existingProfile = Persistence.readJSON(PROFILE_KEY, {}) || {};
        const user = session?.user || {};
        const canonicalUserId = user.id || user.userId || null;
        const hasAvatarUrl = Object.prototype.hasOwnProperty.call(user, 'avatarUrl');
        const avatarUrl = hasAvatarUrl ? (window.BisiProfileIdentity?.safeAvatarUrl?.(user.avatarUrl) || null) : null;

        Persistence.writeJSON(SESSION_KEY, {
            ...existingSession,
            provider: label,
            userId: canonicalUserId,
            backendAuthenticated: true,
            createdAt: existingSession.createdAt || now
        });
        Persistence.writeJSON(PROFILE_KEY, {
            ...existingProfile,
            provider: label,
            userId: canonicalUserId,
            name: user.displayName || existingProfile.name || null,
            email: user.email || existingProfile.email || null,
            ...(hasAvatarUrl ? { avatarUrl } : {}),
            backendAuthenticated: true,
            createdAt: existingProfile.createdAt || now
        });
    }

    async function exchangeHandoffFromFragment() {
        if (exchanging || !window.location.hash) return false;

        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const handoffToken = params.get(HANDOFF_PARAM) || '';
        if (!handoffToken) return false;

        exchanging = true;
        const provider = params.get('provider') === 'microsoft' ? 'microsoft' : 'google';
        takeAuthMode();

        // Remove the one-time capability from the address bar before any network
        // request, log, analytics hook, copy action, or reload can retain it.
        cleanAuthUrl({ clearHash: true });

        try {
            const exchange = await Backend.request('/auth/handoff/exchange', {
                method: 'POST',
                body: { handoffToken }
            });
            if (!exchange?.exchanged || !exchange?.csrfToken)
                throw Object.assign(new Error('bisi-oauth-handoff-exchange-failed'), { status: 401 });
            Backend.setCsrfToken(exchange.csrfToken);

            const session = await Backend.getSession();
            if (!session?.authenticated || !session?.user?.id)
                throw Object.assign(new Error('bisi-oauth-session-missing-after-handoff'), { status: 401 });

            writeCompatibilitySession(session, provider);
            window.BisiBackendConnection?.reset?.();
            window.location.reload();
            return true;
        } catch (error) {
            window.__bisiOAuthHandoffPending = false;
            window.__bisiApplyBackendAuthState?.({ error });
            console.warn('[Bisi Auth] OAuth handoff failed', error?.code || error?.status || error?.message || error);
            showAuthError('No pudimos completar el inicio de sesión. Vuelve a intentarlo.');
            return false;
        } finally {
            exchanging = false;
        }
    }

    document.addEventListener('click', event => {
        const button = event.target?.closest?.('[data-entry-provider]');
        if (!button) return;
        if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;

        const providerName = button.dataset.entryProvider || '';
        const provider = providerSlug(providerName);

        // Stop the legacy local-only provider handler before it can create a fake
        // authenticated session. Apple stays unavailable until its dedicated phase.
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!provider) {
            showAuthError('Apple todavía no está habilitado en Bisi.');
            return;
        }

        startOAuth(provider, authModeFromButton(button));
    }, true);

    const query = new URLSearchParams(window.location.search);
    if (query.get('auth') === 'error') {
        const provider = query.get('provider') === 'microsoft' ? 'Microsoft' : 'Google';
        cleanAuthUrl();
        setTimeout(() => showAuthError(`No se pudo completar el inicio de sesión con ${provider}.`), 0);
    }

    // bisi.js has already rendered by the time this adapter loads. That is okay:
    // the handoff is consumed immediately, then a clean reload starts from the real
    // backend session plus a compatibility marker for legacy synchronous UI gates.
    exchangeHandoffFromFragment().catch(() => {});
})();
