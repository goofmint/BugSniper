# 🧩 Bug Sniper — Git ブランチ構成（実装順）

以下のようなルールを想定しています：

```
main → production 用
develop → 開発の統合先
feature/* → 各要件（この一覧）
```

---

## 0. デプロイ・CI/CD

### 11.1 デプロイターゲット

- Cloudflare Workers（`wrangler.toml` で D1 / KV / R2 バインディングを設定）

### 11.2 GitHub Actions

- `main` ブランチ push をトリガーとして自動デプロイする。

例：

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm install
      - run: npm run build

      - name: Deploy with Wrangler
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

# 1. ⚙️ 基礎セットアップ

## ■ feature/project-setup

内容：

- Directory 設計（routes, components, problems, locales, utils など）
- ESLint / Prettier / TypeScript 設定
- Tailwind（使う場合）セットアップ
- dev / prod ビルド確認
- wrangler.toml の雛形作成

---

# 2. 🌏 多言語基盤

## ■ feature/i18n-base

内容：

- `locales/ja.json` / `locales/en.json` 作成
- `useI18n()` フック（Remix context / loader 経由）
- UI の言語自動判定（URL / cookie / Accept-Language）
- 最低限の UI 文言を国際化

---

# 3. 🔧 問題データ周りの実装

## ■ feature/problem-loader

内容：

- JSON/MDX の読み込みロジック
- `getProblems(language, level)` 実装
- ディレクトリ構造：

  ```
  app/problems/{language}/levelX/*.json
  ```

- 型定義（`Problem`, `Issue`）
- 5〜10問のダミーデータ作成（JS の level1）

---

# 4. 🎮 ゲームロジック（フロント側）

## ■ feature/game-core

内容：

- `/$lang/$codeLanguage/play` ルート作成（例：`/ja/javascript/play`）
- GameState（score, combo, timer, currentLevel）
- 行タップ処理（当たり / 外れ）
- コンボ計算
- レベル進行（1→2→3）
- スキップ機能
- ゲーム終了処理（フロント内完結）
- レベル内のデータはランダムに選択

---

# 5. 🖼 UI / 画面作成

## ■ feature/ui-basic-screens

内容：

- タイトル画面（START、UI言語、コード言語）
- ゲーム画面テンプレート
- 終了画面（ローカルスコア表示）
- スマホ最適 UI（縦長前提）

（この時点ではまだ D1 保存なし）

---

# 6. 🗃 スコア保存（D1）

## ■ feature/db-schema

内容：

- D1 schema（scores テーブル）の作成
- ローカル wrangler dev で D1 動作確認
- D1 バインディング設定追加（wrangler.toml）

---

## ■ feature/score-submit-api

内容：

- `POST /api/finish` の実装
- 結果を D1 に INSERT
- scoreId を返す
- `/play` → `/result/:id` の遷移フロー実装

---

# 7. 📄 結果ページ（SSR）

## ■ feature/result-page

内容：

- `/result/:id` の loader → D1 から取得
- SSR でスコア表示
- 名前入力フォーム（任意）
- `POST /api/name` 実装（D1 UPDATE）
- UI 多言語対応
- ここで初めて「永久閲覧可能な結果ページ」が完成

---

# 8. 🏆 ランキング機能

## ■ feature/ranking-api

内容：

- `GET /api/ranking`
- 言語フィルタ
- 期間フィルタ（today / all）

---

## ■ feature/ranking-page

内容：

- `/ranking` ページ
- TOP50 を SSR 表示
- 言語切替タブ
- 自分の結果へのリンク

---

# 9. 🧠 LLM フィードバック

## ■ feature/llm-feedback

内容：

- `generateFeedback()` 実装（OpenAI など）
- `POST /api/finish` 内で非同期生成 → D1 に保存
- `/result/:id` で表示
- UI 言語に応じた出力切替

---

# 10. 🖼 OGP 対応

## ■ feature/ogp-generator

内容：

- 結果ページ用 OGP画像生成
  - HTML based → PNG → R2 保存

- 成果物の URL を meta タグに設定
- Worker 側に専用エンドポイント作る選択肢もあり
- シェア時に「スコア入り画像」が展開されるようにする

---

# 11. ⚡ KV キャッシュ（任意・高速化）

## ■ feature/kv-cache

用途：

- 結果 JSON のキャッシュ
- ランキングサマリのキャッシュ
- LLM 入力データの軽量化

---

