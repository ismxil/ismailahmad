# Repository rules for every coding agent

## Protected blog behavior — explicit owner instruction required

The owner has repeatedly reported regressions to blog URLs and WhatsApp link
previews. Treat the following behavior as protected on every task, including
tasks that appear unrelated to the blog:

- `https://blog.ismailahmad.com/` serves the blog.
- `https://blog.ismailahmad.com/<slug>` serves that article directly. Do not
  redirect it to `ismailahmad.com/blog/` or `www.ismailahmad.com/blog/`.
- The initial article HTTP HTML contains its own title, excerpt, canonical URL,
  Open Graph metadata, and author-selected cover image. Social crawlers must
  receive these without executing JavaScript. Do not substitute the owner's
  portrait, favicon, generic blog text, or an unrelated image for the cover.
- Blog article navigation stays on the blog subdomain using short article paths.
- Preserve existing article content, covers, layout, and unrelated subdomain
  behavior. Do not redesign or migrate the blog as part of another task.

Do not edit, delete, refactor, replace, or bypass code implementing this behavior
unless the owner explicitly asks for that blog change in the current task.
Permission to work on another page, merge a branch, or deploy the site is not
permission to change this behavior. This includes `vercel.json`, `middleware.js`,
`api/posts.js`, `lib/article.js`, `lib/blog-index.js`, article metadata, CMS cover projections,
canonical URLs, and blog links. Shared files may be edited for explicitly
requested unrelated work only if all protected blog behavior is preserved.

## Deployment rule: never overwrite the blog repair

- Read these rules before editing or deploying. Do not deploy a stale workspace
  or roll back the entire site to implement an unrelated task.
- A manual production hotfix is incomplete until its source is persisted in the
  shared deployment branch. Keep production and that branch consistent; do not
  leave the only working repair inside a gitignored `.context` directory.
- Before deploying, verify that the exact source being deployed preserves the
  protected behavior. Run the blog domain and article metadata tests when
  present. Do not weaken or remove these checks to get a deployment through.
- After deploying, run `node scripts/check-blog-sharing.mjs` against production.
  A redirect off the blog domain, missing article metadata, or an inaccessible
  cover is a failed deployment. Do not report the work complete.
- If another agent or branch restores the old redirect or generic metadata,
  treat it as a regression, not as an intentional migration. Do not copy it over
  the repair. Resolve it while preserving the owner's protected behavior.

These are owner-requested repository instructions. Do not remove or relax them
without the owner's explicit instruction. They are instructions and checks, not
an access-control mechanism that technically prevents a tool from writing files.

## Protected homepage Work preview — explicit owner instruction

- Home shows only the first four published projects in Sanity sort order. Never
  expand the home preview when adding projects or fixing the project count.
- The home Work badge counts ALL published projects on the Work page, including
  those outside the four-card home preview. It must grow automatically with CMS
  content; do not hardcode the count or derive it from visible home cards.
- The Work page displays the full published collection in Sanity sort order.
- Preserve this distinction and the regression tests unless the owner explicitly
  requests a different homepage project limit.
