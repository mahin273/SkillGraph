import { isAxiosError } from "axios";
import { ArrowLeft, Mail, ShieldCheck, Github } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GitHubConnectButton } from "../components/auth/GitHubConnectButton";
import { GoogleConnectButton } from "../components/auth/GoogleConnectButton";
import { getInvitationDetails, loginWithEmail, registerWithEmail, verifyEmail } from "../services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function authError(error: unknown) {
  if (isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialMode = location.pathname === "/signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup" | "verify">(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [verificationToken, setVerificationToken] = useState("");
  const [devVerificationToken, setDevVerificationToken] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const [inviteToken, setInviteToken] = useState<string>("");
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    role: string;
    university: { name: string };
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setMode("signup");
      setLoading(true);
      getInvitationDetails(token)
        .then((details) => {
          setInvitationDetails(details);
          setEmail(details.email);
          setRole(details.role.toLowerCase());
        })
        .catch((err) => {
          setError(authError(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [location.search]);

  const title = useMemo(() => {
    if (mode === "signup") return "Create your SkillGraph account";
    if (mode === "verify") return "Confirm your email";
    return "Log in to SkillGraph";
  }, [mode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);
 
    try {
      if (mode === "signup") {
        const result = await registerWithEmail({ 
          fullName, 
          email, 
          password, 
          role, 
          inviteToken: inviteToken || undefined 
        });
        setDevVerificationToken(result.verificationToken);
        setVerificationToken(result.verificationToken ?? "");
        setMode("verify");
      } else if (mode === "verify") {
        await verifyEmail(verificationToken);
        navigate("/dashboard");
      } else {
        await loginWithEmail({ email, password });
        navigate("/dashboard");
      }
    } catch (submitError) {
      setError(authError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f6f7f9] text-[#17202a] lg:grid-cols-[minmax(0,1.2fr)_540px] lg:p-0 font-sans antialiased">
      {/* Left Banner Section (Dark Premium Layout) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#07111f] p-12 text-white lg:flex border-r border-white/5">
        {/* Glow lights */}
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors relative z-10 font-outfit">
          <ArrowLeft className="size-4" />
          Back to landing
        </Link>
        
        <div className="relative z-10 max-w-lg my-auto">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-blue-400 font-outfit">SkillGraph Platform</p>
          <h1 className="text-5xl font-bold tracking-tight font-outfit bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-450 leading-[1.15]">
            One account, many ways in.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Start with email, Google, or GitHub. If you do not connect GitHub now, you can add it later at any time from your settings panel.
          </p>
        </div>

        <div className="grid gap-3.5 text-sm relative z-10 max-w-md">
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-md shadow-sm">
            <ShieldCheck className="size-5 text-blue-400 shrink-0" />
            <span className="text-slate-300 leading-normal">Email confirmation for manual accounts</span>
          </div>
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-md shadow-sm">
            <Github className="size-5 text-purple-400 shrink-0" />
            <span className="text-slate-300 leading-normal">GitHub can be linked later for repository scanning</span>
          </div>
        </div>
      </section>

      {/* Right Form Card Section */}
      <section className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-12 lg:max-w-xl lg:px-14 bg-[#f6f7f9]">
        <div className="mb-6 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors font-outfit">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_35px_rgba(0,0,0,0.045)] transition-shadow duration-300">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">{title}</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {mode === "verify"
              ? "Paste the confirmation token sent to your email."
              : "Choose an OAuth provider or use email and password."}
          </p>

          {mode !== "verify" && !invitationDetails && (
            <div className="mt-6 grid gap-2.5">
              <GoogleConnectButton />
              <GitHubConnectButton />
            </div>
          )}

          {mode !== "verify" && !invitationDetails && (
            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-100" />
              or use email
              <div className="h-px flex-1 bg-slate-100" />
            </div>
          )}

          {mode === "signup" && invitationDetails && (
            <div className="mt-5 mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 flex gap-2.5 items-start">
              <ShieldCheck className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Invited Account</strong>: You are joining <strong>{invitationDetails.university?.name}</strong> as <strong>{invitationDetails.role}</strong>. Your role and email settings are managed by your administrator.
              </div>
            </div>
          )}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Full name
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="e.g. Rahim Islam" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Role
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      disabled={!!invitationDetails}
                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer font-medium text-slate-700"
                    >
                      <option value="student">Student</option>
                      <option value="alumni">Alumni / Mentor</option>
                      <option value="professor">Professor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="size-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </label>
              </>
            )}

            {mode !== "verify" ? (
              <>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Email
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!!invitationDetails} required placeholder="you@university.edu" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Password
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "signup" ? 8 : undefined} placeholder="••••••••" />
                </label>
              </>
            ) : (
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Confirmation token
                <Input value={verificationToken} onChange={(event) => setVerificationToken(event.target.value)} required placeholder="Enter verification code" />
              </label>
            )}

            {devVerificationToken && (
              <div className="rounded-xl border border-blue-150 bg-blue-50/50 p-4.5 text-xs text-blue-800 leading-normal">
                Development verification token: <span className="font-mono font-bold">{devVerificationToken}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 leading-normal">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="mt-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
              {loading ? "Please wait..." : mode === "signup" ? "Create Account" : mode === "verify" ? "Confirm Email" : "Log In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === "signup" ? (
              <button className="font-semibold text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50" disabled={!!invitationDetails} onClick={() => setMode("login")}>
                Already have an account? Log in
              </button>
            ) : (
              <button className="font-semibold text-blue-600 hover:text-blue-500 transition-colors" onClick={() => setMode("signup")}>
                New here? Create an account
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
