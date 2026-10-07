import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useApp } from '../../store/AppContext';
import type { KycDocumentType } from '../../types';

const documentHelp: Record<KycDocumentType, string> = {
  'national-id': 'Enter the number shown on your Nepal National ID.',
  citizenship: 'Enter the certificate number exactly as printed.',
  passport: 'Enter the number shown on your current passport.',
  'driving-licence': 'Enter the licence number shown on your driving licence.',
};

export default function KycVerification() {
  const { state, navigate, updateWorkerProfile, submitKyc } = useApp();
  const profile = state.workerProfile;
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [phoneMessage, setPhoneMessage] = useState('');
  const [form, setForm] = useState({
    documentType: 'national-id' as KycDocumentType,
    documentNumber: '',
    fileName: '',
    documentData: '',
  });
  const [formMessage, setFormMessage] = useState('');

  if (!profile) return null;

  const status = profile.kycStatus ?? 'not-verified';
  const maskedNumber = profile.kycDocumentNumber
    ? `••••${profile.kycDocumentNumber.slice(-4)}`
    : '';

  const savePhone = () => {
    const normalizedPhone = phone.trim();
    if (!/^[+]?[0-9\s()-]{7,20}$/.test(normalizedPhone)) {
      setPhoneMessage('Enter a valid phone number, including your country code if needed.');
      return;
    }
    updateWorkerProfile({ phone: normalizedPhone });
    setPhoneMessage('Phone number saved. SMS verification is not connected yet, so this number is not verified.');
  };

  const requestPhoneCode = () => {
    const normalizedPhone = phone.trim();
    if (!/^[+]?[0-9\s()-]{7,20}$/.test(normalizedPhone)) {
      setPhoneMessage('Enter a valid phone number before requesting a code.');
      return;
    }
    updateWorkerProfile({ phone: normalizedPhone });
    setPhoneMessage('SMS delivery is not connected yet. No code was sent, and this number is not verified.');
  };

  const handleDocumentFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setFormMessage('Choose a JPG, PNG, or PDF identity document.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormMessage('Choose a file smaller than 2 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(current => ({ ...current, fileName: file.name, documentData: String(reader.result) }));
      setFormMessage('');
    };
    reader.readAsDataURL(file);
  };

  const submitDocument = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = submitKyc(form);
    setFormMessage(error ?? 'Your identity document was submitted for review.');
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <button onClick={() => navigate('worker-profile')} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7-7-7 7-7" /></svg>
        Back to profile
      </button>

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Account security</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Verify your account</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">Confirm your contact details and submit an identity document for review.</p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 9h.01M11 9h5M8 13h8M8 16h5" /></svg>
          </span>
          <div><p className="text-sm font-bold text-stone-900">Phone number</p><p className="text-xs font-medium text-amber-700">Verification service not connected</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${status === 'verified' ? 'bg-teal-50 text-teal' : status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-500'}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10l4 4v14H3V3h4Zm5 7v6m-3-3h6" /></svg>
          </span>
          <div><p className="text-sm font-bold text-stone-900">Identity document</p><p className={`text-xs font-medium ${status === 'verified' ? 'text-teal' : status === 'pending' ? 'text-amber-700' : 'text-stone-500'}`}>{status === 'verified' ? 'Verified' : status === 'pending' ? 'In review' : 'Not submitted'}</p></div>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-stone-900">Phone number</h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">Use a number you can access. A one-time SMS code is required to verify it.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 block text-sm font-semibold text-stone-700">Mobile number</span>
            <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="+977 98XXXXXXXX" className="input-style" />
          </label>
          <button type="button" onClick={savePhone} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-primary hover:text-primary">Save number</button>
          <button type="button" onClick={requestPhoneCode} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Send verification code</button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">SMS verification is not connected yet</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">This preview cannot send or validate one-time codes. Your phone number will remain unverified until an SMS verification service is connected.</p>
        </div>
        {phoneMessage && <p role="status" className="mt-3 text-sm font-medium text-stone-600">{phoneMessage}</p>}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900">Identity document</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">Submit one current identity document. Your document details are not displayed on your public profile.</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${status === 'verified' ? 'bg-teal-50 text-teal' : status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
            {status === 'verified' ? 'Verified' : status === 'pending' ? 'In review' : 'Not verified'}
          </span>
        </div>

        {status === 'verified' ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal">Identity verified</p>
            <p className="mt-1 text-sm text-teal/80">Verified {profile.kycVerifiedDate || 'successfully'}.</p>
            {maskedNumber && <p className="mt-2 text-xs text-stone-600">Document ending in {maskedNumber.slice(-4)}</p>}
          </div>
        ) : status === 'pending' ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Your document is being reviewed</p>
            <p className="mt-1 text-sm text-amber-800">Submitted {profile.kycSubmittedDate || 'recently'}. You can leave this page while the review is pending.</p>
            {profile.kycDocumentFileName && <p className="mt-2 text-xs text-amber-800">{profile.kycDocumentFileName} · document ending in {maskedNumber.slice(-4)}</p>}
          </div>
        ) : (
          <form onSubmit={submitDocument} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Document type</span>
              <select value={form.documentType} onChange={event => setForm(current => ({ ...current, documentType: event.target.value as KycDocumentType }))} className="input-style">
                <option value="national-id">Nepal National ID</option>
                <option value="citizenship">Citizenship certificate</option>
                <option value="passport">Passport</option>
                <option value="driving-licence">Driving licence</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Document number</span>
              <input value={form.documentNumber} onChange={event => setForm(current => ({ ...current, documentNumber: event.target.value }))} minLength={4} maxLength={40} placeholder="Enter the number on your document" className="input-style" required />
              <span className="mt-1 block text-xs text-stone-500">{documentHelp[form.documentType]}</span>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Upload document</span>
              <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleDocumentFile} className="input-style" />
              <span className="mt-1 block text-xs text-stone-500">JPG, PNG, or PDF · Maximum 2 MB · Ensure the full document is readable.</span>
            </label>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stone-500">{form.fileName ? `Selected: ${form.fileName}` : 'No document selected.'}</p>
              <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Submit for review</button>
            </div>
          </form>
        )}
        {formMessage && <p role="status" className={`mt-4 text-sm font-medium ${formMessage.includes('submitted') ? 'text-teal' : 'text-primary-dark'}`}>{formMessage}</p>}
      </section>

      <p className="mt-5 text-xs leading-relaxed text-stone-500">This prototype stores verification details in the browser. A secure server-side review and SMS service are required before using this flow for real identity or phone verification.</p>
    </main>
  );
}
