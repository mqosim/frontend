<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import ConfirmDialog from '@/shared/presentation/components/ConfirmDialog.vue'

import type { AdminLanguage, AdminPhrase, AdminTranslationPage } from '../../../domain/adminI18n'
import { ADMIN_PERMISSIONS } from '../../../domain/permissions'
import { adminLoadErrorKey, i18nActionErrorKey } from '../../adminErrors'
import { useAdminUseCases } from '../../composables/useAdminUseCases'
import { usePermissions } from '../../composables/usePermissions'

/** Phrases requested per cursor slice (the endpoint's `limit`). */
const PAGE_SIZE = 50

/**
 * One catalog page's phrases with every language value. `i18n.read` lists them;
 * `i18n.manage` enables the editor and deletion. The list is key-cursor
 * paginated (`next_cursor` feeds Load more), because the contract has no offset
 * paging here.
 */
const { t } = useI18n()
const admin = useAdminUseCases()
const { can } = usePermissions()

const canManage = computed(() => can(ADMIN_PERMISSIONS.i18nManage))

const languages = shallowRef<readonly AdminLanguage[]>([])
const pages = shallowRef<readonly AdminTranslationPage[]>([])
const selectedPage = ref('')
const metaStatus = ref<'loading' | 'ready' | 'error'>('loading')
const metaError = shallowRef<AppError | null>(null)

const phrases = shallowRef<readonly AdminPhrase[]>([])
const nextCursor = ref<string | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('loading')
const error = shallowRef<AppError | null>(null)
const loadingMore = ref(false)

const actionErrorKey = ref<string | null>(null)
const busy = ref(false)

const metaErrorKey = computed(() =>
  metaError.value === null ? 'errors.generic' : adminLoadErrorKey(metaError.value),
)
const loadErrorKey = computed(() =>
  error.value === null ? 'errors.generic' : adminLoadErrorKey(error.value),
)

// Only the newest request may write state, so a page switch mid-flight cannot
// let a stale slice overwrite the current view.
let requestSeq = 0

const loadPhrases = async (reset: boolean): Promise<void> => {
  const page = selectedPage.value
  if (page === '') {
    phrases.value = []
    nextCursor.value = null
    status.value = 'ready'
    return
  }
  const seq = ++requestSeq
  if (reset) {
    status.value = 'loading'
    error.value = null
    phrases.value = []
    nextCursor.value = null
  } else {
    loadingMore.value = true
  }
  const result = await admin.listI18nPhrases(page, {
    limit: PAGE_SIZE,
    ...(reset || nextCursor.value === null ? {} : { cursor: nextCursor.value }),
  })
  if (seq !== requestSeq) return
  loadingMore.value = false
  if (!result.ok) {
    // A failed first slice replaces the view; a failed "load more" keeps the
    // rows already on screen and reports the error without losing them.
    if (reset) {
      error.value = result.error
      status.value = 'error'
    } else {
      actionErrorKey.value = adminLoadErrorKey(result.error)
    }
    return
  }
  phrases.value = reset ? result.value.items : [...phrases.value, ...result.value.items]
  nextCursor.value = result.value.nextCursor
  status.value = 'ready'
}

const loadMeta = async (): Promise<void> => {
  metaStatus.value = 'loading'
  metaError.value = null
  const [languageResult, pageResult] = await Promise.all([
    admin.listI18nLanguages(),
    admin.listI18nPages(),
  ])
  if (!languageResult.ok || !pageResult.ok) {
    metaStatus.value = 'error'
    if (!languageResult.ok) metaError.value = languageResult.error
    else if (!pageResult.ok) metaError.value = pageResult.error
    return
  }
  languages.value = languageResult.value
  pages.value = [...pageResult.value].sort((a, b) => a.key.localeCompare(b.key))
  metaStatus.value = 'ready'
  if (!pages.value.some((page) => page.key === selectedPage.value)) {
    selectedPage.value = pages.value[0]?.key ?? ''
  }
  await loadPhrases(true)
}

onMounted(() => void loadMeta())

const selectPage = (): void => {
  void loadPhrases(true)
}

const loadMore = (): void => {
  if (nextCursor.value === null || loadingMore.value) return
  void loadPhrases(false)
}

const languageValue = (phrase: AdminPhrase, code: string): string => phrase.values[code] ?? ''

// ── Editor (new or existing phrase) ───────────────────────────────────────
interface PhraseEditor {
  readonly pageKey: string
  phraseKey: string
  readonly isNew: boolean
  readonly values: Record<string, string>
}

