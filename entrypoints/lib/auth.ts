import { supabase } from './supabaseClient';
import type { Profile } from './types';

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!supabase) {
    return null;
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user?.email) {
    return null;
  }

  const displayName = user.user_metadata?.display_name || user.email.split('@')[0];
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: displayName,
  });

  return {
    id: user.id,
    email: user.email,
    displayName,
  };
}

export async function signUp(email: string, password: string, displayName?: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
    },
  });

  if (error) {
    throw error;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}
