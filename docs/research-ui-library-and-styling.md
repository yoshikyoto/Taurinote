# UI ライブラリとスタイリングの検討

Taurinote の UI 実装方針を検討したときの比較メモです。

## 現在の採用方針

- UI ライブラリ: Mantine
- アイコン: Phosphor Icons
- アプリ固有の見た目調整: CSS

現時点では `App.tsx` で Mantine の `AppShell`、`ScrollArea`、`Button`、`Text` を使い、
フォルダツリーのフォルダ、ファイル、追加操作のアイコンに Phosphor Icons を使っています。

## CSS の書き方

### 通常の CSS

通常の CSS は以下のように import して使います。

```tsx
import "./App.css";

<main className="app-shell" />
```

特徴:

- 導入が最も簡単
- 既存の CSS をそのまま使いやすい
- クラス名はグローバルになるため、画面やコンポーネントが増えると衝突に注意が必要

### CSS Modules

CSS Modules は `.module.css` を import して使います。

```tsx
import styles from "./Sidebar.module.css";

<aside className={styles.sidebar} />
```

特徴:

- クラス名のスコープをコンポーネント単位に閉じやすい
- CSS を CSS として保てる
- Vite では追加パッケージなしで導入できる
- コンポーネントが増えたときに通常 CSS より整理しやすい

Taurinote で CSS をコンポーネント単位に分ける場合は、CSS Modules が扱いやすい候補です。

例:

```text
src/
  App.tsx
  App.module.css
  global.css
  components/
    Sidebar.tsx
    Sidebar.module.css
    DirectoryTree.tsx
    DirectoryTree.module.css
```

`body`、`:root`、リセット系は `global.css` に残し、個別 UI の CSS は
`*.module.css` に分ける構成が自然です。

### styled-components

styled-components は CSS をスタイル付き React コンポーネントとして定義します。

```tsx
import styled from "styled-components";

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
`;

