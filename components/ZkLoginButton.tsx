"use client";

// zkLogin disabled — networking issues
export function useZkLogin() {
  return { address: null, loading: false, error: null, login: () => {}, logout: () => {} };
}

export default function ZkLoginButton() {
  return null;
}