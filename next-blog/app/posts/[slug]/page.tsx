import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "../../../lib/posts";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find(post => post.slug === slug);
  return { title: post?.title ?? "Հոդվածը չի գտնվել", description: post?.excerpt };
}

export default async function Article({ params }: Props) {
  const { slug } = await params;
  const post = posts.find(post => post.slug === slug);
  if (!post) notFound();
  return (
    <article className="post">
      <Link className="back" href="/">← Բոլոր հոդվածները</Link>
      <p className="eyebrow">{post.category} · {post.minutes} րոպե ընթերցում</p>
      <h1>{post.title}</h1>
      <p className="intro">{post.excerpt}</p>
      {post.sections.map(section => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.text}</p>
          {section.code && <pre><code>{section.code}</code></pre>}
        </section>
      ))}
      <Link className="pill" href="/">Վերադառնալ հոդվածներին</Link>
    </article>
  );
}
