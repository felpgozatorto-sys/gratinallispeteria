import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

export default function Register() {
  const { register, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await register(name, email, password);
      toast.success("Conta criada! Boas-vindas à Gratinalli 🔥");
      navigate(next);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const onGoogleSuccess = async (response) => {
    setLoading(true); setErr("");
    try {
      await loginGoogle(response.credential);
      toast.success("Cadastro Google realizado!");
      navigate(next);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-cream p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-baunilha">
        <Link to="/" className="text-marrom/70 text-sm hover:text-marrom">← Voltar</Link>
        <h2 className="font-heading text-4xl text-marrom mt-4">Criar conta</h2>
        <p className="text-marrom/60 mt-1">Em 30s você está pedindo.</p>

        <div data-testid="google-register-wrapper" className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => setErr("Falha ao autenticar com Google")}
            theme="filled_black"
            text="signup_with"
            shape="pill"
            size="large"
            width="320"
            locale="pt-BR"
          />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-marrom/50">
          <div className="flex-1 h-px bg-baunilha" />
          ou crie com e-mail
          <div className="flex-1 h-px bg-baunilha" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            data-testid="register-name-input"
            required value={name} onChange={(e)=>setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full h-12 px-4 rounded-2xl border border-baunilha bg-white focus:outline-none focus:ring-2 focus:ring-dourado/60"
          />
          <input
            data-testid="register-email-input"
            type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="w-full h-12 px-4 rounded-2xl border border-baunilha bg-white focus:outline-none focus:ring-2 focus:ring-dourado/60"
          />
          <input
            data-testid="register-password-input"
            type="password" required minLength={4} value={password} onChange={(e)=>setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full h-12 px-4 rounded-2xl border border-baunilha bg-white focus:outline-none focus:ring-2 focus:ring-dourado/60"
          />
          {err && <div data-testid="register-error" className="text-sm text-red-600">{err}</div>}
          <button
            data-testid="register-submit-button"
            type="submit" disabled={loading}
            className="w-full h-12 rounded-full bg-terracota text-white font-semibold hover:bg-marrom"
          >
            {loading ? "Criando..." : "Cadastrar"}
          </button>
        </form>

        <p className="text-sm text-marrom/70 mt-5 text-center">
          Já tem conta?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-terracota font-semibold hover:text-marrom">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
