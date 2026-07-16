設置方法

1. この5ファイルをプロジェクトの js フォルダへコピーする。
2. index.html / home.html / question.html / call.html の末尾で、
   必ず api.js を各画面固有JSより先に読み込む。

例:
<script src="js/api.js"></script>
<script src="js/script.js"></script>

home.html:
<script src="js/api.js"></script>
<script src="js/home.js"></script>

question.html:
<script src="js/api.js"></script>
<script src="js/question.js"></script>

call.html:
<script src="js/api.js"></script>
<script src="js/call.js"></script>

3. FastAPIを起動する。
cd backend
python -m uvicorn main:app --reload

4. HTMLはLive Serverから開く。
