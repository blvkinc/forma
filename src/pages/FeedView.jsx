import React, { useMemo, useState, useEffect } from 'react';
import {
  Image as ImageIcon, Tag, Hash, Send, Heart, MessageCircle, Share2, Bookmark,
  ArrowUpRight, ArrowRight, Trash2, Flag, Pencil, X, Check, ShieldCheck,
} from 'lucide-react';
import { ArtVisual } from '../components/shared';
import { fmt, relativeTime, isAdminRole } from '../lib/ui';
import { FEED_POSTS, ARTISTS, ARTWORKS, artistById, artworkById } from '../lib/catalogue';
import { fetchPostComments, addPostComment, deletePostComment, subscribeToDropAlerts } from '../lib/social';
import { supabase } from '../lib/supabase';

function PostComments({ postId, userId, onCountChange, canComment = true, readOnlyLabel = 'Comments are read-only for this role.' }) {
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchPostComments(postId)
      .then(rows => { if (!cancelled) setComments(rows); })
      .catch(err => { if (!cancelled) setError(err.message || 'Could not load comments.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!canComment) { setError(readOnlyLabel); return; }
    if (!userId) { setError('Sign in to comment.'); return; }
    setSending(true);
    setError('');
    const result = await addPostComment(userId, postId, draft);
    setSending(false);
    if (result?.error) { setError(result.error); return; }
    setComments(prev => [...prev, result.data]);
    setDraft('');
    onCountChange?.(1);
  };

  const removeComment = async (commentId) => {
    const previous = comments;
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    onCountChange?.(-1);
    const result = await deletePostComment(commentId);
    if (result?.error) {
      setComments(previous);
      onCountChange?.(1);
      setError(result.error);
    }
  };

  return (
    <div className="mt-4 hair-t pt-4">
      {loading ? (
        <div className="mono text-[11px] text-[var(--muted)]">Loading comments...</div>
      ) : (
        <div className="space-y-3">
          {comments.length === 0 && (
            <div className="mono text-[11px] text-[var(--muted)]">No comments yet. Start the thread.</div>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="hair-b pb-2">
              <div className="flex justify-between items-baseline gap-3">
                <div className="min-w-0">
                  <span className="text-[12px] font-medium truncate">{comment.displayName}</span>
                  {comment.handle && <span className="mono text-[10px] text-[var(--muted)] ml-2">@{comment.handle}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="mono text-[10px] text-[var(--muted)]">{relativeTime(comment.createdAt)}</span>
                  {canComment && comment.userId === userId && (
                    <button type="button" onClick={() => removeComment(comment.id)} className="hair-all w-6 h-6 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label="Delete comment">
                      <Trash2 size={11}/>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[13px] mt-1 text-[var(--ink-2)] leading-relaxed">{comment.body}</p>
            </div>
          ))}
        </div>
      )}
      {canComment ? (
        <form onSubmit={submit} className="hair-all p-2 flex gap-2 mt-3">
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            className="swiss-input flex-1 border-none"
            placeholder="Add a comment..."
            maxLength={800}
          />
          <button type="submit" disabled={sending || !draft.trim()} className={`swiss-btn ${sending || !draft.trim() ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Post comment">
            <Send size={12}/>
          </button>
        </form>
      ) : (
        <div className="hair-all p-3 mt-3 mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
          {readOnlyLabel}
        </div>
      )}
      {error && <div className="text-[12px] text-[var(--accent)] mt-2">{error}</div>}
    </div>
  );
}

export const FeedView = ({
  goToArtwork,
  goToArtist,
  follows,
  toggleFollow,
  canPost = false,
  onPost,
  user,
  ownedArtist,
  feedPosts = FEED_POSTS,
  artists = ARTISTS,
  artworks = ARTWORKS,
  postLikes = {},
  togglePostLike,
  savedPosts = {},
  toggleSavedPost,
  onDeletePost,
  onEditPost,
  onRefresh,
  onReport,
  role,
  onOpenAdmin,
}) => {
  const [tab, setTab] = useState('latest');
  const [composer, setComposer] = useState('');
  const [postType, setPostType] = useState('note');
  const [linkedArtwork, setLinkedArtwork] = useState('');
  const [posting, setPosting] = useState(false);
  const [openPost, setOpenPost] = useState(null);
  const [commentDeltas, setCommentDeltas] = useState({});
  const [removedPosts, setRemovedPosts] = useState({});
  const [tagFilter, setTagFilter] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [editType, setEditType] = useState('note');
  const [editSaving, setEditSaving] = useState(false);
  const isAdmin = isAdminRole(role);
  const canPostInFeed = canPost && !isAdmin;

  useEffect(() => {
    if (isAdmin && (tab === 'following' || tab === 'saved')) setTab('latest');
  }, [isAdmin, tab]);

  useEffect(() => {
    if (!onRefresh) return undefined;
    let timer = 0;
    const ping = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { onRefresh(); }, 600);
    };
    const channel = supabase
      .channel('feed:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, ping)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditBody(post.text || '');
    setEditType(post.type || 'note');
    setNotice('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody('');
  };

  const saveEdit = async (post) => {
    const body = editBody.trim();
    if (body.length < 2 || !onEditPost) return;
    setEditSaving(true);
    const result = await onEditPost(post.id, { body, type: editType });
    setEditSaving(false);
    if (result?.error) { setNotice(result.error); return; }
    cancelEdit();
  };

  const ownedWorks = useMemo(
    () => (ownedArtist ? artworks.filter(work => work.artist === ownedArtist.id) : []),
    [artworks, ownedArtist]
  );

  const trendingTags = useMemo(() => {
    const counts = {};
    (artworks || []).forEach(work => (work.tags || []).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    }));
    const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 12);
    return ranked.length ? ranked : ['halftone','riso','typography','glitch','bauhaus','minimal'];
  }, [artworks]);

  const subscribeDropAlerts = async () => {
    const email = alertEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice('Enter a valid email to get drop alerts.');
      return;
    }
    const result = await subscribeToDropAlerts(user?.id, email);
    if (result?.error) {
      setNotice(result.error);
      return;
    }
    setAlertEmail('');
    setNotice(`Drop alerts on — we'll email ${email} 6 hours before public drops.`);
  };

  const visiblePosts = useMemo(() => {
    const needle = tagFilter.toLowerCase();
    return (feedPosts || [])
      .filter(post => !removedPosts[post.id])
      .filter(post => {
        if (tab === 'following') return !!follows[post.artist];
        if (tab === 'drops') return post.type === 'drop';
        if (tab === 'saved') return !!savedPosts[post.id];
        return true;
      })
      .filter(post => {
        if (!needle) return true;
        const work = post.artwork ? artworks.find(w => w.id === post.artwork) : null;
        const haystack = [
          post.text,
          work?.title,
          ...(work?.tags || []),
        ].join(' ').toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => new Date(b.createdAt || b.when || 0) - new Date(a.createdAt || a.when || 0));
  }, [feedPosts, follows, removedPosts, savedPosts, tab, tagFilter, artworks]);

  const submitPost = async () => {
    const body = composer.trim();
    if (!body || !onPost || !canPostInFeed) return;
    setPosting(true);
    setNotice('');
    const result = await onPost({ body, type: postType, artworkId: linkedArtwork || null });
    setPosting(false);
    if (result?.error) {
      setNotice(result.error);
      return;
    }
    setComposer('');
    setLinkedArtwork('');
    setNotice('Posted to the feed.');
  };

  const requireSignedIn = () => {
    if (isAdmin) {
      setNotice('Admin accounts review social activity from the admin console.');
      return false;
    }
    if (user?.id) return true;
    setNotice('Sign in to use social actions.');
    return false;
  };

  const sharePost = async (postId) => {
    const url = `${window.location.origin}${window.location.pathname}#feed`;
    try {
      await navigator.clipboard?.writeText(url);
      setNotice(`Feed link copied for ${postId}.`);
    } catch {
      setNotice(url);
    }
  };

  const removePost = async (post) => {
    if (!onDeletePost) return;
    setRemovedPosts(prev => ({ ...prev, [post.id]: true }));
    const result = await onDeletePost(post.id);
    if (result?.error) {
      setRemovedPosts(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setNotice(result.error);
    } else {
      setNotice('Feed post deleted.');
    }
  };

  return (
    <main className="fade-in max-w-[1440px] mx-auto px-8 py-10">
      <div className="hair-b pb-4 mb-8 flex justify-between items-end gap-6">
        <div>
          <div className="label mb-2">No. 07 - Feed</div>
          <h1 className="display text-[64px] leading-[0.9]">What the studios are saying.</h1>
          {isAdmin && (
            <p className="text-[13px] text-[var(--muted)] mt-3 max-w-[640px] leading-relaxed">
              Admin mode is read-only here. Use reports and moderation decisions instead of liking, following, saving, or commenting.
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {(isAdmin
            ? [{k:'latest',l:'Latest'},{k:'drops',l:'Drops only'}]
            : [{k:'latest',l:'Latest'},{k:'following',l:'Following'},{k:'drops',l:'Drops only'},{k:'saved',l:'Saved'}]
          ).map(item => (
            <button type="button" key={item.k} onClick={() => setTab(item.k)} className={`tab-pill ${tab === item.k ? 'active' : ''}`}>{item.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-7">
          <div className="hair-all p-5 mb-8 bg-[var(--card)]">
            {isAdmin ? (
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="hair-all w-10 h-10 inline-flex items-center justify-center bg-[var(--bg)]">
                    <ShieldCheck size={17}/>
                  </div>
                  <div>
                    <div className="label">Admin social lens</div>
                    <div className="display text-[28px] mt-2 leading-tight">Review signals, don't participate.</div>
                    <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed max-w-[640px]">
                      Feed posts are seller-owned. Buyers and sellers can comment, save, follow, and report; admins resolve reports and enforce policy from Operations.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={onOpenAdmin} className="swiss-btn ghost flex-shrink-0">
                  Open admin <ArrowRight size={12}/>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[var(--ink)] flex-shrink-0"/>
                  <textarea
                    value={composer}
                    onChange={event => setComposer(event.target.value)}
                    className="swiss-input border-none flex-1 resize-none"
                    rows="2"
                    maxLength={1200}
                    disabled={!canPostInFeed || posting}
                    placeholder={canPostInFeed ? 'Post a note, share a process shot, announce a drop...' : 'Use a verified seller studio to post to the feed.'}
                  />
                </div>
                <div className="flex justify-between items-center mt-3 hair-t pt-3 gap-3 flex-wrap">
                  <div className="flex gap-3 label items-center flex-wrap">
                    {canPostInFeed ? (
                      <>
                        <select
                          value={postType}
                          onChange={event => setPostType(event.target.value)}
                          aria-label="Post type"
                          className="tab-pill bg-transparent"
                        >
                          <option value="note">Note</option>
                          <option value="process">Process</option>
                          <option value="drop">Drop</option>
                          <option value="sold">Sold</option>
                        </select>
                        <select
                          value={linkedArtwork}
                          onChange={event => setLinkedArtwork(event.target.value)}
                          aria-label="Linked artwork"
                          className="tab-pill bg-transparent min-w-[180px]"
                        >
                          <option value="">No linked work</option>
                          {ownedWorks.map(work => <option key={work.id} value={work.id}>{work.title}</option>)}
                        </select>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><ImageIcon size={12}/> Image</span>
                        <span className="flex items-center gap-1"><Tag size={12}/> Tag work</span>
                        <span className="flex items-center gap-1"><Hash size={12}/> Topic</span>
                      </>
                    )}
                  </div>
                  <button type="button" onClick={submitPost} className="swiss-btn" disabled={!canPostInFeed || !composer.trim() || posting}>
                    {posting ? 'Posting...' : 'Post'} <Send size={12}/>
                  </button>
                </div>
              </>
            )}
            {notice && <div className="text-[12px] text-[var(--muted)] mt-3">{notice}</div>}
          </div>

          {visiblePosts.length === 0 && (
            <div className="hair-all p-8 bg-[var(--card)]">
              <div className="display text-[28px]">No posts in this view.</div>
              <p className="text-[13px] text-[var(--muted)] mt-2">
                {tagFilter
                  ? `No posts tagged #${tagFilter}. Clear the tag filter to see more.`
                  : tab === 'following'
                    ? 'Follow studios to build a personal feed.'
                    : tab === 'saved'
                      ? 'Saved studio posts will appear here.'
                      : 'New studio posts will appear here.'}
              </p>
            </div>
          )}

          <div className="space-y-0">
            {visiblePosts.map(post => {
              const artist = artistById(post.artist);
              const work = post.artwork ? artworkById(post.artwork) : null;
              const liked = !!postLikes[post.id];
              const saved = !!savedPosts[post.id];
              const commentCount = Math.max(0, Number(post.comments || 0) + Number(commentDeltas[post.id] || 0));
              const canDelete = !isAdmin && ownedArtist?.id === post.artist;

              return (
                <div key={post.id} className="hair-b py-8">
                  <div className="flex items-start gap-4">
                    <button type="button" onClick={() => goToArtist(artist.id)} className="w-11 h-11 flex-shrink-0" style={{background: artist.accent}} aria-label={`Open ${artist.name}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <button type="button" onClick={() => goToArtist(artist.id)} className="font-medium text-[14px] cursor-pointer underline-hover">{artist.name}</button>
                          {artist.verified && <span className="text-[var(--accent)] ml-1 text-[11px]">●</span>}
                          <span className="mono text-[11px] text-[var(--muted)] ml-2">{artist.handle}</span>
                          <span className="mono text-[11px] text-[var(--muted)] ml-2">· {post.createdAt ? relativeTime(post.createdAt) : post.when}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`mono text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 ${post.type === 'drop' ? 'bg-[var(--accent)] text-white' : post.type === 'sold' ? 'bg-[var(--good)] text-white' : 'hair-all'}`}>{post.type}</span>
                          {canDelete && editingId !== post.id && (
                            <button type="button" onClick={() => startEdit(post)} className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label="Edit feed post">
                              <Pencil size={12}/>
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => removePost(post)} className="hair-all w-7 h-7 flex items-center justify-center hover:bg-[var(--accent)] hover:text-white" aria-label="Delete feed post">
                              <Trash2 size={12}/>
                            </button>
                          )}
                        </div>
                      </div>
                      {editingId === post.id ? (
                        <div className="mt-3 hair-all p-3 bg-[var(--card)]">
                          <textarea
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            className="swiss-input border-none w-full resize-none"
                            rows="3"
                            maxLength={1200}
                            aria-label="Edit post body"
                          />
                          <div className="flex items-center justify-between gap-3 mt-2 hair-t pt-2">
                            <select value={editType} onChange={e => setEditType(e.target.value)} aria-label="Post type" className="tab-pill bg-transparent">
                              <option value="note">Note</option>
                              <option value="process">Process</option>
                              <option value="drop">Drop</option>
                              <option value="sold">Sold</option>
                            </select>
                            <div className="flex gap-2">
                              <button type="button" onClick={cancelEdit} className="hair-all w-8 h-8 flex items-center justify-center hover:bg-[var(--ink)] hover:text-[var(--bg)]" aria-label="Cancel edit"><X size={13}/></button>
                              <button type="button" onClick={() => saveEdit(post)} disabled={editSaving || editBody.trim().length < 2} className={`swiss-btn ${editSaving || editBody.trim().length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {editSaving ? 'Saving…' : 'Save'} <Check size={12}/>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[15px] leading-relaxed">{post.text}</p>
                      )}
                      {work && (
                        <button type="button" onClick={() => goToArtwork(work.id)} className="mt-4 hair-all cursor-pointer flex gap-4 p-3 group hover:bg-[var(--card)] w-full text-left">
                          <div className="w-20 h-20 hair-all flex-shrink-0">
                            <ArtVisual visual={work.visual} imageUrl={work.imageUrl} alt={work.title}/>
                          </div>
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="display text-[20px] leading-tight">{work.title}</div>
                              <div className="mono text-[10px] text-[var(--muted)] mt-1">{work.dim} · {work.edition}</div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="mono text-[11px]">Now at <span className="text-[var(--ink)] font-medium">${fmt(work.currentBid)}</span></div>
                              <ArrowUpRight size={16} className="art-arrow"/>
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="flex gap-5 mt-4 label flex-wrap">
                        {isAdmin ? (
                          <span className="flex items-center gap-1.5 text-[var(--muted)]">
                            <Heart size={11}/> {post.likes || 0} likes
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => requireSignedIn() && togglePostLike?.(post.id)}
                            aria-label={liked ? 'Unlike feed post' : 'Like feed post'}
                            title={liked ? 'Unlike' : 'Like'}
                            className={`cursor-pointer hover:text-[var(--accent)] flex items-center gap-1.5 ${liked ? 'text-[var(--accent)]' : ''}`}
                          >
                            <Heart size={11} fill={liked ? 'currentColor' : 'none'}/> {post.likes || 0}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenPost(openPost === post.id ? null : post.id)}
                          aria-expanded={openPost === post.id}
                          aria-label="Open feed post comments"
                          title="Comments"
                          className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5"
                        >
                          <MessageCircle size={11}/> {commentCount}
                        </button>
                        <button type="button" onClick={() => sharePost(post.id)} className="cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5" aria-label="Share feed post" title="Share"><Share2 size={11}/> Share</button>
                        {isAdmin ? (
                          <span className="flex items-center gap-1.5 text-[var(--muted)]">
                            <Bookmark size={11}/> {post.saves || 0} saves
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => requireSignedIn() && toggleSavedPost?.(post.id)}
                            aria-label={saved ? 'Unsave feed post' : 'Save feed post'}
                            title={saved ? 'Unsave' : 'Save'}
                            className={`cursor-pointer hover:text-[var(--ink)] flex items-center gap-1.5 ${saved ? 'text-[var(--ink)]' : ''}`}
                          >
                            <Bookmark size={11} fill={saved ? 'currentColor' : 'none'}/> {post.saves || 0}
                          </button>
                        )}
                        {isAdmin ? (
                          <button type="button" onClick={onOpenAdmin} className="cursor-pointer hover:text-[var(--accent)] flex items-center gap-1.5 ml-auto" aria-label="Review social reports" title="Review">
                            <ShieldCheck size={11}/> Review
                          </button>
                        ) : (
                          <button type="button" onClick={() => onReport?.({ type: 'feed_post', id: post.id, label: `${artist.name} feed post` })} className="cursor-pointer hover:text-[var(--accent)] flex items-center gap-1.5 ml-auto" aria-label="Report feed post" title="Report">
                            <Flag size={11}/> Report
                          </button>
                        )}
                      </div>
                      {openPost === post.id && (
                        <PostComments
                          postId={post.id}
                          userId={user?.id}
                          canComment={!isAdmin}
                          readOnlyLabel="Admin accounts can view comments here. Resolve comment issues through reports."
                          onCountChange={(delta) => setCommentDeltas(prev => ({ ...prev, [post.id]: Number(prev[post.id] || 0) + delta }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-5 space-y-8">
          <div className="hair-all p-6 bg-[var(--card)]">
            <div className="label mb-4">Suggested studios</div>
            {artists.slice(0, 4).map(artist => {
              const following = follows[artist.id];
              return (
                <div key={artist.id} className="flex items-center justify-between py-3 hair-b last:border-0 gap-3">
                  <button type="button" onClick={() => goToArtist(artist.id)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left">
                    <div className="w-9 h-9 flex-shrink-0" style={{background: artist.accent}}/>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{artist.name}{artist.verified && <span className="text-[var(--accent)] ml-1 text-[11px]">●</span>}</div>
                      <div className="mono text-[10px] text-[var(--muted)] truncate">{artist.handle} · {fmt(artist.followers)}</div>
                    </div>
                  </button>
                  {isAdmin ? (
                    <button type="button" onClick={() => goToArtist(artist.id)} className="mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors hair-all hover:bg-[var(--ink)] hover:text-[var(--bg)]">
                      Open
                    </button>
                  ) : (
                    <button type="button" onClick={() => toggleFollow(artist.id)} className={`mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 transition-colors ${following ? 'hair-all text-[var(--muted)]' : 'bg-[var(--ink)] text-[var(--bg)]'}`}>
                      {following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hair-all p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="label">Trending tags</div>
              {tagFilter && (
                <button type="button" onClick={() => setTagFilter('')} className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">
                  Clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map(tag => {
                const active = tagFilter === tag;
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => setTagFilter(active ? '' : tag)}
                    aria-pressed={active}
                    className={`hair-all px-2.5 py-1 mono text-[10px] uppercase tracking-[0.1em] cursor-pointer transition-colors ${active ? 'bg-[var(--ink)] text-[var(--bg)]' : 'hover:bg-[var(--ink)] hover:text-[var(--bg)]'}`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
            {tagFilter && (
              <div className="mono text-[10px] text-[var(--muted)] mt-3">
                Showing posts tagged #{tagFilter}.
              </div>
            )}
          </div>

          {isAdmin ? (
            <div className="hair-all p-6 bg-[var(--ink)] text-[var(--bg)]">
              <div className="label" style={{color:'#9C988A'}}>Social controls</div>
              <div className="display text-[28px] mt-3 leading-tight">Reports are the admin action path.</div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="hair-all border-[#3a3a36] p-3">
                  <div className="mono text-[22px] leading-none">{feedPosts.length}</div>
                  <div className="label mt-1" style={{color:'#9C988A'}}>Posts</div>
                </div>
                <div className="hair-all border-[#3a3a36] p-3">
                  <div className="mono text-[22px] leading-none">{artists.length}</div>
                  <div className="label mt-1" style={{color:'#9C988A'}}>Studios</div>
                </div>
              </div>
              <button type="button" onClick={onOpenAdmin} className="swiss-btn accent w-full justify-center mt-4">Open admin queue <ArrowRight size={12}/></button>
            </div>
          ) : (
            <div className="hair-all p-6 bg-[var(--ink)] text-[var(--bg)]">
              <div className="label" style={{color:'#9C988A'}}>Drop alerts</div>
              <div className="display text-[28px] mt-3 leading-tight">Get notified 6 hours before public drops.</div>
              <input
                type="email"
                value={alertEmail}
                onChange={event => setAlertEmail(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') subscribeDropAlerts(); }}
                className="swiss-input mt-5 text-[var(--bg)] border-[#3a3a36]"
                placeholder="your@email"
                aria-label="Email for drop alerts"
              />
              <button type="button" onClick={subscribeDropAlerts} className="swiss-btn accent w-full justify-center mt-3">Subscribe <ArrowRight size={12}/></button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
