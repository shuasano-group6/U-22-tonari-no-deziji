# プレイ単位・前回比較・ベスト表示 完全版

## 置き換えるファイル

backend/
- database.py
- models.py
- main.py

プロジェクト直下:
- call.html

js/
- api.js
- call.js

## 重要：DBを作り直す

SQLAlchemyのcreate_allは既存テーブルへ新しい列を追加しません。
そのため、今回だけ既存DBを削除してください。

1. FastAPIをCtrl + Cで停止
2. プロジェクト直下で実行

Remove-Item backend\deziji.db

3. ブラウザのConsoleで実行

localStorage.removeItem("deziji_user_id")
localStorage.removeItem("deziji_phone_play_session_id")

4. FastAPI再起動

cd backend
python -m uvicorn main:app --reload

5. Live Serverでindex.htmlを開く

## 結果表示

電話シナリオ完了時に以下を比較表示します。

- 今回
- 前回
- ベスト
- 正解数
- 間違い数
- 正解率
- スコア

スコア:
正解 +100点
不正解 -50点
最低0点
