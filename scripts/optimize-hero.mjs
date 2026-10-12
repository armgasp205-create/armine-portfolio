import { createRequire } from "node:module";
const sharp = createRequire(new URL("../next-blog/package.json", import.meta.url))("sharp");
const result = await sharp("hero.png").resize({width:1000,withoutEnlargement:true}).webp({quality:82}).toFile("hero.webp");
console.log(JSON.stringify({width:result.width,height:result.height,bytes:result.size}));
