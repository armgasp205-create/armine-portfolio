import ArticleList from "./ArticleList";
import { posts } from "../lib/posts";

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">FRONT-END · ՈՒՍՄԱՆ ՕՐԱԳԻՐ</p>
        <h1>Փոքր քայլերով՝<br /><span>դեպի մեծ գաղափարներ։</span></h1>
        <p className="intro">Գրառումներ կոդի, նոր բացահայտումների ու իմ ծրագրավորման ճանապարհի մասին։</p>
        <a className="pill" href="#articles">Կարդալ հոդվածները ↓</a>
        <div className="hero-mark" aria-hidden="true">&lt;/&gt;</div>
      </section>
      <section id="articles" className="articles">
        <div className="section-heading"><h2>Վերջին գրառումները</h2><span>01 — 03</span></div>
        <ArticleList posts={posts} />
      </section>
    </>
  );
}
