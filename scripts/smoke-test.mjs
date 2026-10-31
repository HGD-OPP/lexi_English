const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

const pages = [
  ["/", "把单词"],
  ["/books/everyday-essentials", "Everyday Essentials"],
  ["/bookmarks", "生词本"],
  ["/login", "登录"],
];

for (const [path, needle] of pages) {
  const response = await fetch(base + path);
  const html = await response.text();
  console.log(
    `${response.status} ${path} (${html.length} bytes)${html.includes(needle) ? "" : " [missing marker]"}`,
  );
  if (response.status !== 200 || !html.includes(needle)) {
    process.exitCode = 1;
  }
}

const wordsResponse = await fetch(
  base + "/api/words?book=everyday-essentials&random=1&limit=2",
);
const wordsBody = await wordsResponse.json();
console.log(
  `${wordsResponse.status} /api/words → ${wordsBody.words?.length} words, source=${wordsBody.source}`,
);
console.log(wordsBody.words?.map((word) => word.spelling).join(", "));
if (wordsResponse.status !== 200 || wordsBody.words?.length !== 2) {
  process.exitCode = 1;
}

for (const [path, init] of [
  ["/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wordId: "x", rating: "known" }) }],
  ["/api/bookmarks", undefined],
  ["/api/generate-memory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spelling: "hello" }) }],
]) {
  const response = await fetch(base + path, init);
  console.log(`${response.status} ${path} (unauthenticated)`);
  if (response.status !== 401) {
    process.exitCode = 1;
  }
}