# 12. 🧪 プログラミング言語セット拡張

## ■ feature/problemsets-multi-lang

内容：

- PHP / Ruby / Java / Dart の問題データ追加
- 各言語の level1〜3 のサンプル問題を格納
- `getProblems()` の多言語対応を拡張

---

# 13. 🎀 仕上げ

## ■ feature/polish-ui

- アニメーション
- 行タップ時のエフェクト
- コンボ演出
- スコア結果のトランジション

## ■ feature/deployment

- 本番ビルド → Cloudflare Pages/Workers にデプロイ
- R2 / D1 / KV の本番バインディング設定
- OGP表示確認
- パフォーマンス調整（asset size / SSR速度）

---

# ✔ 最終まとめ（推奨実装順）

```
1. project-setup
2. i18n-base
3. problem-loader
4. game-core
5. ui-basic-screens
6. db-schema
7. score-submit-api
8. result-page
9. ranking-api → ranking-page
10. llm-feedback
11. ogp-generator
12. kv-cache
13. problemsets-multi-lang
14. polish-ui
15. deployment
```

````markdown
# Bug Sniper 基本設計書（v1）

## 1. プロジェクト概要

### 1.1 システム名

- システム名：**Bug Sniper（バグ・スナイパー）**

### 1.2 目的

- 60 秒間でソースコード中の不具合（バグ、セキュリティ、パフォーマンス、設計）を“スナイプ”していくコードレビューゲームを提供する。
- スマートフォン（縦画面）を第一ターゲットとしたブラウザゲームとして設計し、PC ブラウザでも利用可能とする。
- ゲーム結果をランキング・シェア・LLM フィードバックに接続し、「遊びながらレビュー観点を学べる」体験を提供する。

---

## 2. アーキテクチャ

### 2.1 技術スタック

- フロントエンド：
  - **React Router（Data APIs 使用）**
  - TypeScript
  - **Tailwind CSS**（スタイリングのメイン手段）
- ランタイム：
  - **Cloudflare Workers**
- データストア：
  - **Cloudflare D1**：スコア、ランキング、LLM フィードバック
  - **Cloudflare KV**：結果 JSON、ランキングサマリなどのキャッシュ
  - **Cloudflare R2**：結果ページ用 OGP 画像
- AI：
  - 外部 LLM（OpenAI 等を想定）  
    → プレイ結果に対するフィードバック（見逃しポイント、得意分野など）生成

### 2.2 プロジェクトテンプレート

- ベースプロジェクトは Cloudflare の React Router テンプレートを使用する：

```bash
npm create cloudflare@latest -- my-react-router-app --framework=react-router
```
````

- 本プロジェクトではこのテンプレートをベースに、
  - ルーティング構成
  - Tailwind 設定
  - D1 / KV / R2 バインディング
    を追加・変更していく。

### 2.3 データロード／更新方式

- 専用の `/api/...` REST エンドポイントは作成しない。
- 代わりに、**React Router の Data Router 機能**を利用する：
  - 各ルートの `loader` / `action`
  - クライアント側からは **`useFetcher`** を使用して POST / 更新を行う。

- 主なデータフロー：
  - ゲーム終了 → `/result/create` の `action` へ `useFetcher.submit` で送信
  - ランキング取得 → `/ranking` ルートの `loader` で D1 から取得
  - 結果ページ → `/result/:id` の `loader` で D1 / KV / R2 を参照

---

## 3. ルーティング・画面構成

### 3.1 ルート一覧

| パス                           | 役割                              |
| ------------------------------ | --------------------------------- |
| `/`                            | ルート（言語自動判定・リダイレクト） |
| `/$lang`                       | タイトル画面（例：`/ja`, `/en`）  |
| `/$lang/$codeLanguage/play`    | ゲーム画面（例：`/ja/javascript/play`） |
| `/result/create`               | ゲーム終了時のスコア登録 `action` |
| `/result/:id`                  | 結果画面（SSR、シェア用）         |
| `/ranking`                     | ランキング一覧画面                |

- ルート定義は `src/routes` 配下に作成する。

### 3.2 共通レイアウト

- `src/routes/root.tsx`（またはテンプレートに応じた Root コンポーネント）で共通レイアウトを定義する。
- 共通ヘッダー・テーマ（ダーク／ライト）、コンテナレイアウトをここで提供する。

---

## 4. UI・デザイン設計（Tailwind ベース）

