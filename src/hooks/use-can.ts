'use client';

import type { Permission } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';

export const useCan = (permission: Permission): boolean => useWorkspace().permissions.includes(permission);
