// ============================================================
// FORMA — Profile / account settings
// ============================================================
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Lock, Mail, Trash2, AlertCircle, UserPlus, Heart, Bookmark, Webhook, Plus, Pause, Play } from 'lucide-react';
import { roleLabel, isBuyerRole, isSellerRole, isAdminRole, fmt, relativeTime } from '../lib/ui';
import { useAuth } from '../contexts/AuthContext';
import { uploadAvatar } from '../lib/account';
import {
  WEBHOOK_EVENT_OPTIONS,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  fetchWebhookEndpoints,
  updateWebhookEndpoint,
} from '../lib/webhooks';

export const ProfileView = ({ user, profile, role, updateProfile, marketplace, setView, goToArtwork, goToArtist, toggleFollow }) => {
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    handle: profile?.handle || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const { updatePassword, updateEmail, deleteAccount } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [secBusy, setSecBusy] = useState('');
  const [secStatus, setSecStatus] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [webhookEndpoints, setWebhookEndpoints] = useState([]);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: ['notification.created'] });
  const [webhookBusy, setWebhookBusy] = useState('');
  const [webhookStatus, setWebhookStatus] = useState(null);

  const handleAvatar = async (file) => {
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const url = await uploadAvatar(file);
      await updateProfile({ avatar_url: url });
    } catch (err) {
      setAvatarError(err.message || 'Avatar upload failed.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const runSecurity = async (kind, fn) => {
    setSecBusy(kind);
    setSecStatus(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setSecStatus({ type: 'error', text: err.message || 'Action failed.' });
      return false;
    } finally {
      setSecBusy('');
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const ok = await runSecurity('password', () => updatePassword(newPassword));
    if (ok) { setNewPassword(''); setSecStatus({ type: 'success', text: 'Password updated.' }); }
  };

  const handleChangeEmail = async (event) => {
    event.preventDefault();
    const ok = await runSecurity('email', () => updateEmail(newEmail));
    if (ok) { setNewEmail(''); setSecStatus({ type: 'success', text: 'Confirmation sent to the new address. Email changes apply after you confirm.' }); }
  };

  const handleDeleteAccount = async () => {
    if (confirmDelete !== 'DELETE') {
      setSecStatus({ type: 'error', text: 'Type DELETE to confirm account removal.' });
      return;
    }
    await runSecurity('delete', () => deleteAccount());
  };

  useEffect(() => {
    setForm({
      display_name: profile?.display_name || '',
      handle: profile?.handle || '',
      city: profile?.city || '',
      bio: profile?.bio || '',
    });
  }, [profile]);

  useEffect(() => {
    let alive = true;
    if (!user?.id) {
      setWebhookEndpoints([]);
      return () => { alive = false; };
    }

    fetchWebhookEndpoints(user.id)
      .then(rows => { if (alive) setWebhookEndpoints(rows); })
      .catch(err => {
        if (alive) setWebhookStatus({ type: 'error', text: err.message || 'Webhook endpoints failed to load.' });
      });

    return () => { alive = false; };
  }, [user?.id]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setStatus(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      await updateProfile({
        display_name: form.display_name,
        handle: form.handle,
        city: form.city,
        bio: form.bio,
      });
      setStatus({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Profile update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhookEvent = (eventValue) => {
    setWebhookStatus(null);
    setWebhookForm(prev => {
      if (eventValue === '*') {
        return { ...prev, events: prev.events.includes('*') ? ['notification.created'] : ['*'] };
      }

      const withoutWildcard = prev.events.filter(value => value !== '*');
      const next = withoutWildcard.includes(eventValue)
        ? withoutWildcard.filter(value => value !== eventValue)
        : [...withoutWildcard, eventValue];
      return { ...prev, events: next.length ? next : ['notification.created'] };
    });
  };

  const handleCreateWebhook = async (event) => {
    event.preventDefault();
    setWebhookBusy('create');
    setWebhookStatus(null);
    try {
      const endpoint = await createWebhookEndpoint(user?.id, webhookForm);
      setWebhookEndpoints(prev => [endpoint, ...prev]);
      setWebhookForm({ url: '', events: ['notification.created'] });
      setWebhookStatus({ type: 'success', text: 'Webhook endpoint saved.' });
    } catch (err) {
      setWebhookStatus({ type: 'error', text: err.message || 'Webhook endpoint failed.' });
    } finally {
      setWebhookBusy('');
    }
  };

  const handleWebhookStatus = async (endpoint, status) => {
    const key = `${endpoint.id}:${status}`;
    setWebhookBusy(key);
    setWebhookStatus(null);
    try {
      const updated = await updateWebhookEndpoint(endpoint.id, { status });
      setWebhookEndpoints(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      setWebhookStatus({ type: 'error', text: err.message || 'Webhook status update failed.' });
    } finally {
      setWebhookBusy('');
    }
  };

  const handleDeleteWebhook = async (endpointId) => {
    setWebhookBusy(`${endpointId}:delete`);
    setWebhookStatus(null);
    try {
      await deleteWebhookEndpoint(endpointId);
      setWebhookEndpoints(prev => prev.filter(item => item.id !== endpointId));
    } catch (err) {
      setWebhookStatus({ type: 'error', text: err.message || 'Webhook removal failed.' });
    } finally {
      setWebhookBusy('');
    }
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'FORMA user';
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'New account';
  const likeCount = Object.keys(marketplace.likes || {}).length;
  const followCount = Object.keys(marketplace.follows || {}).length;
  const watchCount = Object.keys(marketplace.watchlist || {}).length;
  const bidCount = Object.values(marketplace.bids || {}).reduce((total, rows) => total + rows.length, 0);
  const followedStudios = (marketplace.artists || []).filter(artist => marketplace.follows?.[artist.id]);
  const likedWorks = (marketplace.artworks || []).filter(work => marketplace.likes?.[work.id]);
  const savedFeedPosts = (marketplace.feedPosts || []).filter(post => marketplace.savedPosts?.[post.id]);

  const shortcuts = [
    { show: isBuyerRole(role), target: 'dashboard', label: 'Buyer dashboard', desc: 'Watchlist, bids, and collecting activity.' },
    { show: isSellerRole(role), target: 'studio', label: 'Seller studio', desc: 'Auctions, commissions, and payout summary.' },
    { show: isAdminRole(role), target: 'admin', label: 'Admin console', desc: 'Moderation, finance, audit, and user queues.' },
  ].filter(item => item.show);

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-12">
      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-4">
          <div className="hair-all bg-[var(--card)] p-6 sticky top-28">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover"/>
                ) : (
                  <span className="display text-[42px] leading-none">{displayName[0]}</span>
                )}
              </div>
              <div>
                <label className={`swiss-btn ghost cursor-pointer ${avatarBusy ? 'opacity-60 cursor-wait' : ''}`}>
                  {avatarBusy ? 'Uploading…' : 'Change photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarBusy}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = ''; }}
                  />
                </label>
                {avatarError && <div className="text-[11px] text-[var(--accent)] mt-2">{avatarError}</div>}
              </div>
            </div>
            <div className="label mt-6">Profile</div>
            <h1 className="display text-[48px] mt-2 leading-[0.95]">{displayName}</h1>
            <div className="mono text-[11px] text-[var(--muted)] mt-3 break-all">{profile?.email || user?.email}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em]">{roleLabel(role)}</span>
              <span className={`px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] ${profile?.verified ? 'bg-[var(--good)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                {profile?.verified ? 'Verified' : 'Unverified'}
              </span>
              <span className="hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em]">{joined}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                ['Watching', watchCount],
                ['Likes', likeCount],
                ['Following', followCount],
                ['Bids', bidCount],
              ].map(([label, value]) => (
                <div key={label} className="hair-all p-4">
                  <div className="display text-[28px]">{value}</div>
                  <div className="label mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-8 space-y-8">
          <form onSubmit={handleSave} className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-start gap-4 hair-b pb-5 mb-6">
              <div>
                <div className="label">Public profile</div>
                <h2 className="display text-[32px] mt-2">Account details.</h2>
              </div>
              <button type="submit" disabled={saving} className={`swiss-btn accent ${saving ? 'opacity-60 cursor-wait' : ''}`}>
                {saving ? 'Saving...' : 'Save profile'} <Check size={12}/>
              </button>
            </div>

            {status && (
              <div className={`hair-all p-3 mb-5 text-[13px] ${status.type === 'error' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-2)] text-[var(--good)]'}`}>
                {status.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile-display-name" className="label mb-2 block">Display name</label>
                <input
                  id="profile-display-name"
                  className="swiss-input"
                  value={form.display_name}
                  onChange={event => updateField('display_name', event.target.value)}
                  placeholder="Your public name"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-handle" className="label mb-2 block">Handle</label>
                <input
                  id="profile-handle"
                  className="swiss-input"
                  value={form.handle}
                  onChange={event => updateField('handle', event.target.value)}
                  placeholder="studio.handle"
                  maxLength={40}
                />
              </div>
              <div>
                <label htmlFor="profile-city" className="label mb-2 block">City</label>
                <input
                  id="profile-city"
                  className="swiss-input"
                  value={form.city}
                  onChange={event => updateField('city', event.target.value)}
                  placeholder="Lagos, Berlin, Colombo"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="label mb-2 block">Account role</label>
                <div className="hair-all px-3 py-3 mono text-[11px] uppercase tracking-[0.1em] bg-[var(--bg-2)]">
                  {roleLabel(role)}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="profile-bio" className="label mb-2 block">Bio</label>
                <textarea
                  id="profile-bio"
                  className="swiss-input min-h-[120px]"
                  value={form.bio}
                  onChange={event => updateField('bio', event.target.value)}
                  placeholder="Tell collectors what you make, collect, or commission."
                  maxLength={500}
                />
              </div>
            </div>
          </form>

          <div className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-start gap-4 hair-b pb-5 mb-6">
              <div>
                <div className="label">Social graph</div>
                <h2 className="display text-[32px] mt-2">Your network.</h2>
              </div>
              <button type="button" onClick={() => setView('feed')} className="swiss-btn ghost">
                Open feed <ArrowRight size={12}/>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <section className="hair-all p-4 min-h-[260px]">
                <div className="label flex items-center gap-2"><UserPlus size={12}/> Following</div>
                <div className="space-y-3 mt-4">
                  {followedStudios.slice(0, 5).map(artist => (
                    <div key={artist.id} className="hair-b pb-3 last:border-0 last:pb-0">
                      <button type="button" onClick={() => goToArtist?.(artist.id)} className="w-full text-left group">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 flex-shrink-0 hair-all" style={{ background: artist.accent }}/>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium truncate group-hover:underline">{artist.name}</span>
                            <span className="block mono text-[10px] text-[var(--muted)] truncate">{artist.handle} · {fmt(Number(artist.followers || 0))}</span>
                          </span>
                        </div>
                      </button>
                      <button type="button" onClick={() => toggleFollow?.(artist.id)} className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--accent)] mt-2">
                        Unfollow
                      </button>
                    </div>
                  ))}
                  {followedStudios.length === 0 && (
                    <div className="text-[13px] text-[var(--muted)] leading-relaxed">
                      Follow studios to build a personal feed.
                      <button type="button" onClick={() => setView('artists')} className="block mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink)] mt-3 hover:underline">
                        Browse studios
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="hair-all p-4 min-h-[260px]">
                <div className="label flex items-center gap-2"><Bookmark size={12}/> Saved posts</div>
                <div className="space-y-3 mt-4">
                  {savedFeedPosts.slice(0, 4).map(post => {
                    const artist = (marketplace.artists || []).find(item => item.id === post.artist);
                    return (
                      <button key={post.id} type="button" onClick={() => setView('feed')} className="w-full hair-b pb-3 last:border-0 last:pb-0 text-left group">
                        <span className="block text-[13px] leading-snug line-clamp-2 group-hover:underline">{post.text}</span>
                        <span className="block mono text-[10px] text-[var(--muted)] mt-2">
                          {artist?.handle || 'studio'} · {relativeTime(post.createdAt)}
                        </span>
                      </button>
                    );
                  })}
                  {savedFeedPosts.length === 0 && (
                    <div className="text-[13px] text-[var(--muted)] leading-relaxed">
                      Saved studio posts will collect here.
                    </div>
                  )}
                </div>
              </section>

              <section className="hair-all p-4 min-h-[260px]">
                <div className="label flex items-center gap-2"><Heart size={12}/> Liked works</div>
                <div className="space-y-3 mt-4">
                  {likedWorks.slice(0, 5).map(work => {
                    const artist = (marketplace.artists || []).find(item => item.id === work.artist);
                    return (
                      <button key={work.id} type="button" onClick={() => goToArtwork?.(work.id)} className="w-full hair-b pb-3 last:border-0 last:pb-0 text-left group">
                        <span className="block display text-[18px] leading-tight group-hover:underline">{work.title}</span>
                        <span className="block mono text-[10px] text-[var(--muted)] mt-1">
                          {artist?.name || 'Unknown studio'} · ${fmt(Number(work.currentBid || 0))}
                        </span>
                      </button>
                    );
                  })}
                  {likedWorks.length === 0 && (
                    <div className="text-[13px] text-[var(--muted)] leading-relaxed">
                      Like artworks to keep a lightweight taste board.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-start gap-4 hair-b pb-5 mb-6">
              <div>
                <div className="label flex items-center gap-2"><Webhook size={12}/> Webhooks</div>
                <h2 className="display text-[32px] mt-2">Endpoint delivery.</h2>
              </div>
              <div className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                {webhookEndpoints.length} endpoints
              </div>
            </div>

            {webhookStatus && (
              <div className={`hair-all p-3 mb-5 text-[13px] ${webhookStatus.type === 'error' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-2)] text-[var(--good)]'}`}>
                {webhookStatus.text}
              </div>
            )}

            <form onSubmit={handleCreateWebhook} className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-7">
                <label htmlFor="webhook-url" className="label mb-2 block">Endpoint URL</label>
                <input
                  id="webhook-url"
                  type="url"
                  className="swiss-input"
                  value={webhookForm.url}
                  onChange={event => {
                    setWebhookForm(prev => ({ ...prev, url: event.target.value }));
                    setWebhookStatus(null);
                  }}
                  placeholder="https://api.studio.com/forma"
                  autoComplete="url"
                  required
                />
              </div>
              <div className="col-span-3">
                <div className="label mb-2">Events</div>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENT_OPTIONS.map(option => {
                    const active = webhookForm.events.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleWebhookEvent(option.value)}
                        className={`hair-all px-2.5 py-2 mono text-[9px] uppercase tracking-[0.08em] transition-colors ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-transparent text-[var(--ink)] hover:bg-[var(--bg-2)]'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={webhookBusy === 'create'} className={`swiss-btn accent ${webhookBusy === 'create' ? 'opacity-60 cursor-wait' : ''}`}>
                  {webhookBusy === 'create' ? 'Saving...' : 'Add'} <Plus size={12}/>
                </button>
              </div>
            </form>

            <div className="space-y-3 mt-6">
              {webhookEndpoints.map(endpoint => (
                <div key={endpoint.id} className="hair-all p-4 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6 min-w-0">
                    <div className="text-[14px] truncate">{endpoint.url}</div>
                    <div className="mono text-[10px] text-[var(--muted)] uppercase tracking-[0.08em] mt-1">
                      {endpoint.events.includes('*') ? 'All events' : endpoint.events.join(', ')}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex px-2.5 py-1 mono text-[9px] uppercase tracking-[0.1em] ${endpoint.status === 'active' ? 'bg-[var(--good)] text-white' : 'hair-all text-[var(--muted)]'}`}>
                      {endpoint.status}
                    </span>
                  </div>
                  <div className="col-span-4 flex justify-end gap-2">
                    {endpoint.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleWebhookStatus(endpoint, 'paused')}
                        disabled={webhookBusy === `${endpoint.id}:paused`}
                        className="swiss-btn ghost"
                      >
                        Pause <Pause size={12}/>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleWebhookStatus(endpoint, 'active')}
                        disabled={webhookBusy === `${endpoint.id}:active`}
                        className="swiss-btn ghost"
                      >
                        Activate <Play size={12}/>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteWebhook(endpoint.id)}
                      disabled={webhookBusy === `${endpoint.id}:delete`}
                      className="swiss-btn ghost"
                    >
                      Delete <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}

              {webhookEndpoints.length === 0 && (
                <div className="hair-all p-5 text-[13px] text-[var(--muted)]">
                  No webhook endpoints saved.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="hair-all bg-[var(--card)] p-6">
              <div className="label">Account security</div>
              <div className="space-y-4 mt-5">
                {[
                  ['Email confirmed', user?.email_confirmed_at ? 'Complete' : 'Pending'],
                  ['Profile row', profile?.id ? 'Synced' : 'Missing'],
                  ['Role lock', 'Protected'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between hair-b pb-3 last:border-0 last:pb-0">
                    <span className="text-[14px]">{label}</span>
                    <span className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hair-all bg-[var(--card)] p-6">
              <div className="label">Role shortcuts</div>
              <div className="space-y-3 mt-5">
                {shortcuts.map(shortcut => (
                  <button
                    key={shortcut.target}
                    onClick={() => setView(shortcut.target)}
                    className="w-full hair-all p-4 text-left hover:bg-[var(--bg-2)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="display text-[20px]">{shortcut.label}</span>
                      <ArrowRight size={14}/>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mt-2 leading-relaxed">{shortcut.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hair-all bg-[var(--card)] p-6">
            <div className="flex justify-between items-start gap-4 hair-b pb-5 mb-6">
              <div>
                <div className="label">Account management</div>
                <h2 className="display text-[32px] mt-2">Security & access.</h2>
              </div>
            </div>

            {secStatus && (
              <div className={`hair-all p-3 mb-6 text-[13px] flex items-start gap-2 ${secStatus.type === 'error' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-2)] text-[var(--good)]'}`}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5"/>
                <span>{secStatus.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <form onSubmit={handleChangePassword}>
                <label htmlFor="sec-password" className="label mb-2 flex items-center gap-2"><Lock size={12}/> New password</label>
                <input
                  id="sec-password"
                  type="password"
                  className="swiss-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  minLength={10}
                  autoComplete="new-password"
                />
                <button type="submit" disabled={secBusy === 'password' || newPassword.length < 10} className={`swiss-btn mt-4 ${secBusy === 'password' || newPassword.length < 10 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {secBusy === 'password' ? 'Updating…' : 'Change password'} <Check size={12}/>
                </button>
              </form>

              <form onSubmit={handleChangeEmail}>
                <label htmlFor="sec-email" className="label mb-2 flex items-center gap-2"><Mail size={12}/> New email</label>
                <input
                  id="sec-email"
                  type="email"
                  className="swiss-input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={profile?.email || user?.email || 'you@studio.com'}
                  autoComplete="email"
                />
                <button type="submit" disabled={secBusy === 'email' || !newEmail.trim()} className={`swiss-btn mt-4 ${secBusy === 'email' || !newEmail.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {secBusy === 'email' ? 'Sending…' : 'Change email'} <Check size={12}/>
                </button>
              </form>
            </div>

            <div className="hair-t mt-8 pt-6">
              <div className="label flex items-center gap-2 text-[var(--accent)]"><Trash2 size={12}/> Danger zone</div>
              <p className="text-[13px] text-[var(--muted)] mt-2 max-w-[560px] leading-relaxed">
                Deleting your account permanently removes your profile and all owned data (bids, follows, listings, bookings). This cannot be undone.
              </p>
              <div className="flex flex-wrap items-end gap-3 mt-4">
                <div>
                  <label htmlFor="sec-delete" className="label mb-2 block">Type DELETE to confirm</label>
                  <input
                    id="sec-delete"
                    className="swiss-input w-[220px]"
                    value={confirmDelete}
                    onChange={e => setConfirmDelete(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={secBusy === 'delete' || confirmDelete !== 'DELETE'}
                  className={`swiss-btn accent ${secBusy === 'delete' || confirmDelete !== 'DELETE' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {secBusy === 'delete' ? 'Deleting…' : 'Delete account'} <Trash2 size={12}/>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
