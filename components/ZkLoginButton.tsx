"use client";

import { useState, useEffect } from "react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  jwtToAddress,
} from "@mysten/sui/zklogin";
import { jwtDecode } from "jwt-decode";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

type ZkLoginState = {
  address: string | null;
  loading: boolean;
  error: string | null;
};

let grpcClient: SuiGrpcClient | null = null;
function getGrpcClient() {
  if (!grpcClient) {
    grpcClient = new SuiGrpcClient({
      network: "testnet",
      baseUrl: "https://fullnode.testnet.sui.io:443",
    });
  }
  return grpcClient;
}

export function useZkLogin() {
  const [state, setState] = useState<ZkLoginState>({ address: null, loading: false, error: null });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("id_token")) handleCallback();
    const saved = localStorage.getItem("zklogin_address");
    if (saved) setState(s => ({ ...s, address: saved }));
  }, []);

  async function login() {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      if (!GOOGLE_CLIENT_ID) throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");

      const ephemeralKeypair = new Ed25519Keypair();
      const ephemeralPublicKey = ephemeralKeypair.getPublicKey();

      let maxEpoch = 1000;
      try {
        const client = getGrpcClient();
        const sysState: any = await (client as any).getLatestSuiSystemState?.();
        if (sysState?.epoch) maxEpoch = Number(String(sysState.epoch)) + 10;
      } catch (e) {
        console.warn("Sui epoch fetch failed, using fallback maxEpoch:", e);
      }

      const randomness = generateRandomness();
      const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);

      sessionStorage.setItem("zklogin_key", JSON.stringify(Array.from(ephemeralKeypair.getSecretKey())));
      sessionStorage.setItem("zklogin_epoch", String(maxEpoch));
      sessionStorage.setItem("zklogin_randomness", randomness);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: window.location.origin,
        response_type: "id_token",
        scope: "openid email profile",
        nonce,
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } catch (err) {
      console.error("zkLogin error:", err);
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : "Login failed" }));
    }
  }

  async function handleCallback() {
    setState(s => ({ ...s, loading: true }));
    try {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const idToken = params.get("id_token");
      if (!idToken) throw new Error("No id_token");

      const maxEpoch = Number(sessionStorage.getItem("zklogin_epoch"));
      const randomness = sessionStorage.getItem("zklogin_randomness")!;
      const keyBytes = JSON.parse(sessionStorage.getItem("zklogin_key")!);
      const ephemeralKeypair = Ed25519Keypair.fromSecretKey(new Uint8Array(keyBytes));
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeypair.getPublicKey());

      fetch("https://prover-dev.mystenlabs.com/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jwt: idToken, extendedEphemeralPublicKey, maxEpoch, jwtRandomness: randomness, keyClaimName: "sub" }),
      }).then(r => r.json()).then(p => localStorage.setItem("zklogin_proof", JSON.stringify(p))).catch(console.warn);

      const decoded = jwtDecode(idToken) as any;
      // 3rd param `legacyAddress`: false = use current (non-legacy) address derivation
      const address = jwtToAddress(idToken, decoded.sub, false);

      localStorage.setItem("zklogin_address", address);
      localStorage.setItem("zklogin_jwt", idToken);
      window.history.replaceState({}, "", window.location.pathname);
      setState({ address, loading: false, error: null });
    } catch (err) {
      console.error("zkLogin callback error:", err);
      setState({ address: null, loading: false, error: "Authentication failed" });
    }
  }

  function logout() {
    ["zklogin_address","zklogin_proof","zklogin_jwt"].forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    setState({ address: null, loading: false, error: null });
  }

  return { ...state, login, logout };
}

export default function ZkLoginButton() {
  const { address, loading, error, login, logout } = useZkLogin();

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, background:"#111", border:"0.5px solid #222", fontSize:12, color:"#555" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:"#4f46e5", animation:"pulse 1s infinite" }}/>
      Connecting...
    </div>
  );

  if (address) return (
    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:8, background:"#0f0f1a", border:"0.5px solid #2a2a4a", fontSize:11 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80" }}/>
        <span style={{ color:"#818cf8", fontFamily:"monospace" }}>{address.slice(0,6)}...{address.slice(-4)}</span>
      </div>
      <button onClick={logout} style={{ padding:"4px 8px", borderRadius:6, fontSize:11, background:"transparent", border:"0.5px solid #222", color:"#555", cursor:"pointer", fontFamily:"inherit" }}>
        Sign out
      </button>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
      <button onClick={login}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer", background:"#0f0f1a", border:"0.5px solid #2a2a4a", color:"#a5b4fc", fontFamily:"inherit", width:"100%" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
      {error && <span style={{ fontSize:10, color:"#f87171" }}>{error}</span>}
    </div>
  );
}