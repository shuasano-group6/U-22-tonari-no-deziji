function startScenario(){
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('scenarioScreen').classList.remove('hidden');
}

function goHome(){
    document.getElementById('scenarioScreen').classList.add('hidden');
    document.getElementById('playScreen').classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
}

function loadScenario(type){
    document.getElementById('scenarioScreen').classList.add('hidden');
    document.getElementById('playScreen').classList.remove('hidden');

    document.getElementById('scenarioTitle').innerText = type;

    if(type === '電話'){
        document.getElementById('scenarioText').innerText =
            '孫に電話をかけてみましょう';
    }
    else if(type === 'LINE'){
        document.getElementById('scenarioText').innerText =
            'LINEでメッセージを送ってみましょう';
    }
    else{
        document.getElementById('scenarioText').innerText =
            '怪しいSMSを見抜きましょう';
    }
}

function success(){
    alert('よくできました！ 経験値 +10');
    goHome();
}