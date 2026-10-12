"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "../lib/posts";

export default function ArticleList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Բոլորը");
  const categories = ["Բոլորը", ...new Set(posts.map(post => post.category))];
  const visible = posts.filter(post => (category === "Բոլորը" || post.category === category) && `${post.title} ${post.excerpt} ${post.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <div className="article-tools">
      <label htmlFor="article-search">Որոնել հոդված<input id="article-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Օրինակ՝ React" /></label>
      <div className="categories" role="group" aria-label="Հոդվածների կատեգորիաներ">{categories.map(item => <button key={item} type="button" aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </div>
    <p role="status">{visible.length} հոդված</p>
    {!visible.length && <p>Հոդված չի գտնվել։ Փոխիր որոնումը կամ կատեգորիան։</p>}
    <div className="grid">{visible.map(post => {
      const index = posts.indexOf(post);
      return <article className="card" key={post.slug}>
        <div className={`art art-${index}`} aria-hidden="true">{["{ }", "↗", "N."][index]}</div>
        <div className="card-body"><p className="meta">{post.category} · {post.minutes} րոպե</p><h3><Link href={`/posts/${post.slug}/`}>{post.title}</Link></h3><p>{post.excerpt}</p><Link className="read" href={`/posts/${post.slug}/`}>Կարդալ հոդվածը <span aria-hidden="true">↗</span></Link></div>
      </article>;
    })}</div>
  </>;
}
