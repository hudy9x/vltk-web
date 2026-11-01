## Quy tắc bắt buộc: skill nhiều tầng và sát thương cộng dồn

- Skill 8x/9x thường có 2–3 tầng; các skill cấp khác cũng có thể nhiều tầng. Trước khi sửa, xác định đầy đủ tầng chính, tầng phụ, điều kiện mở khóa/kích hoạt, va chạm và độ trễ của từng tầng.
- **Các tầng bổ sung và cộng dồn tác dụng/sát thương cho nhau. Không thay tầng trước bằng tầng sau, không chỉ tính tầng cuối.** Mỗi tầng gây damage riêng khi thỏa điều kiện của tầng đó; hiệu ứng thuần hình ảnh không tự tạo thêm damage.
- Với chiêu nhiều tia, mỗi cặp tia/mục tiêu có lượt sát thương độc lập. Ví dụ: mỗi tia 4.000, hai tia cùng trúng một mục tiêu phải gây hai hit 4.000; vẫn chống lặp hit của cùng một tia qua nhiều tick.
- Khi tầng sau ghi “tăng băng sát 30% so với tầng 1”, giữ nguyên các thành phần sát thương/chỉ số được kế thừa và chỉ tăng băng sát lên 130%; không tự bỏ vật lý, chí mạng hoặc thành phần khác. Nếu mô tả chưa rõ phần kế thừa, hỏi trước khi đổi công thức.
- Ví dụ đã xác nhận: **Kiếm Hoa Vãn Tinh (1061)** có 5 tia gây damage riêng; vòng tầng 2 trễ 0,2 giây, giữ vật lý và chí mạng tầng 1, băng sát = tầng 1 × 1,3. **Tam Nga Tề Tuyết (328)** có 3 tia gây damage riêng và vòng tầng 2 có sát thương vật lý/chỉ số chí mạng riêng. Vòng không làm mất damage của các tia.
- Khi sửa combat, kiểm tra từng tầng và tổng damage của cả lần xuất chiêu, số hit trên cùng mục tiêu, độ trễ và cách ghi nhận tầng gây damage. Đối chiếu trước/sau với cùng nhân vật, trang bị, mục tiêu, kháng và điều kiện chí mạng/ngẫu nhiên; phân biệt PvE với hệ số PvP. Áp dụng nhất quán cho người chơi, SIM và server online; không chỉ test bằng callback damage giả cố định.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **vltk-web** (6539 symbols, 23873 relationships, 339 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/vltk-web/context` | Codebase overview, check index freshness |
| `gitnexus://repo/vltk-web/clusters` | All functional areas |
| `gitnexus://repo/vltk-web/processes` | All execution flows |
| `gitnexus://repo/vltk-web/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
