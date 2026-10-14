【ほしいものガイド 最新版ファイル一式】 作成日: 2026年10月15日
このフォルダのファイルは、すべて最新です。

■ GitHubに置くファイル（リポジトリのいちばん上に置きます。同じ名前があれば上書き）
  index.html          サイト本体
  build.mjs           検索用のページを作るプログラム
  favicon.svg         アイコン
  favicon-192.png     アイコン
  favicon.ico         アイコン
  apple-touch-icon.png アイコン（スマホのホーム画面用）
  memo.txt            60日に一度、日付を書き換えるメモ

■ GitHubで新しく作るファイル（最初の1回だけ。作成済みなら不要）
  pages.yml           自動更新の指示書
  やり方: GitHubで「Add file → Create new file」を押し、
          ファイル名の欄に  .github/workflows/pages.yml  と入力、
          中身に pages.yml の文章を貼って保存します。

■ GitHubに置かないファイル
  shouhin-list.xlsx   スプレッドシートのひな形。Googleドライブに入れて、Googleスプレッドシートで開きます。

■ 大事な注意
  index.html の中に  const SHEET_CSV_URL = "";  という行があります。
  スプレッドシートのURLを入れたあとで index.html を上書きすると、URLが消えます。
  上書きしたら、もう一度URLを入れてください。
