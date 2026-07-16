置き換え・追加ファイル

プロジェクト直下:
- call.html（上書き）
- results.html（新規）

js:
- api.js（上書き）
- call.js（上書き）
- results.js（新規）

css:
- results.css（新規）

修正内容:
1. DB初期化後に古いuser_idが残っていても、自動で新しいゲストユーザーを作成
2. 電話シナリオ完了画面には「結果を見る」ボタンを表示
3. results.htmlで今回・前回・ベストを比較表示

置き換え後:
- FastAPIを再起動
- ブラウザでCtrl + F5
