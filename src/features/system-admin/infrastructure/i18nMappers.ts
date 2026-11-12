import type { components } from '@/shared/infrastructure/api/schema'

import type {
  AdminImportPageSpec,
  AdminImportReport,
  AdminImportRequest,
  AdminLanguage,
  AdminLanguagePatch,
  AdminMissingLanguage,
  AdminPageCreateInput,
  AdminPagePatch,
  AdminPhrase,
  AdminTranslationPage,
} from '../domain/adminI18n'

type Schemas = components['schemas']
export type SystemLanguageDto = Schemas['SystemLanguageResponse']
export type SystemLanguageUpdateRequestDto = Schemas['SystemLanguageUpdateRequest']
export type SystemTranslationPageDto = Schemas['SystemPageResponse']
export type SystemPageCreateRequestDto = Schemas['SystemPageCreateRequest']
export type SystemPageUpdateRequestDto = Schemas['SystemPageUpdateRequest']
export type SystemPhraseDto = Schemas['SystemPhraseResponse']
export type SystemPhraseUpsertRequestDto = Schemas['SystemPhraseUpsertRequest']
export type SystemMissingLanguageDto = Schemas['SystemMissingLanguageResponse']
export type SystemImportRequestDto = Schemas['SystemImportRequest']
export type SystemImportReportDto = Schemas['SystemImportReportResponse']

export const toAdminLanguage = (dto: SystemLanguageDto): AdminLanguage => ({
  code: dto.code,
  name: dto.name,
  nativeName: dto.native_name,
  script: dto.script,
  isActive: dto.is_active,
  isDefault: dto.is_default,
  sortOrder: dto.sort_order,
})

export const toLanguageUpdateRequest = (
  patch: AdminLanguagePatch,
): SystemLanguageUpdateRequestDto => ({
  ...(patch.isActive === undefined ? {} : { is_active: patch.isActive }),
  ...(patch.isDefault === undefined ? {} : { is_default: patch.isDefault }),
})

export const toAdminTranslationPage = (dto: SystemTranslationPageDto): AdminTranslationPage => ({
  key: dto.key,
  description: dto.description ?? null,
  isActive: dto.is_active,
  phraseCount: dto.phrase_count,
})

export const toPageCreateRequest = (input: AdminPageCreateInput): SystemPageCreateRequestDto => ({
  key: input.key,
  ...(input.description === undefined ? {} : { description: input.description }),
  is_active: input.isActive,
})

export const toPageUpdateRequest = (patch: AdminPagePatch): SystemPageUpdateRequestDto => ({
  ...(patch.description === undefined ? {} : { description: patch.description }),
  ...(patch.isActive === undefined ? {} : { is_active: patch.isActive }),
})

export const toAdminPhrase = (dto: SystemPhraseDto): AdminPhrase => ({
  pageKey: dto.page_key,
  phraseKey: dto.phrase_key,
  values: { ...dto.values },
})

export const toPhraseUpsertRequest = (
  values: Readonly<Record<string, string>>,
): SystemPhraseUpsertRequestDto => ({ values: { ...values } })

export const toAdminMissingLanguage = (dto: SystemMissingLanguageDto): AdminMissingLanguage => ({
  code: dto.code,
  total: dto.total,
  pages: { ...dto.pages },
})

/** Flattens the domain import shape to the legacy seed shape the endpoint expects. */
const toImportPage = (page: string | AdminImportPageSpec): string | Schemas['SystemImportPage'] =>
  typeof page === 'string'
    ? page
    : {
        key: page.key,
        ...(page.description === undefined ? {} : { description: page.description }),
        is_active: page.isActive,
      }

export const toImportRequest = (body: AdminImportRequest): SystemImportRequestDto => ({
  pages: body.pages === null ? null : body.pages.map(toImportPage),
  phrases: body.phrases === null ? null : body.phrases,
  overwrite: body.overwrite,
  dry_run: body.dryRun,
})

export const toAdminImportReport = (dto: SystemImportReportDto): AdminImportReport => ({
  pagesCreated: dto.pages_created,
  phrasesCreated: dto.phrases_created,
  inserted: dto.inserted,
  updated: dto.updated,
  unchanged: dto.unchanged,
  conflicts: dto.conflicts.map((conflict) => ({
    pageKey: conflict.page_key,
    phraseKey: conflict.phrase_key,
    languageCode: conflict.language_code,
  })),
  perLanguage: { ...dto.per_language },
  missingPerLanguage: { ...dto.missing_per_language },
  dryRun: dto.dry_run,
  revision: dto.revision ?? null,
})