<Sidebar />
```

特徴:

- JSX とスタイルを近くに置ける
- props に応じた動的スタイルを書きやすい
- CSS-in-JS の依存と書き方が増える
- 小さなアプリの初期段階では CSS Modules より重く感じることがある

### `sx` との違い

以下のような `sx` prop は React 標準ではありません。

```tsx
sx={{
  backgroundColor: "#ffeb3b",
  color: "inherit",
  borderRadius: "2px",
  px: "1px",
}}
```

`sx` は MUI などの UI ライブラリが提供する書き方です。
React 標準で近いものは `style` prop です。

```tsx
style={{
  backgroundColor: "#ffeb3b",
  color: "inherit",
  borderRadius: "2px",
  paddingLeft: "1px",
  paddingRight: "1px",
}}
```

## UI ライブラリの比較

### Mantine

特徴:

- React 向け UI コンポーネントが一通りそろっている
- `AppShell` でサイドバーとメイン領域を組みやすい
- `Button`、`ScrollArea`、`Text` などをそのまま今の UI に使いやすい
- CSS Modules や通常 CSS と併用しやすい

今回の UI では Mantine を採用しました。

Mantine のスタイル指定は以下のような選択肢があります。

- Mantine コンポーネントの props
- style props
- `styles` / `classNames`
- アプリ側の CSS

### Radix UI

特徴:

- Dialog、Menu、Tooltip などの振る舞いに強い
- 見た目は自分で作る前提に近い
- 独自デザインを強く保ちたい場合に向く

### shadcn/ui

特徴:

- コンポーネントコードを手元に持つ運用
- Tailwind を使う構成と相性がよい
- デザインを細かく変更しやすい

### MUI

特徴:

- 既製コンポーネントが豊富
- Material Design の見た目と API が強い
- `sx` など MUI 固有のスタイル指定がある
- Material Icons と統一感を出しやすい

Taurinote を Material Design 寄りにするなら有力ですが、
静かなエディタ寄りの UI を作る場合は Mantine や独自 CSS の方が調整しやすいと判断しました。

## アイコンの比較

UI ライブラリとアイコンセットは分けて選べます。
Mantine と Material Icons、Mantine と Phosphor Icons、通常 React と Lucide のような組み合わせも可能です。

### 比較候補

| アイコンセット | 特徴 |
| --- | --- |
| Phosphor Icons | アイコン数と weight の種類が豊富。regular、fill、duotone などを使い分けやすい |
| Tabler Icons | 単一セットとして種類が多く、アプリ UI で不足しにくい |
| Lucide | 静かで軽い線のトーン。ノートやエディタ UI に合わせやすい |
| Material Icons | Material Design 寄り。MUI と組み合わせると統一しやすい |
| Feather Icons | ミニマルだが種類は控えめ |
| Radix Icons | 密な UI 向けの小さなアイコンが中心 |
| react-icons | 複数のアイコンセットをまとめて利用できる |
| Font Awesome | Web UI やブランドアイコンも含めて広い |

### 採用候補の比較

今回最後まで比較した候補は Phosphor Icons、Tabler Icons、Lucide、
`@mui/icons-material` です。

| 候補 | 規模感 | デザインの印象 | バリエーション | Taurinote での見方 |
| --- | --- | --- | --- | --- |
| Phosphor Icons | 大きい。アイコン単体の種類に加えて weight 違いが豊富 | 角が強すぎず、少しやわらかい | thin、light、regular、bold、fill、duotone | フォルダの状態や強調度を weight で調整しやすい |
| Tabler Icons | 非常に大きい。公式サイトでは 2026-05-22 時点で 6146 icons と表示 | 24px grid と 2px stroke を軸にしたシャープな outline | outline と filled | アイコン不足を起こしにくく、ツールバーや設定画面まで広げやすい |
| Lucide | 大きい。公式サイトでは 2026-05-22 時点で 1711 icons と表示 | 静かで軽い線。エディタ UI と相性がよい | stroke width や size の調整が中心 | ノートやファイルツリーを控えめな見た目にしやすい |
| `@mui/icons-material` | 大きい。MUI 公式では 2100+ official Material Icons と表示 | Material Design の存在感がある | Filled、Outlined、Rounded、Two tone、Sharp | UI 全体も MUI に寄せる場合に統一感が出しやすい |

#### 豊富さの見方

件数だけを見るなら Tabler Icons は単一セットとしてかなり大きく、
Lucide と Material Icons も通常のアプリ UI では十分な規模です。
Phosphor Icons は件数だけでなく、同じアイコンを weight で複数の表情に
変えられる点が強みです。

Taurinote の初期 UI で必要な `folder`、`file`、`plus`、開閉矢印、
検索、設定、保存のような基本アイコンは、上の 4 候補ならいずれも探しやすいです。
選定時は「必要なアイコンがあるか」だけでなく、フォルダツリーに並べたときの
線の密度、角の強さ、塗りアイコンを混ぜたときの違和感を確認します。

### 公式の確認ページ

デザインを見て選ぶ場合は、各公式ページで同じ検索語を試して比較します。

| 候補 | 確認ページ | 確認しやすいこと |
| --- | --- | --- |
| Phosphor Icons | [Phosphor Icons](https://phosphoricons.com/) | icon search と weight ごとの見え方 |
| Tabler Icons | [Tabler Icons](https://tabler.io/icons) | outline / filled、size、stroke、色 |
| Lucide | [Lucide Icons](https://lucide.dev/icons) | category、stroke width、size、色 |
| `@mui/icons-material` | [Material Icons - MUI](https://mui.com/material-ui/material-icons/) | style filter と Material Icon の検索 |

### デザイン確認時の検索語

Taurinote で比較するときは、まず以下を見比べると判断しやすいです。

- `folder`
- `folder open`
- `file`
- `file text`
- `chevron right`
- `chevron down`
- `plus`
- `search`
- `settings`
- `save`

フォルダツリーでは特にフォルダ、開いたフォルダ、ファイル、追加操作のアイコンが
画面のトーンを決めます。

### Taurinote での判断

比較した中では Phosphor Icons を採用しました。

- ファイルツリーで通常フォルダ、開いたフォルダ、ファイル、追加操作をそろえやすい
- weight の差を使って将来の selected、disabled、emphasis 表現を調整しやすい
- Mantine と組み合わせても Material Design の見た目に引っ張られにくい
- outline だけでなく fill や duotone も試せるため、後からトーンを変えやすい

## 今回の判断

今回の採用理由は以下です。

- サイドバーとワークスペースを Mantine のレイアウト部品で組みやすい
- ボタン、スクロール領域、文字表示などの基本部品をすぐ使える
- Phosphor Icons はフォルダ、ファイル、追加操作の表現がそろっている
- Phosphor Icons は weight の差で将来の状態表現も調整しやすい

## 今後の整理候補

- `App.tsx` から `Sidebar` と `DirectoryTree` を分ける
- `App.css` を global CSS とコンポーネント固有 CSS に分ける
- コンポーネント固有 CSS は CSS Modules に寄せる
- Mantine の theme に色やフォントの方針をまとめる
