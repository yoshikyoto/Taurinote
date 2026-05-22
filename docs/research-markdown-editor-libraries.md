# Markdown エディタライブラリの検討

Taurinote で Markdown ファイルをビジュアル編集するための比較メモです。

## 対象

現在の Taurinote は `.md` / `.markdown` ファイルを Tauri 経由で読み書きし、
エディタの保存形式も Markdown 文字列です。

今回の検討では、以下を重視しました。

- Markdown ファイルを永続形式として保てる
- React と Vite の構成へ組み込みやすい
- 見出し、リスト、リンク、コードブロックなどをビジュアルに編集できる
- 将来必要になったときにツールバーや Markdown 構文を拡張できる

## 実装方式

### Markdown ソース編集とプレビュー

`textarea` や CodeMirror で Markdown ソースを編集し、別ペインで表示結果を
確認する方式です。

特徴:

- Markdown 文字列を正本にしやすい
- ファイルの表記差分を比較的抑えやすい
- Markdown を直接書けるユーザーには扱いやすい
- ビジュアルで直接編集する体験にはならない

### WYSIWYG エディタと Markdown 入出力

エディタ内部ではリッチテキスト用の document model を編集し、読み込み時に
Markdown から変換し、保存時に Markdown へ戻す方式です。

特徴:

- ノート本文を見た目に近い状態で編集できる
- ツールバー、ブロック操作、リンク編集などを載せやすい
- 未対応構文や変換時の Markdown 正規化に注意が必要

### ハイブリッド

通常はビジュアル編集を使い、必要に応じて Markdown ソース編集へ切り替える
方式です。

Taurinote では Markdown ファイル自体を扱うため、ビジュアル編集を採用しても
将来的にソース編集へ戻れる余地は残しておきたいです。

## 比較候補

| 候補 | 位置づけ | 良い点 | 注意点 |
| --- | --- | --- | --- |
| Milkdown | Markdown-first な WYSIWYG エディタフレームワーク | Markdown 編集が主目的。ProseMirror、Remark ベース。プラグインで拡張しやすい | headless 寄りの API もあり、構成を選ぶ必要がある |
| MDXEditor | React 向け Markdown WYSIWYG コンポーネント | Markdown 文字列を入出力しやすい。React/Vite へ組み込みやすい。source mode もある | 機能を plugin で有効化する。扱う Markdown によって変換確認が必要 |
| Tiptap | リッチテキストエディタ基盤 | 拡張性と周辺機能が強い | Markdown 拡張は 2026-05-22 時点の公式ドキュメントで beta 扱い |
| CodeMirror | テキストエディタ基盤 | Markdown ソース編集に強い | 単体では WYSIWYG ではない |
| Lexical / ProseMirror 直実装 | エディタ基盤を直接使う方式 | 独自体験を細かく作れる | Markdown 変換、UI、貼り付け、選択、履歴などの実装負担が大きい |

## 候補ごとの見方

### Milkdown

Milkdown は Markdown エディタとして作られており、ビジュアル編集と Markdown
永続化の方向が Taurinote に合っています。

今回の実装では、Milkdown の `Crepe` を利用しました。`Crepe` は Milkdown の
機能をまとめた導入しやすいエディタで、初期状態でもブロック操作やツールバーなどを
試しやすいです。

Taurinote では以下の接続にしました。

- ファイル読み込み後に Markdown 文字列を `defaultValue` として渡す
- `markdownUpdated` で編集後の Markdown 文字列を受け取る
- blur と `Cmd+S` / `Ctrl+S` で Markdown をファイルへ保存する

注意点として、`Crepe` の既定機能は広めです。今回の導入時点では CodeMirror
由来のコードブロック機能や数式関連も bundle に含まれるため、build で chunk size
warning が出ています。必要な機能が固まったら、使う feature を絞る余地があります。

名前がいいいい。

### MDXEditor

MDXEditor は React コンポーネントとして導入しやすく、Markdown 文字列の入出力を
中心に設計されています。

Taurinote の既存実装が Markdown 文字列を state として保存していたため、
差し替えコストだけを見ると有力でした。source / diff mode が用意されている点も、
Markdown を直接確認したい用途に向いています。

### Tiptap

Tiptap はリッチテキストエディタ基盤として強力で、将来 Markdown に限らない
文書編集機能を増やす場合は魅力があります。

一方、今回の中心要件は Markdown ファイルを直接保存することです。Tiptap の
Markdown 入出力は公式ドキュメントで beta と説明されていたため、最初の採用候補
としては優先度を下げました。

### CodeMirror

CodeMirror はソース編集を強化する場合に向いています。Markdown 構文を見ながら
編集する体験を重視するなら、プレビューと組み合わせる構成が自然です。

今回は「ビジュアルで編集したい」という要件があるため、単独採用は見送りました。

## 今回の判断

今回は Milkdown を採用しました。

理由:

- Markdown を中心にしたエディタである
- ビジュアル編集と Markdown 保存の方向が Taurinote に合う
- `Crepe` で早い段階から編集体験を確認できる
- 将来必要に応じて Milkdown の plugin 構成を調整できる

MDXEditor もかなり自然な候補でしたが、Milkdown の Markdown-first な位置づけと
編集体験を優先しました。

## 実装上の注意

### Markdown の往復変換

WYSIWYG エディタでは、Markdown を読み込んで保存すると同じ意味の Markdown が
別の表記へ正規化されることがあります。

確認したい例:

- 空行やリストの整形
- GFM テーブル
- チェックリスト
- コードブロックと言語指定
- インライン HTML
- 画像リンク
- 未対応の独自記法

実際に扱う Markdown サンプルを fixtures として残し、読み込みと保存の差分が
許容できるか確認したいです。

### ファイル切り替え

エディタ内部に document state があるため、別ファイルを開くときは古い内容を
持ち越さないようにエディタを作り直す必要があります。

現在の実装では読み込み完了後だけ Milkdown を描画し、ファイルパスを React の
`key` に使って切り替えています。

### bundle サイズ

現時点では導入速度を優先して `Crepe` の既定機能を使っています。

機能が固まったら以下を検討します。

- 数式編集が必要か確認する
- コードブロック用の CodeMirror 機能が必要か確認する
- 画像、テーブル、ブロック編集 UI の優先度を決める
- 必要な feature だけを組み合わせる構成に寄せる

## 今後の候補

- Markdown ソース表示またはソース編集モードを用意する
- 保存状態や保存失敗を UI で表示する
- Markdown 往復変換の確認用サンプルを追加する
- Milkdown の feature を必要な範囲へ絞る

## 参考

- [Milkdown](https://milkdown.dev/)
- [Milkdown Crepe](https://milkdown.dev/docs/api/crepe)
- [MDXEditor Overview](https://mdxeditor.dev/editor/docs/overview)
- [MDXEditor Diff/source mode](https://mdxeditor.dev/editor/docs/diff-source)
- [Tiptap Markdown](https://tiptap.dev/docs/editor/markdown)
- [CodeMirror](https://codemirror.net/)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
