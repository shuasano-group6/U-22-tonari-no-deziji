function incorrect(type){
    document.getElementById('payScreen').classList.add('hidden');
    document.getElementById('incorrectArea').classList.remove('hidden');
    document.getElementById('incorrectName').textContent = type;
}

function correct(){
    document.getElementById('payScreen').classList.add('hidden');
    document.getElementById('correctArea').classList.remove('hidden');
}

function scanPay(){
    document.getElementById('correctArea').classList.add('hidden');
    document.getElementById('scanPay').classList.remove('hidden');
}

function payFinish(){
    document.getElementById('scanPay').classList.add('hidden');
    document.getElementById('payFinish').classList.remove('hidden');
}