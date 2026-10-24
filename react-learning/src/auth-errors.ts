export function authErrorMessage(error:unknown) {
  const value=error as {code?:string;name?:string;status?:number};
  const messages:Record<string,string>={
    invalid_credentials:"Էլ․ փոստը կամ գաղտնաբառը սխալ է։ Եթե այս կայքում դեռ հաշիվ չունես, ընտրիր «Գրանցում»։",
    email_not_confirmed:"Էլ․ հասցեն դեռ հաստատված չէ։ Բացիր գրանցման նամակը և հաստատիր այն։",
    user_already_exists:"Այս էլ․ հասցեով հաշիվ արդեն կա։ Ընտրիր «Մուտք» կամ վերականգնիր գաղտնաբառը։",
    weak_password:"Ընտրիր ավելի ուժեղ գաղտնաբառ՝ առնվազն 8 նիշով։",
    same_password:"Նոր գաղտնաբառը պետք է տարբերվի հնից։",
    over_email_send_rate_limit:"Նամակների ուղարկման սահմանը լրացել է։ Սպասիր և փորձիր ավելի ուշ։",
    over_request_rate_limit:"Չափազանց շատ փորձեր են կատարվել։ Սպասիր մի քանի րոպե։",
    email_address_not_authorized:"Այս նախագիծը դեռ չի կարող նամակ ուղարկել այդ հասցեին։ Պետք է կարգավորել նամակների առաքումը Supabase-ում։",
    signup_disabled:"Այս նախագծում գրանցումն անջատված է։",
    otp_expired:"Հաստատման կամ վերականգնման հղման ժամկետն անցել է։ Պահանջիր նոր նամակ։",
  };
  if(value?.code && messages[value.code])return messages[value.code];
  if(value?.name==="AuthRetryableFetchError" || value?.name==="TypeError" || value?.name==="TimeoutError")return "Մուտքի ծառայությանը միանալ չհաջողվեց։ Ստուգիր ինտերնետը և փորձիր կրկին։";
  if(value?.status===429)return messages.over_request_rate_limit;
  return "Գործողությունը չհաջողվեց։ Փորձիր կրկին։"+(value?.code && /^[a-z_]+$/.test(value.code) ? ` Սխալի կոդ՝ ${value.code}` : "");
}