const editor = ref<PhraseEditor | null>(null)

const emptyValues = (): Record<string, string> =>
  Object.fromEntries(languages.value.map((language) => [language.code, '']))

const startNew = (): void => {
  if (!canManage.value || selectedPage.value === '') return
  actionErrorKey.value = null
  editor.value = {
    pageKey: selectedPage.value,
    phraseKey: '',
    isNew: true,
    values: emptyValues(),
  }
}

const startEdit = (phrase: AdminPhrase): void => {
  if (!canManage.value) return
  actionErrorKey.value = null
  const values = emptyValues()
  for (const [code, value] of Object.entries(phrase.values)) values[code] = value
  editor.value = {
    pageKey: phrase.pageKey,
    phraseKey: phrase.phraseKey,
    isNew: false,
    values,
  }
}

const cancelEdit = (): void => {
  editor.value = null
}

const save = async (): Promise<void> => {
  const draft = editor.value
  if (draft === null || !canManage.value || busy.value) return
  const key = draft.phraseKey.trim()
  if (key === '') {
    actionErrorKey.value = 'system.i18n_error_invalid_key'
    return
  }
  // Only non-empty values are sent; at least one language must be provided.
  const values = Object.fromEntries(
    Object.entries(draft.values).filter(([, value]) => value.trim() !== ''),
  )
  if (Object.keys(values).length === 0) {
    actionErrorKey.value = 'system.i18n_error_invalid_value'
    return
  }
  busy.value = true
  actionErrorKey.value = null
  const result = await admin.upsertI18nPhrase(draft.pageKey, key, values)
  busy.value = false
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  editor.value = null
  await loadPhrases(true)
}

// ── Delete (confirm) ──────────────────────────────────────────────────────
const pendingDelete = shallowRef<AdminPhrase | null>(null)
const deleting = ref(false)

const askDelete = (phrase: AdminPhrase): void => {
  if (!canManage.value) return
  actionErrorKey.value = null
  pendingDelete.value = phrase
}

const confirmDelete = async (): Promise<void> => {
  const phrase = pendingDelete.value
  if (phrase === null || deleting.value) return
  deleting.value = true
  const result = await admin.deleteI18nPhrase(phrase.pageKey, phrase.phraseKey)
  deleting.value = false
  pendingDelete.value = null
  if (!result.ok) {
    actionErrorKey.value = i18nActionErrorKey(result.error)
    return
  }
  await loadPhrases(true)
}
</script>

