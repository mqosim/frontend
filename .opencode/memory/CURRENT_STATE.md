# Current state

Phase 1 (read-only audit) done; reports in .audit/ (git-ignored).
Blocked on: backend STEP 10.1 (error envelope in OpenAPI, enums, error-code catalog, contract notes) via `make contract-export OUT=../frontend/.audit`.
Next: re-evaluate UNKNOWN items with the new contract files, then Phase 2 in small steps on branch `api-migration`: regenerate client + client/error middleware (CSRF header), auth slice rebuild (login, OTP register, tenant switch), E-IMZO, documents slice (new UI), audit, i18n loader, settings; system/admin after backend superadmin exists.
Open: dev proxy target, password/email change, /master/*, document UI design source.
