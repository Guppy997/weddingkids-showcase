// Angaben für Impressum und Datenschutzerklärung.
// Die echten Werte stehen in der .env (VITE_LEGAL_*) und werden beim Build
// eingesetzt — so bleiben Anschriften und Telefonnummern aus dem Code-Repo.
// Ohne .env (z. B. lokale Demo) erscheinen neutrale Platzhalter.

const env = import.meta.env;

export const COMPANY = {
  name:          env.VITE_LEGAL_COMPANY_NAME     || 'Musterfirma GbR',
  representedBy: env.VITE_LEGAL_REPRESENTED_BY   || 'Erika Mustermann und Max Mustermann',
  street:        env.VITE_LEGAL_STREET           || 'Musterstraße 1',
  city:          env.VITE_LEGAL_CITY             || '12345 Musterstadt',
  country:       env.VITE_LEGAL_COUNTRY          || 'Deutschland',
  email:         env.VITE_LEGAL_EMAIL            || 'info@example.com',
  phone:         env.VITE_LEGAL_PHONE            || '0000 000000',
  vatId:         env.VITE_LEGAL_VAT_ID           || 'DE000000000',
};

// Verantwortlich für Inhalt nach § 55 Abs. 2 RStV (kann abweichende Anschrift haben)
export const CONTENT_RESPONSIBLE = {
  name:   env.VITE_LEGAL_CONTENT_NAME   || COMPANY.representedBy,
  street: env.VITE_LEGAL_CONTENT_STREET || COMPANY.street,
  city:   env.VITE_LEGAL_CONTENT_CITY   || COMPANY.city,
};
