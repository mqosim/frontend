/**
 * The workspace a regular (PERSON/ORG) session is currently scoped to. A PERSON
 * that selected an organization runs in the `org` workspace, exactly like a real
 * ORG account; a PERSON with no organization runs in `personal`.
 */
export type Workspace = 'personal' | 'org'
