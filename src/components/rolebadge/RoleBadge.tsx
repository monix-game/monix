import React from 'react';
import {
  IconCrown,
  IconHammer,
  IconRobot,
  IconShield,
  IconTools,
  IconUser,
} from '@tabler/icons-react';
import { titleCase } from '../../../server/common/math';

const ROLE_ICONS = {
  owner: IconCrown,
  admin: IconTools,
  mod: IconShield,
  helper: IconHammer,
  system: IconRobot,
} as const;

type RoleBadgeProps = {
  role: string;
  className?: string;
};

/**
 * Circular staff/system badge. The role name is only exposed to assistive
 * technology (and via the native tooltip) so the badge stays compact.
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const normalisedRole = role.toLowerCase();
  const Icon = ROLE_ICONS[normalisedRole as keyof typeof ROLE_ICONS] ?? IconUser;
  const label = titleCase(normalisedRole);

  return (
    <span
      className={`user-badge ${normalisedRole} ${className ?? ''}`.trim()}
      title={label}
      aria-label={label}
      role="img"
    >
      <Icon size={14} stroke={2.2} aria-hidden="true" />
    </span>
  );
};
