function incorrect(type){
    document.getElementById('callScreen').classList.add('hidden');
    document.getElementById('incorrectArea').classList.remove('hidden');
    document.getElementById('incorrectName').textContent = type;
}

function correct(){
    document.getElementById('callScreen').classList.add('hidden');
    document.getElementById('correctArea').classList.remove('hidden');
}

function grandchildCall(){
    document.getElementById('correctArea').classList.add('hidden');
    document.getElementById('grandchildCall').classList.remove('hidden');
}

function callFinish(){
    document.getElementById('grandchildCall').classList.add('hidden');
    document.getElementById('callFinish').classList.remove('hidden');
}