<template>
  <section class="i18n-section">
    <p v-if="metaStatus === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

    <div v-else-if="metaStatus === 'error'" class="admin-state">
      <AppAlert variant="error">{{ t(metaErrorKey) }}</AppAlert>
      <AppButton variant="ghost" @click="loadMeta()">{{ t('system.admin_retry') }}</AppButton>
    </div>

    <template v-else>
      <p v-if="pages.length === 0" class="admin-state__empty">
        {{ t('system.i18n_no_pages') }}
      </p>

      <template v-else>
        <div class="i18n-phrases__toolbar">
          <label class="i18n-field i18n-field--select">
            <span class="i18n-field__label">{{ t('system.i18n_select_page') }}</span>
            <select
              v-model="selectedPage"
              class="admin-toolbar__input i18n-select"
              :title="selectedPage"
              @change="selectPage()"
            >
              <option v-for="page in pages" :key="page.key" :value="page.key">
                {{ page.key }}
              </option>
            </select>
          </label>
          <AppButton v-if="canManage" variant="primary" @click="startNew()">
            {{ t('system.i18n_phrase_new') }}
          </AppButton>
        </div>

        <AppAlert v-if="actionErrorKey !== null" variant="error">
          {{ t(actionErrorKey) }}
        </AppAlert>

        <form v-if="editor !== null" class="i18n-editor" @submit.prevent="save()">
          <h2 class="i18n-editor__title">
            {{ t(editor.isNew ? 'system.i18n_phrase_new' : 'system.i18n_phrase_edit') }}
          </h2>
          <label class="i18n-field">
            <span class="i18n-field__label">{{ t('system.i18n_phrase_key') }}</span>
            <input
              v-model="editor.phraseKey"
              class="admin-toolbar__input admin-table__mono"
              type="text"
              :readonly="!editor.isNew"
              maxlength="200"
            />
          </label>
          <div class="i18n-editor__values">
            <label v-for="language in languages" :key="language.code" class="i18n-field">
              <span class="i18n-field__label">
                {{ language.nativeName }}
                <span class="admin-table__mono">({{ language.code }})</span>
              </span>
              <textarea
                v-model="editor.values[language.code]"
                class="admin-toolbar__input i18n-editor__textarea"
                rows="2"
              ></textarea>
            </label>
          </div>
          <div class="admin-actions">
            <AppButton type="submit" :loading="busy">{{ t('action.save') }}</AppButton>
            <AppButton variant="ghost" @click="cancelEdit()">{{ t('action.cancel') }}</AppButton>
          </div>
        </form>

        <p v-if="status === 'loading'" class="admin-state__empty">{{ t('common.loading') }}</p>

        <div v-else-if="status === 'error'" class="admin-state">
          <AppAlert variant="error">{{ t(loadErrorKey) }}</AppAlert>
          <AppButton variant="ghost" @click="loadPhrases(true)">
            {{ t('system.admin_retry') }}
          </AppButton>
        </div>

        <p v-else-if="phrases.length === 0" class="admin-state__empty">
          {{ t('system.admin_empty') }}
        </p>

        <template v-else>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th scope="col">{{ t('system.i18n_phrase_key') }}</th>
                  <th v-for="language in languages" :key="language.code" scope="col">
                    {{ language.nativeName }}
                    <span class="admin-table__sub admin-table__mono">{{ language.code }}</span>
                  </th>
                  <th v-if="canManage" scope="col" class="admin-table__actions">
                    {{ t('system.admin_actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="phrase in phrases" :key="phrase.phraseKey">
                  <td class="admin-table__mono">{{ phrase.phraseKey }}</td>
                  <td v-for="language in languages" :key="language.code">
                    <span class="i18n-value">{{
                      languageValue(phrase, language.code) || '—'
                    }}</span>
                  </td>
                  <td v-if="canManage">
                    <div class="admin-table__actions admin-table__actions--nowrap">
                      <AppButton variant="ghost" @click="startEdit(phrase)">
                        {{ t('system.admin_edit') }}
                      </AppButton>
                      <AppButton variant="ghost" @click="askDelete(phrase)">
                        {{ t('system.i18n_delete') }}
                      </AppButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="nextCursor !== null" class="admin-actions">
            <AppButton variant="ghost" :loading="loadingMore" @click="loadMore()">
              {{ t('system.i18n_load_more') }}
            </AppButton>
          </div>
        </template>
      </template>
    </template>

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="t('system.i18n_phrase_delete_title')"
      :message="
        t('system.i18n_phrase_delete_message', {
          key: pendingDelete?.phraseKey ?? '',
        })
      "
      :confirm-label="t('system.i18n_delete')"
      :cancel-label="t('action.cancel')"
      :loading="deleting"
      @confirm="confirmDelete()"
      @cancel="pendingDelete = null"
      @dismiss="pendingDelete = null"
    />
  </section>
</template>

<style scoped src="../../styles/admin.css"></style>
<style scoped>
.i18n-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.i18n-phrases__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
  justify-content: space-between;
}

.i18n-field {
  display: flex;
  flex: 1 1 12rem;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.i18n-field__label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* The shared row-toolbar input carries `flex: 1 1 14rem`, which becomes a
   14rem HEIGHT once it sits in these column-flow fields (that is what blew up
   the page selector). Here controls keep a text-sized height instead. */
.i18n-field .admin-toolbar__input {
  flex: none;
}

/* One page key is ~20 characters, so the selector is bounded rather than
   stretched across the whole toolbar; `--space-*` padding comes from the
   shared input class. */
.i18n-phrases__toolbar .i18n-field--select {
  flex: 0 1 22rem;
}

.i18n-select {
  width: 100%;
  line-height: 1.4;
  text-overflow: ellipsis;
}

/* Option rows follow the control's own font/line-height; the small padding
   keeps a long page list compact without shrinking the labels. */
.i18n-select option {
  padding-block: var(--space-1);
  padding-inline: var(--space-2);
  line-height: 1.5;
}

.i18n-value {
  display: block;
  max-width: 22rem;
  overflow-wrap: anywhere;
}

.i18n-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.i18n-editor__title {
  margin: 0;
  font-size: var(--font-size-md);
}

.i18n-editor__values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.i18n-editor__textarea {
  resize: vertical;
}

@media (max-width: 48rem) {
  .i18n-editor__values {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Below the tablet breakpoint the toolbar stacks; the selector takes the
     full row instead of keeping its 22rem basis. */
  .i18n-phrases__toolbar .i18n-field--select {
    flex: 1 1 100%;
  }
}
</style>
