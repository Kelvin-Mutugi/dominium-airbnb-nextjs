'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';

export function UnreadNotificationBadge({ className = '' }: { className?: string }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let ignore = false;

    async function refreshCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || ignore) return;
      const { count: unreadCount } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);
      if (!ignore) setCount(unreadCount ?? 0);
      if (!channel) {
        channel = supabase
          .channel(`notifications-${user.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `recipient_id=eq.${user.id}`,
          }, () => void refreshCount())
          .subscribe();
      }
    }

    void refreshCount();
    window.addEventListener('focus', refreshCount);
    return () => {
      ignore = true;
      window.removeEventListener('focus', refreshCount);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [pathname]);

  if (!count) return null;
  return <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-[#E23E85] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${className}`}>{count > 99 ? '99+' : count}</span>;
}