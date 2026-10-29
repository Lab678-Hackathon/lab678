/**
 * Supabase Auth — Core
 * Anonymous Sign-in → Google OAuth Identity Linking
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let _client = null;
let _session = null;
let _ready = null;

function _getConfig() {
  const url  = window.__APP_CONFIG__?.supabaseUrl  ?? "";
  const key  = window.__APP_CONFIG__?.supabaseKey  ?? "";
  return { url, key };
}

export const ready = new Promise((resolve) => {
  _ready = resolve;
});

export async function init() {
  const { url, key } = _getConfig();
  if (!url || !key) { _ready(false); return; }

  _client = createClient(url, key);

  const { data } = await _client.auth.getSession();
  _session = data.session;

  _client.auth.onAuthStateChange((_event, session) => {
    _session = session;
  });

  // 비회원이면 Anonymous Sign-in으로 user_id 선발급
  if (!_session) {
    const { data: anonData } = await _client.auth.signInAnonymously();
    _session = anonData.session;
  }

  _ready(true);
}

export function onAuthChange(callback) {
  _client?.auth.onAuthStateChange((_event, session) => {
    _session = session;
    callback(session);
  });
}

export function isSignedIn() {
  return !!_session && !_session.user?.is_anonymous;
}

export async function getToken() {
  if (!_session) return null;
  const { data } = await _client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInWithGoogle() {
  await _client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  await _client.auth.signOut();
  _session = null;
}