### 4.1 Tailwind 導入

- Tailwind は標準的な手順で導入する（`tailwind.config.cjs` + `postcss.config.cjs`）。
- `src/index.css`（またはエントリ CSS）に以下を定義：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- `tailwind.config.cjs` では `darkMode: 'class'` とし、`html` 要素に `class="dark"` を付随させる方式にする。

### 4.2 ダークモード／ライトモード

- `darkMode: 'class'` を使用。
- テーマ状態は React Context + `localStorage` で管理。
- HTML の `class` に `dark` を付与・削除する。

```tsx
// 例：ThemeProvider 内で
useEffect(() => {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}, [theme]);
```

- ベースの配色例：

```html
<body class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"></body>
```

### 4.3 ヘッダー仕様

- ヘッダーは全ページ共通で表示。
- 左側：**文字ロゴ「Bug Sniper」**
- 右側：
  - GitHub アイコン（Iconify 利用）
    - リンク先：`https://github.com/goofmint/BugSniper`

  - CodeRabbit アイコン
    - 画像パス：`public/images/coderabbit-icon.svg`

  - テーマ切り替えトグル（ダーク／ライト）

#### ヘッダーレイアウト例（Tailwind）

```tsx
<header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
  <div className="text-xl font-bold tracking-tight">Bug Sniper</div>
  <div className="flex items-center space-x-4">
    <a
      href="https://github.com/goofmint/BugSniper"
      aria-label="GitHub"
      className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
    >
      <span className="iconify w-6 h-6" data-icon="mdi:github" />
    </a>
    <a
      href="https://coderabbit.ai"
      aria-label="CodeRabbit"
      className="opacity-80 hover:opacity-100 transition"
    >
      <img src="/images/coderabbit-icon.svg" alt="CodeRabbit" className="w-6 h-6" />
    </a>
    {/* テーマ切り替えボタン */}
    <ThemeToggleButton />
  </div>
</header>
```

### 4.4 タイトル画面

- 垂直中央揃え、シンプルな構成。
- 要素：
  - タイトルロゴ
  - UI 言語選択（日本語 / 英語）
  - コード言語選択（All / JS / PHP / Ruby / Java / Dart）
  - START ボタン

```tsx
<div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 space-y-6">
  <h1 className="text-4xl font-bold tracking-tight">Bug Sniper</h1>

  <div className="space-y-3 w-full max-w-xs">
    <select className="w-full px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
      {/* 日本語 / English */}
    </select>
    <select className="w-full px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
      {/* All / JS / PHP / Ruby / Java / Dart */}
    </select>
  </div>

  <button className="w-full max-w-xs py-3 text-lg font-semibold rounded-md bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition">
    START
  </button>
</div>
```

### 4.5 ゲーム画面

- 上部：残り時間、スコア、コンボ
- 中央：コード表示（スクロール可能）
- 下部：スキップボタン

```tsx
<div className="flex flex-col h-[calc(100vh-56px)] px-3 py-3 space-y-3">
  <div className="flex items-center justify-between text-sm">
    <div>
      Time: <span className="font-semibold">{remaining}s</span>
    </div>
    <div>
      Score: <span className="font-semibold">{score}</span>
    </div>
    <div>
      Combo: <span className="font-semibold">{combo}x</span>
    </div>
  </div>

  <div className="flex-1 overflow-auto">
    <pre className="text-xs sm:text-sm leading-relaxed font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
      {code.map((line, idx) => (
        <div
          key={idx}
          onClick={() => handleLineTap(idx + 1)}
          className="py-1 px-2 rounded-md cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900 data-[hit=true]:bg-emerald-100 dark:data-[hit=true]:bg-emerald-900"
          data-hit={hitLines.includes(idx + 1)}
        >
          <span className="inline-block w-8 text-right text-slate-400 select-none">{idx + 1}</span>
          <span className="ml-2">{line}</span>
        </div>
      ))}
    </pre>
  </div>

  <button
    onClick={handleSkip}
    className="w-full py-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition text-sm font-medium"
  >
    スキップ / Skip
  </button>
</div>
```

---

## 5. 多言語対応（UI）

### 5.1 対応言語

- 日本語（`ja`）
- 英語（`en`）

### 5.2 実装方針

- `src/locales/ja.json`, `src/locales/en.json` でキーごとに文言を管理。

