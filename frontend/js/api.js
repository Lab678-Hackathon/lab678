/**
 * API 요청 래퍼 — Core
 * JWT 자동 부착, Envelope 파싱, 오류 throw
 */
import { getToken } from "./auth.js";

const _BASE = (() => {
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8000";
  return window.__APP_CONFIG__?.apiBase ?? "";
})();

/**
 * @param {string} path
 * @param {RequestInit} options
 * @returns {Promise<any>} Envelope.data
 */
export async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const envelope = await res.json();

  if (!envelope.ok) {
    const err = new Error(envelope.error?.message ?? "Request failed");
    err.code = envelope.error?.code;
    err.status = res.status;
    throw err;
  }

  return envelope.data;
}

// ── 편의 함수 ──────────────────────────────────────
export const get  = (path, opts = {}) => request(path, { method: "GET",    ...opts });
export const post = (path, body, opts = {}) => request(path, { method: "POST",   body, ...opts });
export const put  = (path, body, opts = {}) => request(path, { method: "PUT",    body, ...opts });
export const del  = (path, opts = {}) => request(path, { method: "DELETE",  ...opts });
