"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../../_components/PortalShell";
import { Alert } from "../../_components/ui/Alert";
import { Button } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { CheckboxField, TextField } from "../../_components/ui/FormField";
import { formatDate, initials } from "../../_lib/format";
import { useCurrentCustomer, useSession } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import type { NotificationPreferences } from "../../_lib/types";
import { isValidEmail, isValidPhone } from "../../_lib/validation";

type ProfileErrors = Partial<Record<"firstName" | "lastName" | "email" | "phone", string>>;

const PREFERENCE_LABELS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "emailTransferUpdates", label: "Email transfer updates", description: "Status changes and receipts by email." },
  { key: "smsTransferUpdates", label: "SMS transfer updates", description: "Text messages when a transfer changes status." },
  { key: "rateAlerts", label: "Exchange-rate alerts", description: "Tell me when the CAD → ETB rate changes." },
  { key: "marketing", label: "News and offers", description: "Occasional product news from BusinessFlow." },
];

export default function AccountPage() {
  const customer = useCurrentCustomer();
  const { setCustomer, signOut, resetDemo } = useSession();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [prefs, setPrefs] = useState<NotificationPreferences>(customer.notificationPreferences);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [showPasswordNote, setShowPasswordNote] = useState(false);
  const [leaving, setLeaving] = useState<"logout" | "reset" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function startEditing() {
    setForm({ firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone });
    setErrors({});
    setProfileMessage(null);
    setEditing(true);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const next: ProfileErrors = {};
    if (!form.firstName.trim()) next.firstName = "Enter your first name.";
    if (!form.lastName.trim()) next.lastName = "Enter your last name.";
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!isValidPhone(form.phone)) next.phone = "Enter a valid phone number (10–15 digits).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await customerData.updateProfile(customer.id, form);
      setCustomer(updated);
      setEditing(false);
      setProfileMessage({ tone: "success", text: "Your profile was updated (demo)." });
    } catch (err) {
      setProfileMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not update your profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePreferences() {
    setSavingPrefs(true);
    setPrefsMessage(null);
    try {
      const updated = await customerData.updateNotificationPreferences(customer.id, prefs);
      setCustomer(updated);
      setPrefsMessage({ tone: "success", text: "Notification preferences saved (demo — no messages are sent)." });
    } catch (err) {
      setPrefsMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not save preferences." });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleLogout() {
    setLeaving("logout");
    await signOut();
    router.replace("/customer");
  }

  async function handleReset() {
    setLeaving("reset");
    await resetDemo();
    router.replace("/customer");
  }

  const prefsChanged = JSON.stringify(prefs) !== JSON.stringify(customer.notificationPreferences);

  return (
    <>
      <PageHeader title="My Account" description="Manage your personal details and preferences." />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card
            title="Personal information"
            action={!editing && <Button variant="secondary" onClick={startEditing}>Edit profile</Button>}
          >
            {profileMessage && <Alert tone={profileMessage.tone} className="mb-4">{profileMessage.text}</Alert>}
            {editing ? (
              <form onSubmit={saveProfile} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="First name" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} />
                  <TextField label="Last name" autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
                </div>
                <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
                <TextField label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => setEditing(false)} disabled={savingProfile}>Cancel</Button>
                  <Button type="submit" loading={savingProfile} loadingText="Saving…">Save changes</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {initials(customer.firstName, customer.lastName)}
                </span>
                <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><dt className="text-xs text-slate-500">Full name</dt><dd className="break-words font-medium text-slate-900">{customer.firstName} {customer.lastName}</dd></div>
                  <div className="min-w-0"><dt className="text-xs text-slate-500">Email</dt><dd className="break-all font-medium text-slate-900">{customer.email}</dd></div>
                  <div className="min-w-0"><dt className="text-xs text-slate-500">Phone</dt><dd className="font-medium text-slate-900">{customer.phone}</dd></div>
                  <div className="min-w-0"><dt className="text-xs text-slate-500">Member since</dt><dd className="font-medium text-slate-900">{formatDate(customer.createdAt)}</dd></div>
                </dl>
              </div>
            )}
          </Card>

          <Card title="Notification preferences" description="Choose how we keep you updated.">
            <div className="space-y-2">
              {PREFERENCE_LABELS.map((item) => (
                <CheckboxField
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={prefs[item.key]}
                  onChange={(e) => {
                    setPrefs({ ...prefs, [item.key]: e.target.checked });
                    setPrefsMessage(null);
                  }}
                />
              ))}
            </div>
            {prefsMessage && <Alert tone={prefsMessage.tone} className="mt-4">{prefsMessage.text}</Alert>}
            <div className="mt-4 flex justify-end">
              <Button onClick={savePreferences} disabled={!prefsChanged} loading={savingPrefs} loadingText="Saving…">
                Save preferences
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Security">
            <p className="text-sm text-slate-600">Keep your account secure with a strong, unique password.</p>
            <Button variant="secondary" fullWidth className="mt-4" onClick={() => setShowPasswordNote((v) => !v)} aria-expanded={showPasswordNote}>
              Change password
            </Button>
            {showPasswordNote && (
              <Alert tone="info" className="mt-3" title="Not available in the demo">
                Password changes will be handled securely by the authentication provider in the live portal.
              </Alert>
            )}
          </Card>

          <Card title="Session">
            <Button variant="secondary" fullWidth onClick={handleLogout} loading={leaving === "logout"} loadingText="Signing out…" disabled={leaving !== null}>
              Logout
            </Button>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">Reset demo data</p>
              <p className="mt-1 text-xs text-slate-500">
                Restores the original synthetic recipients and transfers in this browser and signs you out.
              </p>
              {confirmReset ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="danger" onClick={handleReset} loading={leaving === "reset"} loadingText="Resetting…" disabled={leaving !== null}>
                    Yes, reset
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReset(false)} disabled={leaving !== null}>Cancel</Button>
                </div>
              ) : (
                <Button variant="ghost" className="mt-2 px-0 text-red-700 hover:bg-transparent hover:underline" onClick={() => setConfirmReset(true)}>
                  Reset demo data…
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
