/* Auth V1 foundation: backend session authority before the temporary DEV browser bridge. */
(() => {
    const Backend = window.BisiBackend;
    if (!Backend || !window.BisiBackendConnection) return;

    const TUTORIAL_VERSION = 3;
    const CHARACTER_INTRO_VERSION = 1;
    const TOUR_KEY = 'wabi.postonboarding.video.v3.completed';
    const INTRO_KEY = 'wabi.v17.character.introduced';
    const PROFILE_KEY = 'wabi.beta.profile';
    const INTRO_PREFERENCE_KEY = 'characterIntroVersionCompleted';
    const Persistence = window.WabiPersistence;
    const originalPersistenceSet = typeof Persistence?.set === 'function' ? Persistence.set.bind(Persistence) : null;
    const originalPersistenceRemove = typeof Persistence?.remove === 'function' ? Persistence.remove.bind(Persistence) : null;

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

    const numericVersion = value => {
        const version = Number(value);
        return Number.isInteger(version) && version > 0 ? version : 0;
    };
    const localValue = key => {
        try { return Persistence?.get?.(key) ?? null; }
        catch { return null; }
    };
    const setLocalCompleted = key => {
        try { originalPersistenceSet?.(key, '1'); }
        catch {}
    };
    const clearLocalCompleted = key => {
        try { originalPersistenceRemove?.(key); }
        catch {}
    };

    function serverUserId(session, profile) {
        return profile?.id || session?.user?.id || session?.profile?.id || null;
    }

    function legacyLocalStateBelongsToUser(session, profile) {
        const id = serverUserId(session, profile);
        if (!id) return false;
        try {
            const localProfile = Persistence?.readJSON?.(PROFILE_KEY, null);
            return !!localProfile?.userId && String(localProfile.userId) === String(id);
        } catch {
            return false;
        }
    }

    async function persistTutorialCompletion() {
        if (!sessionSnapshot?.authenticated) return null;
        const response = await Backend.request('/me/tutorial', {
            method: 'PATCH',
            body: { version: TUTORIAL_VERSION }
        });
        if (response?.profile) profileSnapshot = response.profile;
        return response;
    }

    async function persistCharacterIntroCompletion() {
        if (!sessionSnapshot?.authenticated) return null;
        const response = await Backend.updateProfile({
            preferences: { [INTRO_PREFERENCE_KEY]: CHARACTER_INTRO_VERSION }
        });
        if (response?.profile) profileSnapshot = response.profile;
        return response;
    }

    async function persistFirstRunKey(key) {
        try {
            if (key === TOUR_KEY) await persistTutorialCompletion();
            else if (key === INTRO_KEY) await persistCharacterIntroCompletion();
        } catch {
            // Local completion remains valid for this browser. The next authenticated
            // connection will retry the server backfill for the same canonical user.
        }
    }

    if (Persistence && originalPersistenceSet) {
        Persistence.set = function(key, value) {
            const result = originalPersistenceSet(key, value);
            if (String(value) === '1' && (key === TOUR_KEY || key === INTRO_KEY)) {
                Promise.resolve().then(() => persistFirstRunKey(key));
            }
            return result;
        };
    }

    async function synchronizeFirstRunState(session, profile) {
        if (!profile || !Persistence) return profile;
        let currentProfile = profile;
        const legacyBelongsToCurrentUser = legacyLocalStateBelongsToUser(session, currentProfile);

        const serverTutorialVersion = numericVersion(currentProfile.tutorialVersionCompleted);
        const localTutorialCompleted = localValue(TOUR_KEY) === '1';
        if (serverTutorialVersion >= TUTORIAL_VERSION) {
            setLocalCompleted(TOUR_KEY);
        } else if (legacyBelongsToCurrentUser && localTutorialCompleted) {
            try {
                const response = await Backend.request('/me/tutorial', {
                    method: 'PATCH',
                    body: { version: TUTORIAL_VERSION }
                });
                if (response?.profile) currentProfile = response.profile;
            } catch {
                // A staged DEV deploy may briefly have the old backend. Keep the local
                // completion and retry on the next authenticated connection.
            }
        } else {
            clearLocalCompleted(TOUR_KEY);
        }

        const serverIntroVersion = numericVersion(currentProfile?.preferences?.[INTRO_PREFERENCE_KEY]);
        const localIntroCompleted = localValue(INTRO_KEY) === '1';
        if (serverIntroVersion >= CHARACTER_INTRO_VERSION) {
            setLocalCompleted(INTRO_KEY);
        } else if (legacyBelongsToCurrentUser && localIntroCompleted) {
            try {
                const response = await Backend.updateProfile({
                    preferences: { [INTRO_PREFERENCE_KEY]: CHARACTER_INTRO_VERSION }
                });
                if (response?.profile) currentProfile = response.profile;
            } catch {
                // Non-critical migration of legacy local state; retry later.
            }
        } else {
            clearLocalCompleted(INTRO_KEY);
        }

        return currentProfile;
    }

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
                profileSnapshot = await synchronizeFirstRunState(session, profile?.profile || null);
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
        updateOnboarding: async (patch, options = {}) => {
            const response = await withSession(() => Backend.updateOnboarding(patch, options), options);
            const source = response?.onboarding || response?.profile || response;
            const status = source?.onboardingStatus ?? source?.onboarding_status ?? source?.status ?? null;
            const currentStep = source?.onboardingCurrentStep ?? source?.onboarding_current_step ?? source?.currentStep ?? null;
            if (status) profileSnapshot = { ...(response?.profile || profileSnapshot || {}), onboardingStatus: status, onboardingCurrentStep: currentStep };
            else if (response?.profile) profileSnapshot = response.profile;
            return response;
        },
        updateTutorial: async (version = TUTORIAL_VERSION, options = {}) => {
            const response = await withSession(() => Backend.request('/me/tutorial', {
                method: 'PATCH',
                body: { version }
            }), options);
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

    async function resolveBackendAuthState() {
        if (window.__bisiOAuthHandoffPending) return;
        try {
            const session = await Backend.getSession();
            if (!session?.authenticated) {
                window.__bisiApplyBackendAuthState?.({ session });
                return;
            }
            const connection = await establish();
            window.__bisiApplyBackendAuthState?.({
                session: connection?.session || session,
                profile: connection?.profile || null
            });
        } catch (error) {
            window.__bisiApplyBackendAuthState?.({ error });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        resolveBackendAuthState();
    }, { once: true });
    document.addEventListener('bisi:session-cleared', reset);
    window.addEventListener('online', () => {
        if (state !== 'ready') resolveBackendAuthState();
    });
})();
