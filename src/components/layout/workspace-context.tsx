'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { WorkspaceSummaryDto } from '@novachat-enterprise-erp/contracts';

const WorkspaceContext = createContext<WorkspaceSummaryDto | null>(null);

export function WorkspaceProvider({ workspace, children }: { workspace: WorkspaceSummaryDto; children: ReactNode }) {
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceSummaryDto {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used inside a workspace route');
  return workspace;
}
