import Link from "next/link";

export default function NotFound() {
  return <section className="post"><p className="eyebrow">404</p><h1>Էջը չի գտնվել։</h1><Link className="pill" href="/">Բոլոր հոդվածները</Link></section>;
}
