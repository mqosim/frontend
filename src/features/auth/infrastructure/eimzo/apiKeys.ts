/**
 * Domain → E-IMZO API-KEY mapping.
 *
 * These are public, domain-bound values that ship inside the page's own
 * JavaScript; they are NOT secrets and they do not sign anything (the user's
 * ЭЦП key does that). The entries below are the documented development keys
 * from `qo0p/e-imzo-doc` (`example.uz/php/demo/e-imzo-init.js`). Add a
 * production domain here with the API-KEY issued for it.
 *
 * E-IMZO v6 can also load the key for the current domain itself, so a missing
 * entry is not necessarily fatal; but if the handshake fails for a domain we do
 * not know, the adapter reports a clear "no API-KEY" error.
 */
export const EIMZO_API_KEYS: Readonly<Record<string, string>> = {
  null: 'E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D',
  localhost:
    '96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B',
  '127.0.0.1':
    'A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F',
  'test.e-imzo.uz':
    'DE783306B4717AFE4AE1B185E1D967C265AA397A35D8955C7D7E38A36F02798AA62FBABE2ABA15C888FE2F057474F35A5FC783D23005E4347A3E34D6C1DDBAE5',
  'test.e-imzo.local':
    'D56ABC7F43A23466D9ADB1A2335E7430FCE0F46B0EC99B578D554333245FC071357AE9E7E2F75F96B73AEEE7E0D61AE84E414F5CD795D8B6484E5645CAF958FC',
}

/** Flattens the mapping into the `[domain, key, domain, key, …]` list `CAPIWS.apikey` expects. */
export const toApiKeyList = (keys: Readonly<Record<string, string>>): string[] =>
  Object.entries(keys).flatMap(([domain, key]) => [domain, key])
