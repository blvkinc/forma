// ============================================================
// FORMA — Seller studio / artwork / commission forms
// ============================================================
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, ChevronLeft, Plus, Trash2, Upload } from 'lucide-react';
import { ACCENT_SWATCHES, VISUAL_OPTIONS } from '../lib/ui';
import { ArtVisual } from '../components/shared';

const emptySample = () => ({ title: '', imageUrl: '', storagePath: '', localFileId: '', previewUrl: '', notes: '' });
const emptyProfileLink = () => ({ label: '', url: '' });
const isHttpsUrl = (value) => /^https:\/\/[^\s]+$/i.test(String(value || '').trim());

export const SellerApplicationForm = ({ profile, application, onSubmit, onUploadImage }) => {
  const steps = [
    { key: 'studio', label: 'Studio' },
    { key: 'links', label: 'Links' },
    { key: 'work', label: 'Work samples' },
    { key: 'proof', label: 'Proof' },
  ];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    studioName: '',
    handle: '',
    city: '',
    bio: '',
    artistStatement: '',
    portfolioUrl: '',
    profileLinks: [emptyProfileLink(), emptyProfileLink()],
    processNotes: '',
    sampleWorks: [emptySample(), emptySample(), emptySample()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState(null);

  useEffect(() => {
    const samples = Array.isArray(application?.sampleWorks) && application.sampleWorks.length
      ? application.sampleWorks
      : [emptySample(), emptySample(), emptySample()];
    const profileLinks = Array.isArray(application?.profileLinks) && application.profileLinks.length
      ? application.profileLinks
      : [emptyProfileLink(), emptyProfileLink()];
    setForm({
      studioName: application?.studioName || profile?.display_name || '',
      handle: application?.handle || profile?.handle || profile?.display_name || '',
      city: application?.city || profile?.city || '',
      bio: application?.bio || profile?.bio || '',
      artistStatement: application?.artistStatement || '',
      portfolioUrl: application?.portfolioUrl || '',
      profileLinks: [...profileLinks, emptyProfileLink()].slice(0, 8),
      processNotes: application?.processNotes || '',
      sampleWorks: [...samples, emptySample(), emptySample()].slice(0, 8),
    });
  }, [application, profile]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateProfileLink = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      profileLinks: prev.profileLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link
      ),
    }));
  };
  const addProfileLink = () => {
    setForm(prev => ({
      ...prev,
      profileLinks: prev.profileLinks.length >= 8 ? prev.profileLinks : [...prev.profileLinks, emptyProfileLink()],
    }));
  };
  const removeProfileLink = (index) => {
    setForm(prev => ({
      ...prev,
      profileLinks: prev.profileLinks.length <= 1
        ? [emptyProfileLink()]
        : prev.profileLinks.filter((_, linkIndex) => linkIndex !== index),
    }));
  };
  const updateSample = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      sampleWorks: prev.sampleWorks.map((sample, sampleIndex) =>
        sampleIndex === index ? { ...sample, [field]: value } : sample
      ),
    }));
  };
  const addSample = () => {
    setForm(prev => ({
      ...prev,
      sampleWorks: prev.sampleWorks.length >= 8 ? prev.sampleWorks : [...prev.sampleWorks, emptySample()],
    }));
  };
  const removeSample = (index) => {
    setForm(prev => ({
      ...prev,
      sampleWorks: prev.sampleWorks.length <= 1
        ? [emptySample()]
        : prev.sampleWorks.filter((_, sampleIndex) => sampleIndex !== index),
    }));
  };

  const uploadSampleImage = async (index, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!onUploadImage) {
      setError('Application image upload is not configured yet.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choose a PNG, JPG, GIF, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Application images must be 10MB or smaller.');
      return;
    }
    setUploadingIndex(index);
    try {
      const uploaded = await onUploadImage(file);
      setForm(prev => ({
        ...prev,
        sampleWorks: prev.sampleWorks.map((sample, sampleIndex) =>
          sampleIndex === index
            ? {
              ...sample,
              storagePath: uploaded?.storagePath || sample.storagePath || '',
              localFileId: uploaded?.localFileId || sample.localFileId || '',
              imageUrl: '',
              previewUrl: uploaded?.imageUrl || sample.previewUrl || '',
            }
            : sample
        ),
      }));
    } catch (err) {
      setError(err.message || 'Application image upload failed.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const completeSamples = form.sampleWorks.filter(sample =>
    sample.title.trim().length >= 2
    && sample.notes.trim().length >= 20
    && (isHttpsUrl(sample.imageUrl) || sample.storagePath || sample.localFileId || sample.previewUrl)
  );
  const validProfileLinks = form.profileLinks.filter(link => isHttpsUrl(link.url));
  const hasReviewSource = isHttpsUrl(form.portfolioUrl) || validProfileLinks.length > 0 || completeSamples.length > 0;
  const missingRequirements = [
    form.studioName.trim().length >= 2 ? '' : 'Enter a studio name.',
    form.artistStatement.trim().length >= 40 ? '' : 'Add an artist statement of at least 40 characters.',
    form.processNotes.trim().length >= 40 ? '' : 'Add process notes or proof of work of at least 40 characters.',
    hasReviewSource ? '' : 'Add an HTTPS portfolio/profile link or a completed sample with image and process notes.',
  ].filter(Boolean);
  const formValid = missingRequirements.length === 0;
  const canSaveDraft = form.studioName.trim().length >= 2;
  const activeStep = steps[step];

  const submit = async (event, status = 'pending') => {
    event.preventDefault();
    if (status === 'pending' && !formValid) {
      setError(missingRequirements[0] || 'Complete the required seller review fields.');
      return;
    }
    if (status === 'draft' && !canSaveDraft) {
      setError('Enter a studio name before saving a draft.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, status });
    } catch (err) {
      setError(err.message || 'Seller application failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => submit(event, 'pending')} className="hair-all bg-[var(--card)] w-full">
      <div className="p-5 sm:p-6 hair-b">
        <div className="label">Seller onboarding</div>
        <h2 className="display text-[30px] sm:text-[34px] mt-2">Apply for studio review.</h2>
        <p className="text-[13px] text-[var(--muted)] mt-3 max-w-[720px] leading-relaxed">
          Seller signup starts here: submit your studio identity, proof links, and sample images. Admins review the packet before listing, commission, feed, or studio publishing tools unlock.
        </p>
      </div>

      <div className="p-5 sm:p-6 hair-b">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {steps.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStep(index)}
              className={`hair-all p-3 text-left transition-colors ${step === index ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--bg)] hover:bg-[var(--bg-2)]'}`}
              aria-current={step === index ? 'step' : undefined}
            >
              <div className="mono text-[10px] uppercase tracking-[0.12em] opacity-70">{String(index + 1).padStart(2, '0')}</div>
              <div className="text-[13px] font-medium mt-1">{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="hair-b pb-3 mb-5 flex items-baseline justify-between gap-4">
          <div>
            <div className="label">Step {String(step + 1).padStart(2, '0')}</div>
            <h3 className="display text-[24px] mt-1">{activeStep.label}</h3>
          </div>
          {step === 1 && <button type="button" onClick={addProfileLink} className="swiss-btn ghost"><Plus size={12}/> Add link</button>}
          {step === 2 && <button type="button" onClick={addSample} className="swiss-btn ghost"><Plus size={12}/> Add sample</button>}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="seller-app-name" className="label mb-2 block">Studio name</label>
              <input id="seller-app-name" value={form.studioName} onChange={event => updateField('studioName', event.target.value)} className="swiss-input" maxLength={120} required/>
            </div>
            <div>
              <label htmlFor="seller-app-handle" className="label mb-2 block">Preferred handle</label>
              <input id="seller-app-handle" value={form.handle} onChange={event => updateField('handle', event.target.value)} className="swiss-input" maxLength={48}/>
            </div>
            <div>
              <label htmlFor="seller-app-city" className="label mb-2 block">City</label>
              <input id="seller-app-city" value={form.city} onChange={event => updateField('city', event.target.value)} className="swiss-input" maxLength={120}/>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="seller-app-bio" className="label mb-2 block">Studio bio</label>
              <textarea
                id="seller-app-bio"
                value={form.bio}
                onChange={event => updateField('bio', event.target.value)}
                className="swiss-input min-h-[120px]"
                maxLength={900}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="seller-app-statement" className="label mb-2 block">Artist statement</label>
              <textarea
                id="seller-app-statement"
                value={form.artistStatement}
                onChange={event => updateField('artistStatement', event.target.value)}
                className="swiss-input min-h-[150px]"
                maxLength={1200}
                placeholder="What you make, why it belongs on FORMA, and what collectors should understand about the work."
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="seller-app-portfolio" className="label mb-2 block">Primary portfolio URL</label>
              <input id="seller-app-portfolio" value={form.portfolioUrl} onChange={event => updateField('portfolioUrl', event.target.value)} className="swiss-input" maxLength={500} placeholder="https://"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {form.profileLinks.map((link, index) => (
                <div key={index} className="hair-all bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="label">Profile link {String(index + 1).padStart(2, '0')}</div>
                    <button type="button" onClick={() => removeProfileLink(index)} className="hair-all w-8 h-8 inline-flex items-center justify-center" aria-label={`Remove profile link ${index + 1}`}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <input
                    value={link.label}
                    onChange={event => updateProfileLink(index, 'label', event.target.value)}
                    className="swiss-input mb-3"
                    maxLength={80}
                    placeholder="Instagram, Behance, ArtStation"
                  />
                  <input
                    value={link.url}
                    onChange={event => updateProfileLink(index, 'url', event.target.value)}
                    className="swiss-input"
                    maxLength={500}
                    placeholder="https://"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {form.sampleWorks.map((sample, index) => {
              const imageSrc = sample.previewUrl || sample.imageUrl;
              return (
                <div key={index} className="hair-all bg-[var(--bg)] overflow-hidden">
                  <div className="aspect-[4/3] bg-[var(--bg-2)]">
                    {imageSrc ? (
                      <img src={imageSrc} alt={sample.title || `Sample ${index + 1}`} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
                        <Upload size={22}/>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="label">Sample {String(index + 1).padStart(2, '0')}</div>
                      <button type="button" onClick={() => removeSample(index)} className="hair-all w-8 h-8 inline-flex items-center justify-center" aria-label={`Remove sample ${index + 1}`}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                    <input
                      value={sample.title}
                      onChange={event => updateSample(index, 'title', event.target.value)}
                      className="swiss-input mb-3"
                      maxLength={140}
                      placeholder="Title"
                    />
                    <label htmlFor={`seller-sample-upload-${index}`} className="swiss-btn ghost w-full justify-center cursor-pointer mb-3">
                      <Upload size={12}/> {uploadingIndex === index ? 'Uploading...' : (sample.storagePath || sample.localFileId) ? 'Replace upload' : 'Upload image'}
                    </label>
                    <input
                      id={`seller-sample-upload-${index}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={event => uploadSampleImage(index, event)}
                      className="sr-only"
                    />
                    <input
                      value={sample.storagePath ? '' : sample.imageUrl}
                      onChange={event => updateSample(index, 'imageUrl', event.target.value)}
                      disabled={!!(sample.storagePath || sample.localFileId)}
                      className="swiss-input mb-3"
                      maxLength={500}
                      placeholder={(sample.storagePath || sample.localFileId) ? 'Private upload attached' : 'Optional external image URL'}
                    />
                    <textarea
                      value={sample.notes}
                      onChange={event => updateSample(index, 'notes', event.target.value)}
                      className="swiss-input min-h-[110px]"
                      maxLength={500}
                      placeholder="Process, tools, client, or provenance notes"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <label htmlFor="seller-app-process" className="label mb-2 block">Process notes / proof of work</label>
              <textarea
                id="seller-app-process"
                value={form.processNotes}
                onChange={event => updateField('processNotes', event.target.value)}
                className="swiss-input min-h-[220px]"
                maxLength={1200}
                placeholder="Describe your process, tools, source files, sketches, screen recordings, or other evidence admins should check."
              />
            </div>
            <div className="lg:col-span-5 hair-all bg-[var(--bg)] p-5">
              <div className="label">Review packet</div>
              <div className="space-y-3 mt-4 text-[13px]">
                {[
                  ['Studio', form.studioName || 'Missing'],
                  ['Links', String((isHttpsUrl(form.portfolioUrl) ? 1 : 0) + validProfileLinks.length)],
                  ['Samples', String(completeSamples.length)],
                  ['Statement', form.artistStatement.trim().length >= 40 ? 'Ready' : 'Needs detail'],
                ].map(([label, value]) => (
                  <div key={label} className="hair-b pb-3 flex justify-between gap-4 last:border-0">
                    <span className="text-[var(--muted)]">{label}</span>
                    <span className="mono text-right">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed mt-5">
                Approval creates the studio row, verifies the seller profile, and unlocks listings. Rejection keeps the account signed in but seller tools remain locked.
              </p>
              {formValid && (
                <div className="mt-5 flex items-center gap-2 text-[12px]">
                  <span className="w-5 h-5 bg-[var(--good)] text-white inline-flex items-center justify-center"><Check size={12}/></span>
                  Ready for admin review
                </div>
              )}
              {!formValid && (
                <div className="mt-5 hair-all bg-[var(--accent-soft)] text-[var(--accent)] p-3 text-[12px] leading-relaxed">
                  {missingRequirements[0]}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-[12px] text-[var(--accent)] mt-4">{error}</div>}
      </div>

      <div className="p-5 sm:p-6 hair-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button
          type="button"
          onClick={(event) => submit(event, 'draft')}
          disabled={saving || !canSaveDraft}
          className={`swiss-btn ghost justify-center ${saving || !canSaveDraft ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Save draft
        </button>
        {step > 0 && (
          <button type="button" onClick={() => setStep(current => Math.max(0, current - 1))} className="swiss-btn ghost justify-center">
            <ChevronLeft size={12}/> Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => setStep(current => Math.min(steps.length - 1, current + 1))} className="swiss-btn justify-center">
            Next <ArrowRight size={12}/>
          </button>
        ) : (
          <button type="submit" disabled={saving || !formValid || uploadingIndex !== null} className={`swiss-btn accent ${saving || !formValid || uploadingIndex !== null ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {saving ? 'Submitting...' : 'Submit for review'} <ArrowRight size={12}/>
          </button>
        )}
      </div>
    </form>
  );
};

export const SellerStudioForm = ({ profile, ownedArtist, onSubmit, onDone }) => {
  const [form, setForm] = useState({
    handle: '',
    name: '',
    city: '',
    bio: '',
    accent: ACCENT_SWATCHES[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      handle: ownedArtist?.handle || profile?.handle || profile?.display_name || '',
      name: ownedArtist?.name || profile?.display_name || '',
      city: ownedArtist?.city || profile?.city || '',
      bio: ownedArtist?.bio || profile?.bio || '',
      accent: ownedArtist?.accent || ACCENT_SWATCHES[0],
    });
  }, [ownedArtist, profile]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const formValid = form.name.trim().length > 0 && form.handle.trim().length > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!formValid) return;
    setSaving(true);
    let ok = false;
    try {
      ok = await onSubmit(form);
    } finally {
      setSaving(false);
    }
    if (ok) onDone?.();
  };

  return (
      <form onSubmit={submit} className="hair-all bg-[var(--card)] w-full">
        <div className="p-5 sm:p-6 hair-b flex items-start justify-between gap-4">
          <div>
            <div className="label">{ownedArtist ? 'Studio settings' : 'Seller setup'}</div>
            <h2 className="display text-[30px] sm:text-[34px] mt-2">{ownedArtist ? 'Edit your studio.' : 'Create your studio.'}</h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="studio-form-name" className="label mb-2 block">Studio name</label>
            <input id="studio-form-name" value={form.name} onChange={event => updateField('name', event.target.value)} className="swiss-input" maxLength={120} required/>
          </div>
          <div>
            <label htmlFor="studio-form-handle" className="label mb-2 block">Handle</label>
            <input id="studio-form-handle" value={form.handle} onChange={event => updateField('handle', event.target.value)} className="swiss-input" maxLength={48} required/>
          </div>
          <div>
            <label htmlFor="studio-form-city" className="label mb-2 block">City</label>
            <input id="studio-form-city" value={form.city} onChange={event => updateField('city', event.target.value)} className="swiss-input" maxLength={120}/>
          </div>
          <div>
            <label className="label mb-2 block">Accent</label>
            <div className="grid grid-cols-6 gap-2">
              {ACCENT_SWATCHES.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateField('accent', color)}
                  className={`h-11 hair-all ${form.accent === color ? 'outline outline-2 outline-[var(--ink)]' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Use accent ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="studio-form-bio" className="label mb-2 block">Bio</label>
            <textarea id="studio-form-bio" value={form.bio} onChange={event => updateField('bio', event.target.value)} className="swiss-input min-h-[140px]" maxLength={900}/>
          </div>
        </div>

        <div className="p-5 sm:p-6 hair-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onDone} className="swiss-btn ghost justify-center">Back to overview</button>
          <button type="submit" disabled={saving || !formValid} className={`swiss-btn accent ${saving || !formValid ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {saving ? 'Saving...' : ownedArtist ? 'Save studio' : 'Create studio'} <ArrowRight size={12}/>
          </button>
        </div>
      </form>
  );
};

export const SellerArtworkForm = ({ onSubmit, onUploadImage, onDone }) => {
  const [form, setForm] = useState({
    title: '',
    visual: VISUAL_OPTIONS[0] || 'v1',
    startBid: '120',
    durationHours: '120',
    year: String(new Date().getFullYear()),
    dimensions: '3000 x 3000 px',
    edition: '1/1',
    format: 'PNG / source',
    tags: 'digital, abstract',
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mediaError, setMediaError] = useState('');
  const startBidNumber = Number(form.startBid);
  const durationHoursNumber = Number(form.durationHours);
  const formValid = form.title.trim().length > 0
    && Number.isFinite(startBidNumber)
    && startBidNumber >= 20
    && Number.isFinite(durationHoursNumber)
    && durationHoursNumber >= 24
    && durationHoursNumber <= 168;

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const selectImage = (event) => {
    const file = event.target.files?.[0];
    setMediaError('');
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMediaError('Choose a PNG, JPG, GIF, or WEBP file.');
      setImageFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMediaError('Artwork images must be 10MB or smaller.');
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!formValid) return;
    setSaving(true);
    setMediaError('');
    try {
      const imageUrl = imageFile ? await onUploadImage(imageFile) : '';
      const ok = await onSubmit({
        ...form,
        startBid: startBidNumber,
        durationHours: durationHoursNumber,
        year: Number(form.year),
        imageUrl,
      });
      if (ok) {
        setImageFile(null);
        onDone?.();
      }
    } catch (err) {
      setMediaError(err.message || 'Artwork image upload failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
      <form onSubmit={submit} className="hair-all bg-[var(--card)] w-full">
        <div className="p-5 sm:p-6 hair-b flex items-start justify-between gap-4">
          <div>
            <div className="label">New auction</div>
            <h2 className="display text-[30px] sm:text-[34px] mt-2">List new work.</h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="hair-all bg-[var(--bg-2)]">
              <ArtVisual visual={form.visual} imageUrl={imagePreview} alt={form.title || 'Artwork upload preview'}/>
            </div>
            <div className="mt-3">
              <label htmlFor="artwork-image-upload" className="swiss-btn ghost w-full justify-center cursor-pointer">
                <Upload size={12}/> Upload image
              </label>
              <input
                id="artwork-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={selectImage}
                className="sr-only"
              />
              <div className="mono text-[10px] text-[var(--muted)] mt-2">
                {imageFile ? imageFile.name : 'PNG, JPG, WEBP, or GIF - 10MB max'}
              </div>
              {mediaError && <div className="text-[12px] text-[var(--accent)] mt-2">{mediaError}</div>}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {VISUAL_OPTIONS.slice(0, 12).map(visual => (
                <button
                  key={visual}
                  type="button"
                  onClick={() => updateField('visual', visual)}
                  className={`hair-all overflow-hidden ${form.visual === visual ? 'outline outline-2 outline-[var(--ink)]' : ''}`}
                  aria-label={`Select visual ${visual}`}
                >
                  <ArtVisual visual={visual}/>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="artwork-title" className="label mb-2 block">Title</label>
              <input id="artwork-title" value={form.title} onChange={event => updateField('title', event.target.value)} className="swiss-input" maxLength={140} required/>
            </div>
            <div>
              <label htmlFor="artwork-bid" className="label mb-2 block">Starting bid</label>
              <input id="artwork-bid" type="number" min="20" value={form.startBid} onChange={event => updateField('startBid', event.target.value)} className="swiss-input" required/>
            </div>
            <div>
              <label htmlFor="artwork-duration" className="label mb-2 block">Duration hours</label>
              <input id="artwork-duration" type="number" min="24" max="168" value={form.durationHours} onChange={event => updateField('durationHours', event.target.value)} className="swiss-input" required/>
            </div>
            <div>
              <label htmlFor="artwork-year" className="label mb-2 block">Year</label>
              <input id="artwork-year" type="number" value={form.year} onChange={event => updateField('year', event.target.value)} className="swiss-input"/>
            </div>
            <div>
              <label htmlFor="artwork-edition" className="label mb-2 block">Edition</label>
              <input id="artwork-edition" value={form.edition} onChange={event => updateField('edition', event.target.value)} className="swiss-input" maxLength={80}/>
            </div>
            <div>
              <label htmlFor="artwork-dimensions" className="label mb-2 block">Dimensions</label>
              <input id="artwork-dimensions" value={form.dimensions} onChange={event => updateField('dimensions', event.target.value)} className="swiss-input" maxLength={120}/>
            </div>
            <div>
              <label htmlFor="artwork-format" className="label mb-2 block">Format</label>
              <input id="artwork-format" value={form.format} onChange={event => updateField('format', event.target.value)} className="swiss-input" maxLength={80}/>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="artwork-tags" className="label mb-2 block">Tags</label>
              <input id="artwork-tags" value={form.tags} onChange={event => updateField('tags', event.target.value)} className="swiss-input" maxLength={160}/>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 hair-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onDone} className="swiss-btn ghost justify-center">Back to auctions</button>
          <button type="submit" disabled={saving || !formValid} className={`swiss-btn accent ${saving || !formValid ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {saving ? 'Listing...' : 'List work'} <ArrowRight size={12}/>
          </button>
        </div>
      </form>
  );
};

export const SellerCommissionForm = ({ onSubmit, onDone }) => {
  const [form, setForm] = useState({
    title: '',
    slots: '3',
    price: '320',
    days: '14',
    brief: '',
  });
  const [saving, setSaving] = useState(false);
  const slotsNumber = Number(form.slots);
  const priceNumber = Number(form.price);
  const daysNumber = Number(form.days);
  const formValid = form.title.trim().length > 0
    && Number.isFinite(slotsNumber)
    && slotsNumber >= 1
    && slotsNumber <= 12
    && Number.isFinite(priceNumber)
    && priceNumber >= 20
    && Number.isFinite(daysNumber)
    && daysNumber >= 1
    && daysNumber <= 60;

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!formValid) return;
    setSaving(true);
    try {
      const ok = await onSubmit({
        ...form,
        slots: slotsNumber,
        price: priceNumber,
        days: daysNumber,
      });
      if (ok) onDone?.();
    } finally {
      setSaving(false);
    }
  };

  return (
      <form onSubmit={submit} className="hair-all bg-[var(--card)] w-full">
        <div className="p-5 sm:p-6 hair-b flex items-start justify-between gap-4">
          <div>
            <div className="label">New commission</div>
            <h2 className="display text-[30px] sm:text-[34px] mt-2">Open a board.</h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="seller-commission-title" className="label mb-2 block">Title</label>
            <input id="seller-commission-title" value={form.title} onChange={event => updateField('title', event.target.value)} className="swiss-input" maxLength={140} required/>
          </div>
          <div>
            <label htmlFor="seller-commission-slots" className="label mb-2 block">Slots</label>
            <input id="seller-commission-slots" type="number" min="1" max="12" value={form.slots} onChange={event => updateField('slots', event.target.value)} className="swiss-input" required/>
          </div>
          <div>
            <label htmlFor="seller-commission-price" className="label mb-2 block">Price</label>
            <input id="seller-commission-price" type="number" min="20" value={form.price} onChange={event => updateField('price', event.target.value)} className="swiss-input" required/>
          </div>
          <div>
            <label htmlFor="seller-commission-days" className="label mb-2 block">Delivery days</label>
            <input id="seller-commission-days" type="number" min="1" max="60" value={form.days} onChange={event => updateField('days', event.target.value)} className="swiss-input" required/>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="seller-commission-brief" className="label mb-2 block">Brief</label>
            <textarea id="seller-commission-brief" value={form.brief} onChange={event => updateField('brief', event.target.value)} className="swiss-input min-h-[150px]" maxLength={900}/>
          </div>
        </div>

        <div className="p-5 sm:p-6 hair-t flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onDone} className="swiss-btn ghost justify-center">Back to commissions</button>
          <button type="submit" disabled={saving || !formValid} className={`swiss-btn accent ${saving || !formValid ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {saving ? 'Opening...' : 'Open board'} <ArrowRight size={12}/>
          </button>
        </div>
      </form>
  );
};