```jsonc
// src/locales/ja.json
{
  "title": "Bug Sniper",
  "button.start": "スタート",
  "label.score": "スコア",
  "label.time": "残り時間",
  "label.combo": "コンボ",
  "label.skip": "スキップ",
  "nav.ranking": "ランキング",
}
```

- 言語判定優先度：
  1. URL パラメータ `?lang=ja|en`
  2. `localStorage.lang`
  3. ブラウザの `navigator.language`

- `I18nProvider` + `useI18n()` フックで文言を取得。

---

## 6. ゲーム仕様

### 6.1 基本ルール

- 制限時間：**60 秒**
- 各問題は 3〜5 個の issue を含むコードスニペット。
- プレイヤーは「問題があると思う行番号」をタップする。
- スキップボタンで次の問題へ進行（時間はそのまま）。
- レベル構造：
  - 1問目：Level 1
  - 2問目：Level 2
  - 3問目以降：Level 3（最大レベル）からランダム出題

### 6.2 対応コード言語

- `javascript`
- `php`
- `ruby`
- `java`
- `dart`
- `all`（全言語）

タイトル画面でコード言語を選択：

- 選択されたコード言語に応じて、出題候補問題がフィルタリングされる。

### 6.3 スコアリング仕様

- Issue 種別ごとの基本点：

| type          | 説明                     | 基本点 |
| ------------- | ------------------------ | ------ |
| `security`    | XSS, SQLi 等             | +5     |
| `bug`         | ロジックバグ、例外リスク | +4     |
| `performance` | N+1, 無駄なループ 等     | +3     |
| `design`      | 可読性、命名、責務分割   | +2     |

- コンボ補正（連続正解数に応じて）：

| 連続正解数 | 倍率 |
| ---------- | ---- |
| 1          | ×1.0 |
| 2          | ×1.2 |
| 3          | ×1.5 |
| 4以上      | ×2.0 |

- ハズレ（その行に issue が存在しない場合）：
  - `-1` 点
  - コンボリセット

- 全 issue 指摘時のボーナス：
  - +3 点

---

## 7. 問題データ設計（JSON）

### 7.1 JSON フォーマット

```json
{
  "id": "js-001",
  "codeLanguage": "javascript",
  "level": 1,
  "code": [
    "function addUser(name, age) {",
    "  if (!name || age) return null;",
    "  saveUser(name, age);",
    "}"
  ],
  "issues": [
    {
      "id": "js-001-1",
      "lines": [2],
      "type": "bug",
      "severity": "critical",
      "score": 4,
      "description": {
        "ja": "age のチェック条件が誤っている",
        "en": "The age check condition is incorrect."
      }
    },
    {
      "id": "js-001-2",
      "lines": [3],
      "type": "performance",
      "severity": "normal",
      "score": 3,
      "description": {
        "ja": "saveUser の戻り値やエラーを無視している",
        "en": "The return value and errors from saveUser are ignored."
      }
    }
  ]
}
```

#### フィールド説明

- `id`：問題一意 ID
- `codeLanguage`：`"javascript" | "php" | "ruby" | "java" | "dart"`
- `level`：難易度（1, 2, 3）
- `code`：ソースコード（1 行ごとの文字列配列）
- `issues`：
  - `id`：issue 一意 ID
  - `lines`：この issue が含まれる行番号（1-origin）
  - `type`：`bug | security | performance | design`
  - `severity`：`minor | normal | critical`
  - `score`：基本点
  - `description`：UI 言語に応じた説明文

### 7.2 ファイル配置

```text
src/
  problems/
    javascript/
      level1/
        js-001.json
      level2/
      level3/
    php/
    ruby/
    java/
    dart/
```

### 7.3 問題取得ユーティリティ

`src/problems/index.ts` を作成し、問題取得のユーティリティを提供：

```ts
export type CodeLanguage = 'javascript' | 'php' | 'ruby' | 'java' | 'dart';
export type CodeLanguageOrAll = CodeLanguage | 'all';

export type Issue = {
  id: string;
  lines: number[];
  type: 'bug' | 'security' | 'performance' | 'design';
  severity: 'minor' | 'normal' | 'critical';
  score: number;
  description: Record<'ja' | 'en', string>;
};

export type Problem = {
  id: string;
  codeLanguage: CodeLanguage;
  level: number;
  code: string[];
  issues: Issue[];
};

export function getProblems(lang: CodeLanguageOrAll, level: number): Problem[] {
  // ビルド時に import した JSON の配列からフィルターして返却する想定
  return [];
}
```

