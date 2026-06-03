# Taurinote - Markdown Task Editor

Taurinote は TODO 管理のことを考えてつくられた Markdown エディタです

Taurinote is a Markdown editor designed primarily for TODO management.

Powered by Tauri + React + Typescript.

## ビルド・インストール

```bash
pnpm tauri build
```

インストーラーが開くのでアプリケーションに追加します。

## install reust

参考: https://qiita.com/maoutokagura/items/c2fd85132bcec399c3a1xz

```bash
brew install rustup-init
rustup-init

# シェルを再起動するか、
source "$HOME/.cargo/env"
```

## pnpm

pnpm をインストールしてください

```bash
pnpm install

# For Desktop development, run:
  pnpm tauri dev

# For Android development, run:
  pnpm tauri android dev

# For iOS development, run:
  pnpm tauri ios dev
```

```

## Dependencies

- Mantine -- ライブラリ
- Phosphor Icons
  - https://phosphoricons.com/ アイコンの検索もここから
- Milkdown -- Markdown エディタ

### Milkdown へのパッチ

Milkdown のブロックハンドルは、マウス移動に対する対象ブロックの更新を
`@milkdown/plugin-block` 内で 200ms ごとに間引いています。
この待ち時間がハンドルの追従遅れとして感じられるため、Taurinote では
`patches/@milkdown__plugin-block@7.21.1.patch` で間引き時間を 0ms に変更しています。

パッチは `pnpm-workspace.yaml` の `patchedDependencies` で登録しています。
`pnpm install` 時に pnpm が依存パッケージへ適用するため、`node_modules` を直接編集しないでください。

Milkdown を更新する場合は、`@milkdown/plugin-block` の対象バージョンが変わる可能性があります。
ブロックハンドルの追従挙動を確認し、必要であればパッチ対象のバージョンと
`pnpm-lock.yaml` の patch hash を更新してください。

## 実装の注意点

- className はなるべく使わすに UI ライブラリである Mantine を利用してください
