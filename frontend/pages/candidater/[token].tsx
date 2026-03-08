import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_BASE_URL } from "../../utils/config";

interface ActivityInfo {
  id: number;
  title: string;
  city: string;
  type: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalSeats: number;
  description?: string | null;
  imageUrl?: string | null;
  valid: boolean;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  inscriptionFormTitle?: string | null;
  inscriptionFormDescription?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  paymentStartDate?: string | null;
  paymentEndDate?: string | null;
}

export default function CandidaterPage() {
  const router = useRouter();
  const { token } = router.query;
  const [activity, setActivity] = useState<ActivityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingUser, setPendingUser] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!token || typeof token !== "string") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/public/inscription/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Lien invalide ou expiré");
        }
        const data = await res.json();
        if (!cancelled) {
          setActivity(data);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Impossible de charger l'activité");
          setActivity(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || typeof token !== "string" || !matricule.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/inscription/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          matricule: matricule.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Erreur lors de l'inscription");
      }
      setSuccess(true);
      setSuccessMessage(data?.message || "Candidature enregistrée avec succès");
      setPendingUser(!!data?.pendingUser);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  }

  function getTypeLabel(type: string) {
    const map: Record<string, string> = {
      FAMILY: "Famille",
      SINGLE: "Célibataire",
      COUPLE: "Couple",
    };
    return map[type] || type;
  }

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "—";
    }
  }

  const headerBar = (
    <header className="bg-[#176139] text-white shadow-md animate-slide-down">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="rounded-lg bg-white flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
          {!logoError ? (
            <img
              src="/logo-ocp.png"
              alt="Logo OCP"
              className="h-10 w-auto object-contain object-center"
              style={{ maxHeight: "2.5rem" }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-[#176139] font-bold text-lg px-2 py-1">OCP</span>
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Plateforme Excursion OCP</h1>
          <p className="text-xs text-white/85">Candidature en ligne</p>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {headerBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-[#176139] border-t-transparent animate-spin"
            aria-hidden
          />
          <p className="text-slate-600 animate-pulse-soft">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {headerBar}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 max-w-md text-center animate-scale-in">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Lien invalide ou expiré</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <p className="text-sm text-slate-500">
              Utilisez le lien partagé par votre direction pour candidater à une activité.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {headerBar}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 max-w-md text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#176139]/10 flex items-center justify-center animate-scale-in delay-150">
              <svg className="w-9 h-9 text-[#176139]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2 animate-fade-in delay-225">Candidature enregistrée</h1>
            <p className="text-slate-600 mb-2 animate-fade-in delay-300">
              {successMessage}
            </p>
            {pendingUser && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 animate-fade-in delay-375">
                Vous figurez désormais dans la liste des inscriptions. L&apos;administration complétera votre profil si besoin.
              </p>
            )}
            <p className="text-sm text-slate-500 mt-4 animate-fade-in delay-450">
              Vous serez informé des suites données (sélection, liste d&apos;attente, etc.) selon les
              procédures en vigueur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = activity?.valid && matricule.trim().length > 0;

  const hasRegistrationDates = activity?.registrationStartDate || activity?.registrationEndDate;
  const hasPaymentDates = activity?.paymentStartDate || activity?.paymentEndDate;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {headerBar}
      {/* Zone principale : 2 colonnes sur grand écran, tout visible */}
      <div className="flex-1 flex min-h-0 px-4 py-4 sm:py-6">
        <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Colonne gauche : résumé de l'activité */}
          <aside className="lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col min-h-0 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
              {activity?.imageUrl && (
                <div className="h-32 sm:h-36 flex-shrink-0 bg-slate-200 relative">
                  <img
                    src={activity.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#176139]/40 to-transparent" />
            </div>
              )}
              <div className="p-4 sm:p-5 flex flex-col min-h-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                  {activity?.inscriptionFormTitle || activity?.title}
                </h1>
                <p className="text-xs text-slate-500 mb-3">
                  {activity?.city} · {activity ? getTypeLabel(activity.type) : ""} · {activity?.durationDays} j · {activity?.totalSeats} places
                </p>
                {(activity?.inscriptionFormDescription || activity?.description) && (
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-4 mb-3">
                    {activity.inscriptionFormDescription || activity.description}
                  </p>
                )}
                <div className="p-3 rounded-xl bg-[#176139]/5 border border-[#176139]/20 flex-1 min-h-0">
                  <p className="text-xs font-semibold text-[#176139] uppercase tracking-wide mb-2">Dates</p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    <li><span className="text-slate-500">Activité :</span> {formatDate(activity?.startDate)} → {formatDate(activity?.endDate)}</li>
                    {hasRegistrationDates && (
                      <li><span className="text-slate-500">Inscriptions :</span> {formatDate(activity?.registrationStartDate)} → {formatDate(activity?.registrationEndDate)}</li>
                    )}
                    {hasPaymentDates && (
                      <li><span className="text-slate-500">Paiement :</span> {formatDate(activity?.paymentStartDate)} → {formatDate(activity?.paymentEndDate)}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </aside>

          {/* Colonne droite : formulaire */}
          <main className="flex-1 min-w-0 flex flex-col animate-fade-in-up delay-75">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-6 flex flex-col flex-1 min-h-0">
              {!activity?.valid && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Les inscriptions ne sont pas ouvertes pour cette activité
                  {activity?.validUntil && new Date(activity.validUntil) < new Date() && " (lien expiré)."}
                </div>
              )}

              {activity?.valid && (
                <>
                  <h2 className="text-base font-semibold text-slate-800 mb-1">Formulaire de candidature</h2>
                  <p className="text-xs text-slate-600 mb-4">Remplissez les champs ci-dessous pour valider votre candidature.</p>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 content-start">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 block mb-1">Prénom <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition duration-200 focus:border-[#176139] focus:ring-2 focus:ring-[#176139]/20 focus:outline-none"
                        autoComplete="given-name"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 block mb-1">Nom <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition duration-200 focus:border-[#176139] focus:ring-2 focus:ring-[#176139]/20 focus:outline-none"
                        autoComplete="family-name"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 block mb-1">Matricule <span className="text-red-500">*</span></span>
                      <input
                        type="text"
                        value={matricule}
                        onChange={(e) => setMatricule(e.target.value)}
                        placeholder="M12345"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition duration-200 focus:border-[#176139] focus:ring-2 focus:ring-[#176139]/20 focus:outline-none"
                        autoComplete="off"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 block mb-1">Adresse email</span>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@ocp.ma"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition duration-200 focus:border-[#176139] focus:ring-2 focus:ring-[#176139]/20 focus:outline-none"
                        autoComplete="email"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-slate-700 block mb-1">Téléphone</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition duration-200 focus:border-[#176139] focus:ring-2 focus:ring-[#176139]/20 focus:outline-none"
                        autoComplete="tel"
                      />
                    </label>
                    {error && (
                      <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
                    )}
                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={!canSubmit || submitting}
                        className="w-full py-3 rounded-xl bg-[#176139] hover:bg-[#0e4d2e] active:scale-[0.99] text-white font-semibold text-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#176139]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {submitting ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Envoi en cours…
                          </span>
                        ) : (
                          "Confirmer ma candidature"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
            <p className="text-center text-xs text-slate-500 mt-3">
              Plateforme Excursion OCP · Candidature sans connexion
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
