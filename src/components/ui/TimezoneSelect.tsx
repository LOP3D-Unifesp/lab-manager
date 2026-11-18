type SupportedValuesOf = (key: "timeZone") => string[];

const fallbackTimezones = [
  "America/Sao_Paulo", "America/Manaus", "America/Recife", "America/Fortaleza",
  "America/Bahia", "America/Belem", "America/Cuiaba", "America/Porto_Velho",
  "America/Rio_Branco", "America/Noronha", "UTC",
];

export function getSupportedTimezones(current?: string) {
  const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: SupportedValuesOf }).supportedValuesOf;
  const values = supportedValuesOf ? supportedValuesOf("timeZone") : fallbackTimezones;
  return [...new Set([...values, "UTC", ...(current ? [current] : [])])].sort();
}

export function TimezoneSelect({ value, onChange, id = "timezone" }: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const options = getSupportedTimezones(value);
  return (
    <>
      <input
        id={id}
        className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal"
        list={`${id}-options`}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="America/Sao_Paulo"
      />
      <datalist id={`${id}-options`}>
        {options.map((timezone) => <option key={timezone} value={timezone} />)}
      </datalist>
    </>
  );
}
