// Auth module - not used in this standalone local app
// Kept as empty stub to avoid breaking _core internal imports

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  return null;
}

export async function setSessionToken(_token: string): Promise<void> {}

export async function removeSessionToken(): Promise<void> {}

export async function getUserInfo(): Promise<User | null> {
  return null;
}

export async function setUserInfo(_user: User): Promise<void> {}

export async function clearUserInfo(): Promise<void> {}
