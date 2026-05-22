# Tauri + React + Typescript

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

## Dependencies

- Mantine -- ライブラリ
- Phosphor Icons
- Milkdown -- Markdown エディタ

## 実装の注意点

- className はなるべく使わすに UI ライブラリである Mantine を利用してください