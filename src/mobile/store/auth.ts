type AuthUser = {
  email: string;
  name?: string;
  role?: string;
};

type AuthState = {
  isLoggedIn: boolean;
  email: string | null;
  user: AuthUser | null;
  login: (email?: string, password?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
};

const state: AuthState = {
  isLoggedIn: false,
  email: null,
  user: null,
  login: async () => {},
  loginDemo: async () => {},
  logout: () => {},
};

export function useAuthStore<T = AuthState>(
  selector?: (state: AuthState) => T
): T {
  return selector ? selector(state) : (state as T);
}

export default useAuthStore;
export type { AuthState };
