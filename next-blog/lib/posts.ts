export type Post = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  minutes: number;
  sections: { heading: string; text: string; code?: string }[];
};

export const posts: Post[] = [
  {
    slug: "html-css-javascript", title: "Երեք լեզու, մեկ կայք", category: "Հիմունքներ", minutes: 3,
    excerpt: "Ինչպես են HTML-ը, CSS-ը և JavaScript-ը միասին կառուցում էջը։",
    sections: [
      { heading: "Կառուցվածք՝ HTML", text: "HTML-ը նկարագրում է էջի բովանդակությունը։ Վերնագիրը, տեքստը և կոճակը յուրաքանչյուրը ունեն իրենց տարրը։", code: '<button type="button">Բարև</button>' },
      { heading: "Տեսք՝ CSS", text: "CSS-ը որոշում է տարրերի գույները, չափերը և դասավորությունը։ Նույն HTML-ը կարող է տարբեր տեսք ունենալ՝ կախված ոճերից։", code: 'button {\n  background: #c4f279;\n  color: #172019;\n  border-radius: 12px;\n}' },
      { heading: "Վարք՝ JavaScript", text: "JavaScript-ը արձագանքում է գործողություններին։ Օրինակ՝ կոճակը սեղմելուց հետո կարելի է փոխել դրա գրությունը։", code: 'const button = document.querySelector("button");\nbutton.addEventListener("click", () => {\n  button.textContent = "Բարև, Արմինե";\n});' },
    ],
  },
  {
    slug: "react-components", title: "Մեկ քարտից՝ շատ քարտեր", category: "React", minutes: 4,
    excerpt: "Կոմպոնենտներն ու props-ը՝ կրկնվող ինտերֆեյսները պարզ կառուցելու համար։",
    sections: [
      { heading: "Կրկնվող մասերը", text: "Ապրանքի կամ առաջադրանքի քարտը կարող ենք գրել որպես կոմպոնենտ։ Այն սահմանում է ընդհանուր կառուցվածքը, իսկ props-ը փոխանցում է յուրաքանչյուր քարտի տվյալները։", code: 'function Card({ title }: { title: string }) {\n  return <h2>{title}</h2>;\n}' },
      { heading: "Տվյալների փոխանցում", text: "Նույն կոմպոնենտն օգտագործում ենք տարբեր վերնագրերով։ TypeScript-ը ստուգում է, որ title-ը լինի տեքստ։", code: '<Card title="Եղանակի հավելված" />\n<Card title="Առաջադրանքների պլանավորիչ" />' },
      { heading: "Փոքր վարժություն", text: "Փորձիր քարտին ավելացնել description անունով ևս մեկ prop։ Այն ցույց տուր վերնագրի տակ՝ p տարրի մեջ։" },
    ],
  },
  {
    slug: "nextjs-pages", title: "Առաջին քայլերը Next.js-ում", category: "Next.js", minutes: 5,
    excerpt: "Ինչպես է ֆայլը դառնում էջ, իսկ հոդվածի անունը՝ հասցեի մաս։",
    sections: [
      { heading: "Ֆայլը դառնում է էջ", text: "App Router-ում app/page.tsx-ը գլխավոր էջն է։ app/layout.tsx-ը սահմանում է ընդհանուր կառուցվածքը՝ օրինակ՝ վերևի նավիգացիան ու ներքևի հատվածը։", code: 'export default function Page() {\n  return <h1>Իմ բլոգը</h1>;\n}' },
      { heading: "Յուրաքանչյուր հոդված՝ իր հասցեով", text: "app/posts/[slug]/page.tsx-ը հոդվածի էջի ձևանմուշն է։ slug-ը հոդվածի հասցեի հատվածն է։ Այս բլոգում generateStaticParams-ը թվարկում է հոդվածները, որպեսզի build-ի ժամանակ յուրաքանչյուրի համար էջ ստեղծվի։", code: 'export function generateStaticParams() {\n  return posts.map(post => ({ slug: post.slug }));\n}' },
      { heading: "Էջի վերնագիրը", text: "generateMetadata-ը հոդվածի տվյալներից ստեղծում է բրաուզերի ներդիրում երևացող վերնագիրը և էջի նկարագրությունը։ Այս նախագծի հոդվածները պահվում են տեղական TypeScript ֆայլում։" },
    ],
  },
];
