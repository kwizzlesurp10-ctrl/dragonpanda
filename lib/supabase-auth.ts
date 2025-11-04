import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

export interface AuthError {
  message: string;
  status?: number;
}

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
  });

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabaseAuth.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  return { session, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabaseAuth.auth.updateUser({
    password: newPassword,
  });

  return { data, error };
};
