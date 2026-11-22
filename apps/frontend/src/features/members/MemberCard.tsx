import type { ComponentProps } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Member } from '@/features/members/types';

function memberInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface MemberAvatarProps extends ComponentProps<typeof Avatar> {
  member: Member;
  alt?: string;
}

export function MemberAvatar({ member, alt = '', ...props }: MemberAvatarProps) {
  const cfg = member.foto.config;
  const imgStyle = cfg
    ? {
        objectPosition: `${cfg.x}% ${cfg.y}%`,
        transform: `scale(${cfg.zoom}) rotate(${cfg.rotate ?? 0}deg)`,
      }
    : undefined;

  return (
    <Avatar {...props}>
      {member.foto.url ? (
        <AvatarImage src={member.foto.url} alt={alt} style={imgStyle} />
      ) : null}
      <AvatarFallback>{memberInitials(member.name)}</AvatarFallback>
    </Avatar>
  );
}
