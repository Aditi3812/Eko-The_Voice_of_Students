export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT' | 'PERSONAL_USER';
  is_school_email: boolean;
  access_token: string;
}

const TOKEN_KEY = 'eko_auth_token';
const USER_KEY = 'eko_auth_user';
const CONTEXT_KEY = 'eko_active_context'; // 'SCHOOL' | 'PERSONAL'

export const saveAuthData = (data: AuthUser, contextMode?: 'SCHOOL' | 'PERSONAL') => {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  const activeContext = contextMode || (data.is_school_email ? 'SCHOOL' : 'PERSONAL');
  localStorage.setItem(CONTEXT_KEY, activeContext);
};

export const getAuthUser = (): AuthUser | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const getActiveContext = (): 'SCHOOL' | 'PERSONAL' => {
  return (localStorage.getItem(CONTEXT_KEY) as 'SCHOOL' | 'PERSONAL') || 'PERSONAL';
};

export const setActiveContext = (mode: 'SCHOOL' | 'PERSONAL') => {
  localStorage.setItem(CONTEXT_KEY, mode);
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CONTEXT_KEY);
  window.location.href = '/login';
};