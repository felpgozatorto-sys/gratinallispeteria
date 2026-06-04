import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiError } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

export default function Login() {
  const { login, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const u = await login(email, password);
      toast.success("Bem-vindo de volta!");
      navigate(u.role === "admin" ? "/admin" : next);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const onGoogleSuccess = async (response) => {
    setLoading(true);
    setErr("");
    try {
      const u = await loginGoogle(response.credential);
      toast.success("Login Google realizado!");
      navigate(u.role === "admin" ? "/admin" : next);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleError = () => {
    setErr("Falha ao autenticar com Google. Tente novamente.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-cream">
      <div className="hidden lg:flex relative bg-marrom overflow-hidden">
        <img src="https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-marrom via-marrom/80 to-marrom/40" />
        <div className="relative z-10 p-12 self-end">
          <img src="/logo/gratinalli-light.png" alt="Gratinalli Speteria" className="w-72 mb-6" />
          <p className="text-baunilha text-lg opacity-90 max-w-md">
            Espetinhos artesanais grelhados no ponto certo. Acesse e veja os melhores combos da casa.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="text-marrom/70 text-sm hover:text-marrom">← Voltar</Link>
          <h2 className="font-heading text-4xl text-marrom mt-4">Entrar</h2>
          <p className="text-marrom/60 mt-1">Veja preços, salve endereços e acompanhe pedidos.</p>

          <div data-testid="google-login-wrapper" className="mt-6 flex justify-center">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              theme="filled_black"
              text="signin_with"
              shape="pill"
              size="large"
              width="320"
              locale="pt-BR"
            />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-marrom/50">
            <div className="flex-1 h-px bg-baunilha" />
            ou com e-mail
            <div className="flex-1 h-px bg-baunilha" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-marrom/70 font-semibold">E-mail</label>
              <input
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-12 px-4 rounded-2xl border border-baunilha bg-white focus:outline-none focus:ring-2 focus:ring-dourado/60"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-marrom/70 font-semibold">Senha</label>
              <input
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-12 px-4 rounded-2xl border border-baunilha bg-white focus:outline-none focus:ring-2 focus:ring-dourado/60"
                placeholder="••••••••"
              />
            </div>
            {err && <div data-testid="login-error" className="text-sm text-red-600">{err}</div>}
            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-terracota text-white font-semibold hover:bg-marrom transition-colors disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-sm text-marrom/70 mt-5 text-center">
            Não tem conta?{" "}
            <Link data-testid="goto-register" to={`/cadastro?next=${encodeURIComponent(next)}`} className="text-terracota font-semibold hover:text-marrom">
              Crie agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
