import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackAnalyticsEvent } from '../../lib/analytics';

type NewsLikeButtonProps = {
  newsId: string;
  compact?: boolean;
};

const VISITOR_STORAGE_KEY = 'gdrb_news_visitor_id';

function getVisitorId() {
  const existingVisitorId = window.localStorage.getItem(VISITOR_STORAGE_KEY);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const newVisitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, newVisitorId);

  return newVisitorId;
}

export function NewsLikeButton({ newsId, compact = false }: NewsLikeButtonProps) {
  const [visitorId, setVisitorId] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentVisitorId = getVisitorId();
    setVisitorId(currentVisitorId);

    async function loadLikes() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('gdrb_news_likes')
        .select('id, visitor_id')
        .eq('news_id', newsId);

      if (error) {
        console.error('Erro ao carregar gostos da notícia:', error);
        setIsLoading(false);
        return;
      }

      setLikesCount(data?.length ?? 0);
      setHasLiked((data ?? []).some((like) => like.visitor_id === currentVisitorId));
      setIsLoading(false);
    }

    loadLikes();
  }, [newsId]);

  async function handleToggleLike(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!visitorId || isSaving) {
      return;
    }

    setIsSaving(true);

    if (hasLiked) {
      const { error } = await supabase
        .from('gdrb_news_likes')
        .delete()
        .eq('news_id', newsId)
        .eq('visitor_id', visitorId);

      if (error) {
        console.error('Erro ao remover gosto:', error);
        setIsSaving(false);
        return;
      }

      setHasLiked(false);
      setLikesCount((currentCount) => Math.max(0, currentCount - 1));
      trackAnalyticsEvent({
        eventName: 'news_unlike',
        entityType: 'news',
        entityId: newsId,
      });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('gdrb_news_likes').insert({
      news_id: newsId,
      visitor_id: visitorId,
    });

    if (error) {
      console.error('Erro ao registar gosto:', error);
      setIsSaving(false);
      return;
    }

    setHasLiked(true);
    setLikesCount((currentCount) => currentCount + 1);
    trackAnalyticsEvent({
      eventName: 'news_like',
      entityType: 'news',
      entityId: newsId,
    });
    setIsSaving(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggleLike}
      disabled={isLoading || isSaving}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
        hasLiked
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700'
      } disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'px-3 py-1.5 text-xs' : ''}`}
      aria-label={hasLiked ? 'Remover gosto da notícia' : 'Gostar desta notícia'}
    >
      <Heart size={compact ? 14 : 16} fill={hasLiked ? 'currentColor' : 'none'} />
      <span>{hasLiked ? 'Gostei' : 'Gosto'}</span>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-black text-zinc-600">
        {likesCount}
      </span>
    </button>
  );
}
