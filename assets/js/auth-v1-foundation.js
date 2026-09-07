/* Auth V1 foundation: backend session authority before the temporary DEV browser bridge. */
(() => {
    const Backend = window.BisiBackend;
    if (!Backend || !window.BisiBackendConnection) return;

    const originalOpenDevBridgeSession = Backend.openDevBridgeSession.bind(Backend);
    Backend.openDevBridgeSession = async function(options = {}) {
        const current = await Backend.getSession();
        if (current?.authenticated) {
            return {
                ok: true,
                browserBridge: true,
                reusedAuthenticatedSession: true,
                csrfToken: current.csrfToken || Backend.csrfToken()
            };
        }
        return originalOpenDevBridgeSession(options);
    };

    const localSessionActive = () => !!window.BisiSessionRuntime?.isAuthenticated?.();
    let state = 'idle';
    let readyPromise = null;
    let sessionSnapshot = null;
    let profileSnapshot = null;

    const reset = () => {
        state = 'idle';
        readyPromise = null;
        sessionSnapshot = null;
        profileSnapshot = null;
    };

    async function establish({ force = false, signal = null } = {}) {
        if (!Backend.isEnabled?.()) return { connected: false, reason: 'disabled' };
        if (!force && state === 'ready' && sessionSnapshot?.authenticated)
            return { connected: true, session: sessionSnapshot, profile: profileSnapshot };
        if (!force && readyPromise) return readyPromise;

        state = 'connecting';
        readyPromise = (async () => {
            try {
                let session = await Backend.getSession();
                if (!session?.authenticated) {
                    if (!localSessionActive()) {
                        state = 'idle';
                        readyPromise = null;
                        return { connected: false, reason: 'no-session' };
                    }
                    if (Backend.devBridgeIsEnabled?.()) {
                        const login = await originalOpenDevBridgeSession({ signal });
                        if (!login?.browserBridge || !login?.csrfToken)
                            throw Object.assign(new Error('bisi-dev-bridge-failed'), { status: 401 });
                        session = await Backend.getSession();
                    }
                }
                if (!session?.authenticated)
                    throw Object.assign(new Error('bisi-backend-session-missing'), { status: 401 });

                const profile = await Backend.getProfile();
                sessionSnapshot = session;
                profileSnapshot = profile?.profile || null;
                state = 'ready';
                document.dispatchEvent(new CustomEvent('bisi:backend-connected', { detail: { profile: profileSnapshot } }));
                return { connected: true, session: sessionSnapshot, profile: profileSnapshot };
            } catch (error) {
                state = 'error';
                readyPromise = null;
                document.dispatchEvent(new CustomEvent('bisi:backend-connection-error', {
                    detail: { status: Number(error?.status || 0), code: error?.code || null }
                }));
                throw error;
            }
        })();
        return readyPromise;
    }

    async function withSession(fn, { signal = null } = {}) {
        if (typeof fn !== 'function') throw new TypeError('Bisi backend operation must be a function');
        try {
            await establish({ signal });
            return await fn();
        } catch (error) {
            if (error?.status !== 401 && error?.status !== 403) throw error;
            await establish({ force: true, signal });
            return fn();
        }
    }

    const api = Object.freeze({
        connect: establish,
        ensureSession: establish,
        withSession,
        probePlannerTransport: ({ signal = null } = {}) => withSession(async () => {
            const response = await Backend.listTasks();
            return { connected: true, tasks: Array.isArray(response?.tasks) ? response.tasks : [] };
        }, { signal }),
        updateProfile: async (patch, options = {}) => {
            const response = await withSession(() => Backend.updateProfile(patch), options);
            if (response?.profile) profileSnapshot = response.profile;
            return response;
        },
        getProfile: async (options = {}) => {
            const response = await withSession(() => Backend.getProfile(), options);
            if (response?.profile) profileSnapshot = response.profile;
            return response;
        },
        listTasks: (options = {}) => withSession(() => Backend.listTasks(), options),
        createTask: (task, options = {}) => withSession(() => Backend.createTask(task), options),
        updateTask: (id, patch, options = {}) => withSession(() => Backend.updateTask(id, patch, options), options),
        deleteTask: (id, options = {}) => withSession(() => Backend.deleteTask(id, options), options),
        status: () => state,
        profile: () => profileSnapshot,
        session: () => sessionSnapshot,
        reset
    });

    window.BisiBackendConnection = api;

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const session = await Backend.getSession();
            if (session?.authenticated) await establish();
        } catch {}
    }, { once: true });
    document.addEventListener('bisi:session-cleared', reset);
    window.addEventListener('online', () => {
        if (state !== 'ready') establish().catch(() => {});
    });
})();
