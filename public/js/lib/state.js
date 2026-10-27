// Session-scoped app state (the current user and server-provided option lists). Real data always comes from the API.
export const state = { user: null, meta: null };
export const isAdmin = () => state.user && state.user.role === 'admin';
