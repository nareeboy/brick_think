// lib/careers/types.ts
export interface RoleListItem {
  id: string;
  slug: string;
  title: string;
  location: string;
  employmentType: string;
  summary: string;
  isOpen: boolean;
  createdAt: string;
}

export interface PublicRole extends RoleListItem {
  descriptionMarkdown: string;
}

export interface ApplicationRow {
  id: string;
  roleId: string | null;
  roleTitle: string | null;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  phone: string;
  linkedinUrl: string;
  cvPath: string | null;
  cvFilename: string | null;
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected';
  createdAt: string;
  expiresAt: string;
}