---

## 8. ゲームロジック（フロント側）

### 8.1 GameState 定義

```ts
type GameState = {
  currentProblem: Problem | null;
  currentLevel: number; // 1 → 2 → 3
  score: number;
  combo: number;
  remainingSeconds: number; // 60 → 0
  solvedIssueIds: string[]; // 当てた issue
  tappedLines: Record<string, number[]>; // problem.id ごとのタップ済み行
};
```

### 8.2 出題ロジック

- 初期状態：
  - `currentLevel = 1`

- 問題選択：

```ts
function selectNextProblem(
  config: { codeLanguage: CodeLanguageOrAll; maxLevel: number },
  state: GameState
): Problem {
  const candidates = getProblems(config.codeLanguage, state.currentLevel);
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

function advanceLevel(config: { maxLevel: number }, state: GameState): number {
  return Math.min(state.currentLevel + 1, config.maxLevel);
}
```

- 1問目：`currentLevel = 1`
- 2問目：`currentLevel = 2`
- 3問目以降：`currentLevel = 3` のまま固定

### 8.3 行タップ処理

擬似ロジック：

```ts
function onLineTap(lineNumber: number) {
  // 既にタップ済みかチェック
  if (state.tappedLines[state.currentProblem.id]?.includes(lineNumber)) return;

  const issues = state.currentProblem.issues;
  const hitIssue = issues.find(
    (issue) => issue.lines.includes(lineNumber) && !state.solvedIssueIds.includes(issue.id)
  );

  if (hitIssue) {
    const nextCombo = state.combo + 1;
    const multiplier = nextCombo >= 4 ? 2.0 : nextCombo === 3 ? 1.5 : nextCombo === 2 ? 1.2 : 1.0;

    const gain = Math.floor(hitIssue.score * multiplier);

    // スコア・コンボ・solvedIssueIds 更新
  } else {
    // -1点 & コンボリセット
  }

  // tappedLines 更新
}
```

---

## 9. スコア・ランキング（D1 + useFetcher）

### 9.1 D1 スキーマ

```sql
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  issues_found INTEGER NOT NULL,
  total_issues INTEGER NOT NULL,
  accuracy REAL NOT NULL,
  ui_language TEXT NOT NULL,
  code_language TEXT NOT NULL,
  player_name TEXT,
  created_at TEXT NOT NULL,
  llm_feedback JSON
);
```

### 9.2 スコア送信フロー（useFetcher）

- `/play` コンポーネント側：

```tsx
const fetcher = useFetcher();

function handleGameEnd(result: GameResult) {
  fetcher.submit({ payload: JSON.stringify(result) }, { method: 'post', action: '/result/create' });
}
```

- `routes/result.create.tsx` 側 `action`：
  - `payload` をパース
  - D1 に INSERT
  - LLM フィードバックを生成し、`llm_feedback` に保存（同期 or 非同期）
  - 新しい `id` を生成し `redirect('/result/' + id)` を返却

### 9.3 結果画面 `/result/:id`

- `loader`：
  - D1 から該当 `scores` レコードを取得
  - KV にあればプレイログ JSON を読み込む

- 表示内容：
  - スコア
  - 見つけた issue 数 / 全 issue 数
  - 正答率
  - コード言語
  - LLM フィードバック（`llm_feedback` JSON）
  - 名前入力フォーム（任意）

- 名前更新：
  - 結果画面上のフォームで `useFetcher.submit` → `action` 内で `player_name` を UPDATE

### 9.4 ランキング `/ranking`

- `loader`：
  - D1 から TOP N のスコアを取得
  - 必要に応じて KV からキャッシュを読む

- 表示：
  - 日付、スコア、名前、コード言語などを Tailwind のテーブルで表示

---

## 10. KV / R2 / LLM の役割（概要）

- **KV**
  - 結果 JSON（プレイログサマリ）を `result:<id>` 形式でキャッシュ
  - ランキングサマリのキャッシュ（`ranking:all` など）

- **R2**
  - 結果ページ用 OGP 画像を `ogp/result-<id>.png` として保存
  - メタタグ `og:image` で参照

- **LLM**
  - プレイログ（カテゴリ別発見率、見逃し issue、コード言語、UI 言語）を元にフィードバック文章を生成
  - JSON 形式（`summary`, `strengths`, `weak_points`, `advice`）で返却し、D1 の `llm_feedback` カラムに保存
