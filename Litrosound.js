/**
 * Litro Sound Library
 * Since 2013-11-19 07:43:37
 * @author しふたろう
 * ver 0.09.00
 */
var LITROSOUND_VERSION = '0.09.00';

// var SAMPLE_RATE = 24000;
// var SAMPLE_RATE = 48000;
var SAMPLE_RATE = 44100;//readonly意味ないy
// var SAMPLE_RATE = 144000;
// var PROCESS_BUFFER_SIZE = 8192;
// var PROCESS_BUFFER_SIZE = 4096;
// var PROCESS_BUFFER_SIZE = 2048; //chrome
var PROCESS_BUFFER_SIZE = 1024; //firefox
// var CHANNEL_BUFFER_SIZE = 48000;
var BUFFER_FRAMES = 60;
// var BUFFERS = 2;
var FRAME_RATE = 60;
var MILLI_SECOND = 1000;
var MIN_CLOCK = MILLI_SECOND / FRAME_RATE;
var WAVE_VOLUME_RESOLUTION = 15;
var CHANNELS_NUM = 8;
var litroAudio = null;
// var VOLUME_TEST = 0.4;
var VOLUME_TEST = 0.4;
var VOLUME_CELLSIZE = 0.01 / Math.pow(WAVE_VOLUME_RESOLUTION, 2);
var VOLUME_MASTER = VOLUME_CELLSIZE * 40;
var litroSoundInstance = null;

var OCTAVE_MAX = 7;

var DEFAULT_NOTE_LENGTH = 800; //ms
var KEY_FREQUENCY = [
	[32.703,34.648,36.708,38.891,41.203,43.654,46.249,48.999,51.913,55.000,58.270,61.735],
	[65.406,69.296,73.416,77.782,82.407,87.307,92.499,97.999,103.826,110.000,116.541,123.471],
	[130.813,138.591,146.832,155.563,164.814,174.614,184.997,195.998,207.652,220.000,233.082,246.942],
	[261.626,277.183,293.665,311.127,329.628,349.228,369.994,391.995,415.305,440.000,466.164,493.883],
	[523.251,554.365,587.330,622.254,659.255,698.456,739.989,783.991,830.609,880.000,932.328,987.767],
	[1046.502,1108.731,1174.659,1244.508,1318.510,1396.913,1479.978,1567.982,1661.219,1760.000,1864.655,1975.533],
	[2093.005,2217.461,2349.318,2489.016,2637.020,2793.826,2959.955,3135.963,3322.438,3520.000,3729.310,3951.066],
	[4186.009,4434.922,4698.636,4978.032,5274.041,5587.652,5919.911,6271.927,6644.875,7040.000,7458.620,7902.133],
];
var KEYCODE_MAX = KEY_FREQUENCY.length * KEY_FREQUENCY[0].length;

function freqByKey (key){
	return KEY_FREQUENCY[(key / KEY_FREQUENCY[0].length) | 0][key % KEY_FREQUENCY[0].length];
}
function freqByOctaveCodeNum(octave, codenum){
	return KEY_FREQUENCY[octave][codenum];
}
function keyByOctaveCodeNum (octave, codenum){
	return (KEY_FREQUENCY[octave].length * octave) + codenum;
}
	
var TOP_FREQ_LENGTH = 1;

var LitroKeyboardControllChar = [
['q', 81],['2', 50],['w', 87],['3', 51],['e', 69],['r', 82],['5', 53],['t', 84],['6', 54],['y', 89],['7', 55],['u', 85],['i', 56],['9', 73],['o', 57],['0', 79],['p', 80],
['z', 90],['s', 83],['x', 88],['d', 68],['c', 67],['v', 86],['g', 71],['b', 66],['h', 72],['n', 78],['j', 77],['m', 75],[',', 188],['l', 76],['.', 190],[';', 187],['/', 191],
];

var KEY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function LitroSound() {
	return;
}

var testval = 0;

LitroSound.version = LITROSOUND_VERSION;
LitroSound.prototype = {
	init : function(channelNum) {
		this.isFirefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) ? true : false;
		this.channel = [];
		this.channel.length = channelNum;
		this.channel_s = [];
		this.channel_s.length = channelNum;
		
		// this.players = {};
		this.players = [];
		this.frameRate = FRAME_RATE;
		// this.milliSecond = this.isFirefox ? 1100 : 1000;//firefox : chrome
		this.milliSecond = MILLI_SECOND;//firefox : chrome
		this.minClock = MIN_CLOCK; //ノート単位クロック
		this.sampleRate = 0;
		this.refreshRate = 0; //init
		this.refreshClock = 0;
		this.recoverCount = 0; //異常時立ち直りまでのカウント
		this.processHeavyLoad = false;
		this.performanceCycle = 280; //?
		this.performanceValue = 0;
		// console.log(this.refreshRate);
		this.radiateTime = 16; //[ms] 安定化待ち時間
		this.radiationTimer = 0;

		this.maxFreq = 0; //init
		this.maxWavlen = 0;
		this.minWavlen = 0;
		this.mode = 0;
		litroSoundInstance = this;
		this.masterVolume = VOLUME_MASTER; //VOLUME_TEST;
		this.WAVE_VOLUME_RESOLUTION = 15; //波形データのボリューム分解能
		this.outputBuffer = [];
		// console.log(this.isFirefox);
		this.scriptProcess = null;
		this.gain = null; //ゲイン
		this.analyser = null; //波形分析
		this.delay = null; //遅延
		this.source = null; //重要バッファ
		this.setChannelEventFunc = function(){return;};
		this.onNoteKeyEventFunc = function(){return;};
		this.offNoteKeyEventFunc = function(){return;};
		this.fadeoutEventFunc = function(){return;};
		
		TOP_FREQ_LENGTH = 0; //init
		
		var agent, src, i, data, buf;
		window.performance = window.performance == null ? window.Date : window.performance;
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		if(window.AudioContext == null){
			console.log("this browser can't AudioContext!! ");
			return;
		}
		// this.context = new AudioContext();
		// this.setSampleRate(sampleRate, PROCESS_BUFFER_SIZE);
		this.createContext();
		
		this.initWaveProperties();
		
		// this.audioChennelInit(channelNum);
		
		this.connectModules(PROCESS_BUFFER_SIZE);

		// 出力開始
		// src.noteOn(0);
	},
	
	//TODO channnelオブジェクトをplayerに持たせる！
	//チャンネル設定
	audioChennelInit: function(chnum){
		var rate = this.context.sampleRate,
			 ch, channel, channelSet,
			 MSch = [this.channel, this.channel_s]
			;
		for(ch = 0; ch < 2; ch++){
			channelSet = MSch[ch];
			for(i = 0; i < channelSet.length; i++){
				channel = new LitroWaveChannel();
				channel.init(((rate / KEY_FREQUENCY[0][0]) | 0) + 1, this.WAVE_VOLUME_RESOLUTION);
				channel.id = i;
				// channel.refChannel = i;
				channel.refreshEnvelopeParams(this.minClock);
				channelSet[i] = channel;
				this.setFrequency(i, 0);
			}
		}
	},

	appendPlayer: function(name, player)
	{
		var primary = this.players.some(function(p, i){
			//二重登録防止？
			if(p.name == name){
				primary = i;
				return true;
			}
			return false;
		}) ? primary : this.players.length
			, append = {name: name, player: player, primary: primary};
		this.players[primary] = append;
		return primary;
	},
	
	removePlayer: function(name)
	{
		var deleted;
		deleted = this.players.some(function(p, i){
			if(p.name == name){
				delete this.player[i];
				return true;
			}
			return false;
		}, this);

		return deleted;
	},
	
	//TODO 移行準備OK
	freqByOctaveCodeNum: function(octave, codenum){
		return KEY_FREQUENCY[octave][codenum];
	},
	
	//TODO 移行準備OK
	keyByOctaveCodeNum: function(octave, codenum){
		return (KEY_FREQUENCY[octave].length * octave) + codenum;
	},
	
	//TODO 移行準備OK
	freqByKey: function(key){
		return KEY_FREQUENCY[(key / KEY_FREQUENCY[0].length) | 0][key % KEY_FREQUENCY[0].length];
	},
	
	/**
	 * 視覚用波形出力
	 * @param {Object} size
	 */
	getAnalyseData: function(size)
	{
		var data = new Uint8Array(size);
		this.analyser.getByteTimeDomainData(data);
		return data;
	},
	
	createContext: function(){
		if(this.context == null){this.context = new AudioContext();}
		// context.sampleRate = rate; //read only
		
		this.sampleRate = this.context.sampleRate; //
	},
	
	connectModules: function(size)
	{
		var i, channel, scriptProcess, src, self = this, vol;
		context = this.context;
		//ゲイン
		if(this.gain != null){
			vol = this.gain.gain.value;
		}
		this.gain = null;
		this.gain = context.createGain();
		this.gain.gain.value = vol == null ? this.masterVolume : vol;
		this.gain.connect(context.destination);
		
		//プロセス
		this.scriptProcess = null;
		scriptProcess = context.createScriptProcessor(size, 0, 1);
		scriptProcess.onaudioprocess = function(ev){self.bufferProcess(ev);};
		scriptProcess.parent_audio = this;
		
		scriptProcess.connect(this.gain);
		this.scriptProcess = scriptProcess;

		//iOSで必須！！
		this.source = this.context.createBufferSource();
		this.source.connect(scriptProcess);
		this.source.start(0);
		// this.source.playbackRate = 8;
		
		//解析
		this.analyser = null;
		this.analyser = this.context.createAnalyser();
		this.analyser.fft = 512;
//		scriptProcess.connect(this.analyser);
//gain が解析元
		this.gain.connect(this.analyser);
		// console.log(scriptProcess);
		// this.delay = this.context.createDelay();
		// this.delay.delayTime.value = 1.0;
		// this.delay.connect(context.destination);
		// scriptProcess.connect(this.delay);
		
	},
	
	initWaveProperties: function()
	{
		if(this.context == null){return;}
		TOP_FREQ_LENGTH = (this.sampleRate / freqByKey((KEY_FREQUENCY.length * KEY_FREQUENCY[0].length) - 1)) | 0;
		this.refreshRate = this.sampleRate / MILLI_SECOND;
		this.maxFreq = (this.sampleRate / 2) | 0;
		this.maxWavlen = (this.sampleRate / minFreq()) | 0;
		this.minWavlen = (this.sampleRate / maxFreq()) | 0;
	},
	
	connectOn: function()
	{
		this.connectOff();
		this.connectModules(PROCESS_BUFFER_SIZE);
		// this.scriptProcess.connect(this.gain);
		// this.scriptProcess.connect(this.analyser);
		// this.gain.connect(this.context.destination);
	},
	connectOff: function()
	{
		this.scriptProcess.disconnect();
		this.scriptProcess.onaudioprocess = null;
		this.gain.disconnect();
	},

	bufferProcess: function(ev)
	{
		var i, ch
			, players = this.players, player, pl
			, data = ev.outputBuffer.getChannelData(0), channel, chdata, avol
			, dlen = data.length, clen = CHANNELS_NUM, plen = players.length
			, rate = this.refreshRate, rCrock = this.refreshClock
			, d0 = new Float32Array(ev.outputBuffer.length)
			;
			// console.log(channels.length);
		if(!this.checkPerformance(ev)){
			this.clearBuffer(ev);
			return;
		}
		data.set(d0);
		for(i = 0; i < dlen; i++){
			if(++rCrock >= rate){
				for(pl = 0; pl< plen; pl++){
					player = players[pl].player;
					player.playSound();
					for(ch = 0; ch < clen; ch++){
						player.refreshWave(ch);
					}
				}
				rCrock = 0;
			}
			for(ch = 0; ch < clen; ch++){
				chdata = 0;
				avol = 0;
				for(pl = 0; pl < plen; pl++){
					channel = players[pl].player.channel[ch];
					avol += channel.absorbVolume();
					if(chdata == 0){
						chdata += channel.nextWave();
					}else{
						channel.skipWave();
					}
				}
				// data[i] += chdata + avol;
				data[i] += chdata + avol;
				// data[i] = 0.311 * (i % 2);
				// if(i == 0){console.log(data[i]);}
			}
		}
		this.refreshClock = rCrock;
	},

	bufferProcess_o: function(ev)
	{
		var i, ch
			, channel_m = this.channel, channel_s = this.channel_s
			, players = this.players
			, data = ev.outputBuffer.getChannelData(0)
			, dlen = data.length, clen = CHANNELS_NUM, plen = players.length
			, rate = this.refreshRate, rCrock = this.refreshClock
			, d0 = new Float32Array(ev.outputBuffer.length)
			, sePlaying = false
			;
			// console.log(channels.length);
		if(!this.checkPerformance(ev)){
			this.clearBuffer(ev);
			return;
		}
		data.set(d0);
		for(i = 0; i < dlen; i++){
			if(++rCrock >= rate){
				for(ch = 0; ch < plen; ch++){
					players[ch].player.playSound();
				}
				for(ch = 0; ch < clen; ch++){
					this.refreshWave(ch);
				}
				rCrock = 0;
			}
			for(ch = 0; ch < clen; ch++){
				data[i] += (sePlaying ? channel_m[ch].nextWave(false) : channel_m[ch].nextWave(true))
								+ channel_s[ch].nextWave(true);
			}
		}
		this.refreshClock = rCrock;
	},
	
	checkPerformance: function(ev)
	{
		var pf = window.performance.now()
			, self = this;
		if(this.scriptProcess == null){return;}
		if(pf - this.performanceValue > this.performanceCycle){
			if(!this.processHeavyLoad){
				console.log('process has become overloaded!!');
				this.processHeavyLoad = true;
				this.connectOff();
				this.radiationTimer = setInterval(function(e, ev){self.checkPerformance(ev);}, this.radiateTime, ev);
				// console.log(pf - this.performanceValue, this.refreshRate * 4);
			}
			this.recoverCount = 0;
		}else{
			if(this.processHeavyLoad && this.recoverCount++ > this.frameRate){
				this.recoverCount = 0;
				console.log('process has recovered...');
				this.connectOn();
				clearInterval(this.radiationTimer);
				this.processHeavyLoad = false;
			}
		}
		this.performanceValue = pf;
		if(this.processHeavyLoad){return false;}
		
		return true;
	},
	
	clearBuffer: function(ev)
	{
		var i
			, data = ev.outputBuffer.getChannelData(0)
			, dlen = ev.outputBuffer.length, clen = this.channel.length
			;
		for(i = 0; i < dlen; i++){
			data[i] = 0;
		}
	},
};

/**
 * デバッグ用
 */
function litroVersion()
{
	var str = ''
		;
		// ls.init(1);
		// lp.init('v');

	str = "LitroSound:" + LitroSound.version + "\n"
	 + "LitroPlayer:" + LitroPlayer.version + "\n"
	 + "LitroAudioParams:" + LitroWaveChannel.paramsVersion;
	console.log(str);
}

var TITLE_MAXLENGTH = 32;
var litroPlayerInstance = null;
/**
 * データ管理オブジェクト
 */
function LitroPlayer(){return;};
LitroPlayer.version = '03.00';
//v01.03.00:tuneParamsID変更(paramsVer.0.1.0)
//v00.03.00:-値対応
//v00.01.00:タグ付き

LitroPlayer.prototype = {
	init: function(name, channelNum)
	{
		// litroPlayerInstance = this;
		this.channel = [];
		this.channel.length = channelNum == null ? CHANNELS_NUM : channelNum;
		
		// this.noteData = []; //note data
		this.playPack = new LitroPlayPack(); //複数のファイルを入れておく連続再生用？
		this.playPack.init(this);
		this.noteSeekTime= 0; //note をセットする位置
		this.playSoundFlag = false;
		this.litroSound = litroSoundInstance;
		this.litroSound.appendPlayer(name, this);
		this.systemTime = 0;
		// this.VOLUME_INC = 0.1;
		this.playOnce = false; //1曲モード
		this.name = name;
		
		
		this.setChannelEventFunc = function(){return;};
		this.onNoteKeyEventFunc =  function(){return;};
		this.offNoteKeyEventFunc =  function(){return;};
		
		this.eventsetData = []; //ControllChangeともいう
		this.delayEventset = [];
		this.fileUserName = 'guest_user_';
		this.playerAccount = 'guest_user_';
		this.sound_id = null;
		this.user_id = null;
		this.title = '';
		
		this.serverFileList = {};
		
		// this.timeOutEvent = {};
		this.timeOutCC = [];
		this.eventsetKeyIndex = {};

		// this.HEADER_LENGTH = 64;
		if(window.location.href.indexOf('.bitchunk.') >= 0){
			this.SERVER_URL = 'http://ltsnd.bitchunk.net/api';
		}else if(window.location.href.indexOf('localhost') >= 0){
			this.SERVER_URL = 'http://localhost:58104/api';	
		}else{
			this.SERVER_URL = 'http://bitchunk.fam.cx/litrosound/api';
		}
		initAPIServer(this.SERVER_URL);
		// this.COMMON_TUNE_CH = this.litroSound.channel.length;
		this.COMMON_TUNE_CH = 0;
		
		this.clearEventsData();
		
		var i;
		for(i = 0; i < LitroWaveChannel.sortParam.length; i++){
			this.eventsetKeyIndex[LitroWaveChannel.sortParam[i]] = i;
		}
		
		this.memoryHolder = new LitroWaveMemoryHolder();
		this.memoryHolder.initBasicWave();
		
		this.waveChennelInit(((this.litroSound.sampleRate /  KEY_FREQUENCY[0][0]) | 0) + 1);
		
		// console.log(this.waveHolder.waveMemories);
		
	},
	
	//チャンネル設定
	waveChennelInit: function(dataSize){
		var ch, channel
			;
		for(i = 0; i < this.channel.length; i++){
			channel = new LitroWaveChannel();
			channel.init(dataSize, WAVE_VOLUME_RESOLUTION);
			channel.id = i;
			// channel.refChannel = i;
			channel.refreshEnvelopeParams(MIN_CLOCK);
			channel.setFrequency(i, 0);
			channel.setMemory(this.memoryHolder.memory(0));
			this.channel[i] = channel;
		}
	},
	
	//channel getter
	enableChannels: function(){
		return this.channel.filter(function(ch){
			return ch.tune('enable') == 1;
		});
	},
	
	isFinishEnvelope: function(ch, refEnable)
	{
		var clock = this.channel[ch].envelopeClock, env = this.getEnvelopes(ch, refEnable)
		;
		if(clock >= env.attack + env.hold + env.decay + env.length + env.release){
			return true;
		}
		return false;
	},
	
	isNoises: function(refEnable)
	{
		var noises = []
			, i, len = this.channel.length, ch;
		for(i = 0; i < len; i++){
			// ch = refEnable ? this.channel[i].refChannel : i;
			ch = i;
			noises.push(this.channel[ch].isNoiseType());
		}
		return noises;
	},
	
	getNoteKey: function(ch)
	{
		return this.channel[ch].noteKey;
	},	
	
	getChannel: function(ch, key, refEnable)
	{
		// try{
		// if(this.channel[ch].refChannel >= 0){
			// ch = refEnable ? this.channel[ch].refChannel : ch;
		// }
		return this.channel[ch].tuneParams[key];
		// }catch(e){
			// console.log(ch);
		// }
	},
	
	getTuneParams: function(ch)
	{
		return this.channel[ch].tuneParams;
	},
	
	//TODO refEnable廃止
	getEnvelopes: function(ch)
	{
		// if(this.channel[ch].refChannel >= 0){
			// ch = refEnable ? this.channel[ch].refChannel : ch;
		// }
		var channel = this.channel[ch]
			// , ref = channel.referChannelFunc()
		return channel.envelopes;
	},
	
	getVibratos: function(ch, refEnable)
	{
		// if(this.channel[ch].refChannel >= 0){
			// ch = refEnable ? this.channel[ch].refChannel : ch;
		// }
		return this.channel[ch].vibratos(MIN_CLOCK);
	},
	
	getDelay: function(ch, refEnable)
	{
		// if(this.channel[ch].refChannel >= 0){
			// ch = refEnable ? this.channel[ch].refChannel : ch;
		// }
		return this.channel[ch].tuneParams.delay * MIN_CLOCK;
	},

	
	envelopeWaveType: function(ch)
	{
		var channel = this.channel[ch]
			// , refChannel = channel.referChannelFunc()
			// , refch = refEnable ? this.channel[ch].refChannel : ch
			// , refEnable = true
			, res;
		;
		switch(channel.getPhase()){
			case 'a': res = this.getChannel(ch, 'waveTypeAttack'); break;
			case 'h': res = this.getChannel(ch, 'waveTypeHold'); break;
			case 'd': res = this.getChannel(ch, 'waveTypeDecay'); break;
			default: res = -1;
		}
		return res < 0 ? this.getChannel(ch, 'waveType') : res;
	},
	
	//channel setter
	setOnNoteKeyEvent: function(func){
		this.onNoteKeyEventFunc = func;
	},
	
	setOffNoteKeyEvent: function(func){
		this.offNoteKeyEventFunc = func;
	},
	
	// setReferChannelFunc: function(func){
		// var ch;
		// for(ch = 0; ch < this.channel.length; ch++){
			// this.channel[ch].referChannelFunc = func;
		// }
	// },
	//未使用？
	setWaveType: function(channelNum, type)
	{
		this.setChannel(channelNum, 'waveType', type);
	},

	setFrequency: function(ch, freq)
	{
		var channel = this.channel[ch]
		;
		channel.setFrequency(freq);
	},
	
	setChannel: function(ch, key, value)
	{
		var channel = this.channel[ch];
		if(value > LitroWaveChannel.maxTune(key)){
			value = LitroWaveChannel.minTune(key);
		}else if(value < LitroWaveChannel.minTune(key)){
			value = LitroWaveChannel.maxTune(key);
		}
		channel.tune(key, value);
		channel.refreshEnvelopeParams(MIN_CLOCK);
		if(key == 'sweep'){
			if(channel.waveLength > 0){
				this.setFrequency(ch, Math.round(this.litroSound.sampleRate / channel.waveLength) | 0);
			}
			channel.sweepClock = 1;
		}else if(key == 'waveType'){
			channel.setMemory(this.memoryHolder.memory(value));
		}
		this.setChannelEventFunc(ch, key, value);
		return value;
	},
	
	setSetChannelEvent:function(func)
	{
		this.setChannelEventFunc = func;
	},

	toggleOutput: function(ch, toggle)
	{
		this.setChannel(ch, 'enable', toggle | 0);
		if(!toggle){
			this.channel[ch].trigFall();
			this.channel[ch].clearWave();
			this.channel[ch].absorbVolumeSource = 0;
			this.channel[ch].waveLength = 0;
		}
	},
	
	//TODO seを使う方向で廃止予定
	setPreSwapTune: function(toch, tuneParams)
	{
		var channel = this.channel[toch], key;
		this.channel[toch].preSwapTune = {};
		for(channel.tuneParams in key){
			channel.preSwapTune[key] = tuneParams[key] != null ? tuneParams[key] : channel.tuneParams[key];
		}
	},
	
	// execper1/60fps
	refreshWave: function (channelNum)
	{
		var i, sumFreq, phase
		, wavLen, vibLen, sweepLen, sumLen
		, channel = this.channel[channelNum]
		, data = channel.data
		, vib = this.getVibratos(channelNum, true)
		, vibDist = LitroWaveChannel.tuneParamsProp.vibratodepth.max - LitroWaveChannel.tuneParamsProp.vibratodepth.min
		, lenDist
		, vibriseClock = channel.vibratoClock - vib.vibratorise
		, sweep = this.getChannel(channelNum, 'sweep', true)
		, enable = channel.isEnable()
		, detuneDiv = 4
		, prop = LitroWaveChannel.tuneParamsProp
		, pls_l, pls_r
		;

		//立ち上がり
		if(channel.envelopeStart && channel.envelopeClock == 0 && !channel.envelopeEnd && enable){
			channel.trigRize();
		}
		//立ち下がり
		else if(this.isFinishEnvelope(channelNum, true) && !channel.envelopeEnd && enable){
			channel.trigFall();
			this.offNoteKeyEventFunc(channelNum.id, channel.noteKey);

		}
		
		sumFreq = channel.frequency;
		if(sumFreq < minFreq()){
			sumFreq = minFreq();
		}else if(sumFreq > maxFreq()){
			sumFreq = maxFreq();
		}
		channel.prevLength = channel.waveLength;

		wavLen = this.litroSound.sampleRate / channel.frequency;
		sweepLen = sweep == 0 ? 0 
							: sweep > 0 ? -maxWavlen() * channel.sweepClock / Math.exp(sweep * prop.sweep.max * 0.001)
							: maxWavlen() * channel.sweepClock / Math.exp(sweep * prop.sweep.min * 0.001);
		// lenDist = wavLen;
		phase = vib.vibratophase * 180 / vibDist;
		vibLen = vibriseClock < 0 || vib.vibratospeed == 0 ? 0 : (wavLen * (vib.vibratodepth) / vibDist)
		 			* Math.sin((vibriseClock + phase) * (Math.PI / 180) * 180 / vib.vibratospeed);
		// sumLen = sweepLen + vibLen;
		channel.waveLength = (wavLen + sweepLen + vibLen) | 0;
		channel.waveLength = channel.waveLength > maxWavlen() ? maxWavlen() : channel.waveLength;
		channel.waveLength = channel.waveLength < minWavlen() ? minWavlen() : channel.waveLength;

		// channel.applyWaveMemory(this.waveHolder.memory(this.envelopeWaveType(channelNum, true)));
		channel.applyWaveMemory();

		if(!channel.envelopeEnd && channel.envelopeStart){
			channel.envelopeClock++;
			channel.detuneClock++;
			channel.sweepClock++;
			channel.vibratoClock++;
		}
	},
	
	
	onNoteKey: function(ch, key)
	{
		// console.log(codenum + ' ' + octave);
		var channel = this.channel[ch], freq = freqByKey(key);

		// channel.refChannel = ch;
		channel.noteKey = key;
		channel.envelopeClock = 0;
		channel.detuneClock = 0;
		channel.sweepClock = 0;
		channel.vibratoClock = 0;
		channel.dataUpdateFlag = true;
		channel.resetEnvelope();
		this.onNoteKeyEventFunc(ch, key);
		// this.setFrequency(ch, freq);
	},	
	
	onNoteFromCode: function(ch, codenum, octave)
	{
		// console.log(codenum + ' ' + octave);
		var channel = this.channel[ch], freq = freqByOctaveCodeNum(octave, codenum);
		// this.channel[ch].clearWave();
		// channel.refChannel = refChannel;
		channel.noteKey = keyByOctaveCodeNum(octave, codenum);
		channel.envelopeClock = 0;
		channel.detuneClock = 0;
		channel.sweepClock = 0;
		channel.vibratoClock = 0;
		channel.dataUpdateFlag = true;
		channel.resetEnvelope();
		this.refreshWave(ch);
		
		// console.log("onN", channel.absorbPosition, channel.waveClockPosition);
		
		// this.setFrequency(ch, freq);
	},
	
	offNoteFromCode: function(channel)
	{
		// var freq = this.freqByOctaveCode(octave, code);
		
		if(channel == null){
			var i;
			for(i = 0; i < this.channel.length; i++){
				this.setFrequency(i, 0);
			}
			return;
		}
		this.channel[channel].resetEnvelope();
		this.setFrequency(channel, 0);

	},
	
	extendNote: function(channelNum)
	{
		var channel = this.channel[channelNum]
			, envelopes = channel.envelopes
		;
		channel.envelopeClock = (envelopes.attack + envelopes.hold + envelopes.decay) | 0;
		channel.envelopeClock += 0.1; //立ち上がり調整防止
	},
	
	fadeOutNote: function(channelNum)
	{
		if(channelNum == null){
			return;
		}
		// this.channel[channel].resetEnvelope();
		this.skiptoReleaseClock(channelNum, true);
		// this.channel[channelNum].refChannel = refChannel == null ? channelNum : refChannel;

		// console.log(this.channel[channelNum].refChannel);
	},
	
	skiptoReleaseClock: function(ch, refEnable)
	{
		var env = this.getEnvelopes(ch, true)
			, clock = env.decay + env.length
			, channel = this.channel[ch]
		;
		// console.log(channel.envelopeClock);
		channel.envelopeClock = channel.envelopeClock < clock ? clock : channel.envelopeClock;
		channel.envelopeClock += 0.1; //立ち上がり調整防止
		// console.log(ch, channel.envelopeClock);
	},
		
	clearEventsData: function()
	{
		this.eventsetData = makeEventsetData();
		this.delayEventset = makeEventsetData(); 
		this.noteSeekTime= 0; //note をセットする位置
		
	},
	
	//
	saveToCookie: function(data)
	{
		document.cookie = 'd=' + encodeURIComponent(data) + ";expires=Tue, 31-Dec-2030 23:59:59;";
	},
	
	// saveToServer: function(params, func, errorFunc)
	saveToServer: function(user_id, sound_id, dataObj, func, errorFunc)
	{
			var parser = new LitroSoundParser()
			, currentFile = {title: this.title, playerAccount: this.playerAccount, eventsetData: this.eventsetData}
			, data = parser.dataComponent(currentFile)
			, params = {user_id: user_id, sound_id: sound_id, data: data, title: this.title}
			;
			
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		if(params.sound_id == 0){
			//insert needs sound_id:0
			sendToAPIServer('POST', 'fileinsert', params, func, errorFunc);
		}else{
			//update needs sound_id > 0
			sendToAPIServer('POST', 'fileupdate', params, func, errorFunc);
		}
	},
	
	loadFromCookie: function()
	{
		var cookies = document.cookie.split('; ')
			, i, dic, str, data
		;
		this.clearEventsData();//初期化
		for(i = 0; i < cookies.length; i++){
			dic = cookies[i].split('=');
			if(dic[1] != null && dic[1].indexOf(this.FORMAT_LAVEL) >= 0){
				break;
			}
		}
		data = this.parseDataStr(decodeURIComponent(dic[1]));
		return data;
	},
	
	loadFromServer: function(user_id, sound_id, func, errorFunc)
	{
		var self = this
			, params = {user_id: user_id, sound_id: sound_id}
			// , user_name = this.fileUserName
		;
		// console.log('save ok', data, data.length);
		if(sound_id == 0){
			errorFunc({error_code: 0, message: 'no file'});
			return false;
		}
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		
		sendToAPIServer('GET', 'fileload', params, function(data){
			var sound = {};
			if(data == null || data == false){
				errorFunc(data);
			}
			
			sound.data = data.data == null ? [] : data.data;
			sound.title = data.title == null ? '' : data.title;
			sound.user_name = data.user_name == null ? '' : data.user_name;
			sound.user_id = data.user_id == null ? 0 : data.user_id;
			sound.sound_id = data.sound_id == null ? 0 : data.sound_id;
			self.setPlayData(sound);
			
			// self.dataPacks[self.NONPACK_NAME] = {};
			// self.dataPacks[self.NONPACK_NAME][sound.title] = sound;
			
			func(sound);
		}, errorFunc);
	},
	
	listFromServer: function(user_id, page, limit, func, errorFunc)
	{
		var params = {page: page, limit: limit, user_id: user_id}
			, self = this;
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		sendToAPIServer('GET', 'filelist', params, function(data){
			var i;
			if(data == null || data.error_code != null){
				errorFunc(data);
				return;
			}
			// append = append.length == null ? [append] : append;
			//取得ファイルでリストを更新
			for(i = 0; i < data.length; i++){
				self.serverFileList[data[i].sound_id] = data[i];
			}
			func(self.serverFileList);
		}, errorFunc);
	},
	
	/*
	* Load system sounds
	* name: litrokeyboard
	*/
	loadSystemSound: function(sename, func, errorFunc)
	{
		//TODO packloadにさせるか考え中
	var self = this
		, params = {}
		;
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		if(sename == null){
			return;
		}
		
		params.sename = sename;
		
		sendToAPIServer('GET', 'systemse', params, function(data){
			var i
			, packFiles = self.playPack.packFiles
			, packTitles = self.playPack.packTitles
			, packIDs = self.playPack.packIDs
				, lp = new LitroSoundParser();
			if(data == null || data == false){
				errorFunc(data);
			}
			// console.log(data, lp.parseDataStr(data));
			for(i = 0; i < data.length; i++){
				data[i].parseData = lp.parseDataStr(decodeURIComponent(data[i].data));
				packFiles.push(data[i]);
				packTitles.push(data[i].title);
				packIDs.push(data[i].sound_id);
			}
			
			self.setPlayDataFromPackIndex(sename, 0);
			
			func(packFiles);
			}, errorFunc);
	},
	
	packListFromServer: function(user_id, page, limit, func, errorFunc)
	{
		this.playPack.listFromServer(user_id, page, limit, func, errorFunc);
	},
	
	setPlayData: function(data)
	{
		var lp = new LitroSoundParser();
		this.clearEventsData();
		// this.eventsetData = this.parseDataStr(decodeURIComponent(data.data));
		
		this.eventsetData = data.parseData != null ? data.parseData : lp.parseDataStr(decodeURIComponent(data.data));
		this.title = data.title == null ? '' : data.title;
		this.fileUserName = data.user_name == null ? '' : data.user_name;
		this.user_id = data.user_id == null ? 0 : data.user_id;
		this.sound_id = data.sound_id == null ? 0 : data.sound_id;
		return true;
	},
	
	moveTuneParamsID: function (from, to)
	{
		var i, len = this.eventsetData.length, events, tmp = null, removed;
		for(i = 0; i < len; i++){
			events = this.eventsetData[i];
			if(events[from] != null){
				tmp = events[from];
			}
			if(tmp != null && events[to] != null){
				removed = events[to];
				events[to] = tmp;
			}
		}
		return tmp;
	},
	
	
	//パースしたデータが入る
	insertPack: function(pack)
	{
		var title, playdata;
		for(title in pack){
			playdata = pack[title];
			// playdata = 
		}
		this.playPack = pack;
	},
	
	setPlayDataFromPackIndex: function(index)
	{
		var files = this.playPack.packFiles;
		if(files[index] == null){
			return false;
		}
		return this.setPlayData(files[index]);
	},
	
	setPlayDataFromPackForTitle: function(title)
	{
		var key, titles = this.playPack.packTitles;
		key = search(title);
		if(key == -1){
			return false;
		}
		return this.setPlayData(titles[key]);
	},
	
	fileList: function(list)
	{
		this.serverFileList = list == null ? this.serverFileList : list;
		return this.serverFileList;
	},

	isPlay: function()
	{
		return this.playSoundFlag;
	},
	
	playForKey: function(index_title)
	{
		var pKeys, pack = this.playPack, res = false;
		// console.log(pack);
		if(!isNaN(index_title)){
			res = this.setPlayDataFromPackIndex(index_title);
		}else if(typeof index_title == 'String'){
			res = this.setPlayDataFromPackForTitle(index_title);
		}
		if(res == false){
			return false;
		}
//		this.eventsetData = this.dataPack[key];
		this.play();//
		return true;
	},
	
	play: function()
	{
		this.systemTime = performance.now();
		this.playSoundFlag = true;
		this.delayEventset = makeEventsetData();
		// for(var i = 0; i < this.channel.length; i++){
			// this.channel[i].refChannel = this.channel[i].id;
		// }
		//TODO connectリセット処理が必要かも
		// litroSoundInstance.connectOff();
		// litroSoundInstance.connectOn();
	},
	
	stop: function(toggle)
	{
		this.systemTime = performance.now();
		this.playSoundFlag = false;
		this.delayEventset = makeEventsetData();
	},
	
	volume: function(vol)
	{
		var sTime, gain = this.litroSound.gain.gain;
		if(vol != null){
			vol = vol < 0 ? 0 : vol;
			sTime = this.litroSound.context.currentTime;
			gain.cancelScheduledValues(sTime);
			gain.setValueAtTime(gain.value, sTime);
			gain.setTargetAtTime(vol, sTime, 0);
		}else{
			vol = gain.value;
		}
		
		return vol;
	},
	
	commonEventTime: function(eventName){
		var t, tuneID = LitroWaveChannel.tuneParamsProp[eventName].id
			, set = this.eventsetData[this.COMMON_TUNE_CH].event;
		for(t  in set){
			if(set[t].value == tuneID){
				return t | 0;
			}
		}
		return -1;
	},
	
	//ループの際何かを実行
	restartEvent: function(){
		return;
	},
	
	setRestartEvent: function(func){
		this.restartEvent = func;
	},
	
	soundEventPush: function(ch, type, value)
	{
		// var tuneId = LitroWaveChannel.tuneParamsID;
		var tuneProp = LitroWaveChannel.tuneParamsProp;
		if(type == 'note'){
			this.onNoteKey(ch, value);
		}else if(type == 'event'){
			switch(value){
				case tuneProp['return'].id:
					if(this.playOnce){
						this.stop();
						return true;
					}
					this.seekMoveBack(-1);
					this.seekMoveForward(this.commonEventTime('restart'));
					this.delayEventset = makeEventsetData();
					this.restartEvent();
					return true;
				case tuneProp.noteoff.id: this.fadeOutNote(ch, ch); break;
				case tuneProp.noteextend.id: this.extendNote(ch, ch); break;
			}
		}else{
			this.setChannel(ch, type, value);
		}
		return false;
	},
	
	scanEdata: function(ch, edata)
	{
		var seekTime = this.noteSeekTime, looped = false
			, sort = LitroWaveChannel.sortParam, slen = sort.length, typeBlock, data
			, type, i
			, delay = this.getChannel(ch, 'delay', true) * 10;
		;
		for(i = 0; i < slen; i++){
			type = sort[i];
			typeBlock = edata[ch][type];
			if(typeBlock[seekTime] == null){continue;}
			data = typeBlock[seekTime];
			if(delay > 0){
				this.soundEventDelayPush(ch, delay, delay + data.time, type, data.value);
			}else{
				looped |= this.soundEventPush(ch, type, data.value);
			}
			
		}
		return looped;
	},
	scanDelayedEdata: function(ch, dData)
	{
		var seekTime = this.noteSeekTime, looped = false
			, sort = LitroWaveChannel.sortParam, slen = sort.length, typeBlock, data
			, type, i
		;
		for(i = 0; i < slen; i++){
			type = sort[i];
			typeBlock = dData[ch][type];
			if(typeBlock[seekTime] == null){continue;}
			data = typeBlock[seekTime];
			looped |= this.soundEventPush(ch, type, data.value);
		}
		
		return looped;
	},
	//bufferProcess任せ
	playSound: function()
	{
		// console.log(this.playSoundFlag);
		if(!this.playSoundFlag){return;}
		var t, ch, s
			, data, delay
			, now = performance.now()
			, perFrameTime = 1
			, eData = this.eventsetData, typeBlock, clen = eData.length
			, dData = this.delayEventset
			, looped = false
		;
		for(t = 0; t < perFrameTime; t++){
			for(ch = 0; ch < clen; ch++){
				looped |= this.scanEdata(ch, eData);
			}
			for(ch = 0; ch < clen; ch++){
				looped |= this.scanDelayedEdata(ch, dData);
			}
			if(!looped){
				this.seekMoveForward(1);
			}
		}

		this.systemTime = now;
		
	},
	
	soundEventDelayPush: function(ch, time, time_id, type, value)
	{
		// this.delayEventset[ch] = this.delayEventset[ch] == null ? {} : this.delayEventset[ch];
		// this.delayEventset[ch][type] = this.delayEventset[ch][type] == null ? {} : this.delayEventset[ch][type];
		this.delayEventset[ch][type][time_id | 0] = {time: time | 0, ch: ch, type: type, value: value};
	},
	
	getEventsFromTime: function(ch, time, filter)
	{
		var type, types = {}, res = {}, set = false, tindex;
		filter = filter == null ? LitroWaveChannel.sortParam : this.typesArray(filter);
		// for(tindex = 0; tindex < filter.length; tindex++){
		filter.forEach(function(type, tindex){
			type = filter[tindex];
			if(this.eventsetData[ch] != null && this.eventsetData[ch][type] != null && this.eventsetData[ch][type][time] != null){
				res[type] = this.eventsetData[ch][type][time];
			}
		}, this);
		return res;
	},
	
	seekMoveForward: function(ftime)
	{
		ftime = ftime == null ? 1 : ftime;
		this.noteSeekTime += ftime;
	},
	seekMoveBack: function(ftime)
	{
		ftime = ftime == null ? this.noteRange * this.noteRangeScale / this.noteRangeCells : ftime;
		if(ftime < 0){
			ftime = this.noteSeekTime;
		}
		this.noteSeekTime -= ftime;
		this.noteSeekTime = this.noteSeekTime < 0 ? 0 : this.noteSeekTime;
	},
	//eventset-time-type
	allStackEventset: function(ch, types)
	{
		var tindex, type, t, events = {}
		, timedStack = [], timedEvents, typedEvents, ev
		;
		types.forEach(function(type, tindex){
			typedEvents = Object.keys(this.eventsetData[ch][type]);
			typedEvents.forEach(function(t, i, ev){
				// if(ev[t] != null){
					events[t] = events[t] == null ? {} : events[t];
					events[t][type] = this.eventsetData[ch][type][t];
					// events[t] = this.eventsetData[ch][type][t];
				// }
			}, this);
			return events;
		}, this);
		
		timedEvents = Object.keys(events);
		timedEvents.forEach(function(t){
			types = Object.keys(events[t]);
			types.forEach(function(type, i, ev){
				timedStack.push(events[t][type]);
			}, this);
		}, this);

		return timedStack;
	}, 
	
	typesArray: function(type, exIgnores)
	{
		var types = [], t, params = []
			, del = {}
			, ignores = ['note']
			;
		exIgnores = exIgnores == null ? [] : exIgnores;
		type = type == null ? 'ALL' : type;
		if(type == 'ALL'){
			//すべてのタイプを検索
			types = LitroWaveChannel.sortParam;
		}else if(type == 'TUNE'){
			//イベントセットの検索
			params = LitroWaveChannel.sortParam;
			for(t = 0; t < params.length; t++){
				if(ignores.indexOf(params[t]) >= 0 || exIgnores.indexOf(params[t]) >= 0){
					continue;
				}
				types.push(params[t]);
			}
		}else{
			//指定のタイプを見る
			types.push(type);
		}
		return types;
	},
	
	//Note検索 end:0前方・-1後方
	//return eventset / null
	searchNearForward: function(ch, start, end, type, ignore)
	{
		var t, tindex, events ={}, types = [], eventset
			, keyIndex = this.eventsetKeyIndex
		;
		start = start == null ? this.noteSeekTime : start;
		//前方一致
		types = this.typesArray(type == null ? 'ALL' : type);
		events = this.allStackEventset(ch, types);
// console.log(events, start);

		for(t = 0; t < events.length; t++){
			for(tindex = 0; tindex < types.length; tindex++){
				type = types[tindex];
				eventset = events[t];
				if(ignore.time == eventset.time){
					if(ignore.type == eventset.type || keyIndex[ignore.type] >= keyIndex[eventset.type]){
						continue;
					}
				}
				if(eventset.time >= start && (end >= 0 && eventset.time <= end)){
					return eventset;
				}else if(eventset.time >= start && end < 0){
					return eventset;
				}
			}
		}
		return null;
	},
	//return eventset / null
	searchNearBack: function(ch, start, end, type, ignore)
	{
		var t, tindex, events ={}, types = [], eventset
			, keyIndex = this.eventsetKeyIndex
		;
		start = start == null ? this.noteSeekTime : start;
		types = this.typesArray(type == null ? 'ALL' : type);
		//後方一致
		events = this.allStackEventset(ch, types);
		// console.log(events, types[type], this.eventsetData[ch][types[type]]);
		events.reverse();
		for(t = 0; t < events.length; t++){
			for(tindex = 0; tindex < types.length; tindex++){
				type = types[tindex];
				eventset = events[t];
				if(ignore != null && ignore.time == eventset.time){
					if(ignore.type == eventset.type || keyIndex[ignore.type] <= keyIndex[eventset.type]){
						continue;
					}
				}
				if(eventset.time <= start && eventset.time >= end){
					return eventset;
				}
			}
		}
		return null;
	},
	
};

function makeEventsetData(channels){
	var eventset = [], type, ch, addEtc = 0
	;
	channels = channels == null ? litroSoundInstance.channel.length : channels;
	for(ch = 0; ch < channels + addEtc; ch++){
		// this.noteData.push({});
		eventset.push({});
		eventset[ch].note = {};
		for(i = 0; i < LitroWaveChannel.sortParam.length; i++){
			eventset[ch][LitroWaveChannel.sortParam[i]] = {};
		}
	}
	return eventset;
};


function LitroPlayPack(){return;};
LitroPlayPack.prototype = {
	init: function()
	{
		this.packList = [];
		this.packFiles = [];
		this.packTitles = [];
		this.packIDs = [];
		
		// this.litroSound = litroSoundInstance;
		
		this.NONPACK_NAME = ' NO-PACK ';

	},
	
	listFromServer: function(user_id, page, limit, func, errorFunc)
	{
		var params = {page: page, limit: limit, user_id: user_id}
			, self = this;
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		sendToAPIServer('GET', 'packlist', params, function(data){
			var i;
			if(data == null || data.error_code != null){
				errorFunc(data);
				return;
			}
			//取得ファイルでリストを更新
			for(i = 0; i < data.length; i++){
				self.packList[data[i].sound_id] = data[i];
			}
			func(self.serverFileList);
		}, errorFunc);
	},
	
	loadPack: function(pack_query, func, errorFunc)
	{
		var self = this
			, params = {pack_query: pack_query}
		;
		// if(user_id == 0){
			// errorFunc({error_code: 0, message: 'no user_id'});
			// return;
		// }
		if(packName == null){
			errorFunc({error_code: 0, message: 'no Package Name'});
			return;
		}
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		
		//data : {sound_id, ?}
		sendToAPIServer('GET', 'packload', params, function(data){
			var i;
			if(data == null || data == false){
				errorFunc(data);
			}
			
			self.packList[packName] = {};
			for(i = 0; i < data.length; i++){
				self.packList[packName][data[i].title] = data[i];
			}
			
			func(self.packList[packName]);
			}, errorFunc);
	},
	
};

//TODO parserを作る？
var LitroSoundParser = function(){
	this.fversion = LitroWaveChannel.paramsVersion + '.' + LitroPlayer.version;
	this.titleCodes = [];
	this.titleMaxLength = TITLE_MAXLENGTH;
	this.fileUserName = 'guest_user_';
	this.playerAccount = 'guest_user_';
	this.FORMAT_LAVEL = 'litrosoundformat';
	this.fileOtherInfo = 'xxxxxxxxxxxxxxxx';
	this.dataHeaderDelimiter = '[datachunk]';
	this.headerParamDelimiters = {title: '[title]', playerAccount: '[auth]', fversion: '[version]'};
	this.HEADER_TITLELENGTH = this.titleMaxLength;
	this.DATA_LENGTH16 = {ch:2, type:2, timeval:4, time:6, value:2};
	this.DATA_LENGTH36 = {ch:1, type:2, timeval:3, time:4, value:2};
	this.CHARCODE_LENGTH16 = 8;//4byte
	this.CHARCODE_LENGTH36 = 6;//3byte
	this.CHARCODE_MODE = 36;		
	this.headerParams = {};
};

LitroSoundParser.prototype = {
	/**
	 * cookie
	 * [header: 64]
	 * litrosoundformat
	 * version-xx.xx.xx
	 * auth_xxxxxxxxxxx
	 * [title: 16](xxxxxxxxxxxxxxxx)
	 * [datachunk: 4096 - 64]
	 * <CH><TYPEID><LENGTH><DATA>
	 * <CH><TYPEID><LENGTH><DATA>
	 * <255><COMMONTYPEID><LENGTH><DATA>
	 * DATA:<time><value>
	 * 4.6h
	 */
	/**
	 * litrosoundformat
	 * [version]xx.xx.xx
	 * [auth]xxxxxxxxxxx
	 * [title](xxxxxxxxxxxxxxxx)32
	 * [datachunk]4096 - 64
	 * <CH><TYPEID><LENGTH><DATA>
	 * <CH><TYPEID><LENGTH><DATA>
	 * <255><COMMONTYPEID><LENGTH><DATA>
	 * DATA:<time><value>
	 * 4.6h
	 */	
	pad0: function(str, num)
	{
		while(num - str.length > 0){
			str = '0' + str;
		}
		return str;
	},
	
	 
// 	 TODO headerObjectをつくる
	headerInfo: function(currentFile)
	{
		var title = this.str5bit(this.titleCodes.length > 0 ? this.titleCodes : currentFile.title);
		return this.FORMAT_LAVEL + '[version]' + this.fversion + '[auth]' + currentFile.playerAccount + '[title]' + title + this.dataHeaderDelimiter;
	},
	
	//byteArray or String
	str5bit: function(source)
	{
		var i = 0, bstr = "", str = '', len = source.length, c
			, mode = this.CHARCODE_MODE, strbits = 16, codebits = 5
		;
		while(len > i){
			if(typeof source == 'string'){
				c = source.charCodeAt(i).toString(2);
			}else{
				c = source[i].toString(2);
			}
			if(c.length % strbits > 0){
				c = ('00000000'.substr(0, strbits - (c.length % strbits))) + c;
			}
			bstr += c;
			i++;
		}
		len = bstr.length;
		if(len % codebits > 0){
			bstr += '00000'.substr(0, codebits - (len % codebits));
			len = bstr.length;
		}
		i = 0;
		while(len > i){
			str += parseInt((bstr.substr(i, codebits)), 2).toString(mode);
			i += codebits;
		}
		return str;
	},
	
	dataToString: function(edat)
	{
		// LitroWaveChannel.tuneParamsID
		var str = ''
			, ch, time, type, chstr, timeDats, typeDatsNum
			, typestr
			, prop = LitroWaveChannel.tuneParamsProp
			, mode = this.CHARCODE_MODE
			, datLen = this.DATA_LENGTH36
		;
		// console.log(keyId);
		for(ch in edat){
			chstr = this.pad0((ch | 0).toString(mode), datLen.ch); //+2

			for(type in edat[ch]){
				timeDatsNum = 0;
				for(time in edat[ch][type]){
					timeDatsNum++;
				}
				
				typestr = this.pad0((prop[type].id | 0).toString(mode), datLen.type);//+2
				typestr += this.pad0((timeDatsNum | 0).toString(mode), datLen.timeval);//+4
				for(time in edat[ch][type]){
					typestr += this.pad0((time | 0).toString(mode), datLen.time);//+6
					typestr += this.pad0(((edat[ch][type][time].value | 0) - prop[type].min).toString(mode), datLen.value);//+2
				}
				if(timeDatsNum == 0){continue;}
				str += chstr + typestr;
			}
		}
		
		return str;
	},
	
	dataStrToCharCode: function(str)
	{
		var i, len, clen = 0, sepLen = this.CHARCODE_LENGTH36
			, charCode = ''
		;
		len = str.length;
		if(len % sepLen > 0){
			str += '00000000'.substr(0, sepLen - (len % sepLen));
			len += len % sepLen;
		}
		
		while(len > clen){
			charCode += String.fromCharCode(parseInt(str.substr(clen, sepLen), 16));
			clen += sepLen;
		}
		return charCode;
	},
	//%04%E6%90%80%E2%B0%80%EF%90%80%EB%B0%80
	
	charCodeToDataStr: function(code)
	{
		var sepLen = this.CHARCODE_LENGTH36, clen = code.length
			, rlen = 0, str = '', sepStr
		, mode = this.CHARCODE_MODE
		;
		while(clen > rlen){
			sepStr = code.substr(rlen, 1).charCodeAt(0).toString(mode);
			str += '00000000'.substr(0, sepLen - sepStr.length) + sepStr;
			rlen += 1;
		}
		return str;
	},
	//datastr parse のみ有効
	timevalData: function(type, timeval)
	{
		var i, res = {}, datLen = this.DATA_LENGTH36
		, mode = this.CHARCODE_MODE
		, chunkLen = datLen.time + datLen.value
		, length = (timeval.length / chunkLen) | 0
		, time, value
		, prop = LitroWaveChannel.tuneParamsProp
		;
		for(i = 0; i < length; i++){
			time = parseInt(timeval.substr(chunkLen * i, datLen.time), mode);
			value = parseInt(timeval.substr((chunkLen * i) + datLen.time, datLen.value), mode) + prop[type].min;
			res[time] = {type: type, time: time, value: value};
		}
		return res;
	},
	
	parseHeaderStr: function(str)
	{
		// '[version]' '[auth]' '[title]' 
		var start, len, deli;
		for(key in this.headerParamDelimiters){
			deli = this.headerParamDelimiters[key];
			start = str.lastIndexOf(deli) + deli.length;
			len = str.indexOf('[', start) - start;
			this.headerParams[key] = len < 0 ? '' : str.substr(start, len);
		}
		return this.headerParams;
	},
	
	parseDataStr: function(data)
	{
		var dlen
			, mode = this.CHARCODE_MODE
			, datLen = this.DATA_LENGTH36
			, rlen = 0, res = '', tvalLen = 0
			, idKey
			, minLen = datLen.ch + datLen.type + datLen.timeval
			, delim = this.dataHeaderDelimiter, headerParams = {}
			, eventsetData = makeEventsetData();
		;
		headerParams = this.parseHeaderStr(data.substr(0, data.lastIndexOf(delim)));
		idKey = LitroWaveChannel.tuneParamsIDKey(headerParams.fversion.split('.')[0]);
		data = data.substr(data.lastIndexOf(delim) + delim.length);
		dlen = data.length;

		while(dlen > rlen + minLen){
			ch = parseInt(data.substr(rlen, this.DATA_LENGTH36.ch), mode);
			rlen += this.DATA_LENGTH36.ch;
			type = idKey[parseInt(data.substr(rlen, this.DATA_LENGTH36.type), mode) | 0];
			rlen += this.DATA_LENGTH36.type;
			tvalLen = parseInt(data.substr(rlen, this.DATA_LENGTH36.timeval), mode);
			rlen += this.DATA_LENGTH36.timeval;
			tval = this.timevalData(type, data.substr(rlen, (this.DATA_LENGTH36.time + this.DATA_LENGTH36.value) * tvalLen));
			rlen += (this.DATA_LENGTH36.time + this.DATA_LENGTH36.value) * tvalLen;
			if(eventsetData[ch] == null){
				eventsetData[ch] = {};
			}
			eventsetData[ch][type] = tval;
		}
		
		return eventsetData;
	},
	
	dataComponent: function(litroCurrentFile){
		var data, current = litroCurrentFile
		;
// 		litroCurrentFile: title playerAccount eventsetData 
		data = encodeURIComponent(this.headerInfo(current) + this.dataToString(current.eventsetData));
		return data;
	},
};


var APIServer = {url: null};
function initAPIServer(apiUrl)
{
	APIServer.url = apiUrl;
};

function sendToAPIServer(method, api, params, func, errorFunc)
{
	var query = [], key, x = new XMLHttpRequest();
	if(APIServer.url == null){console.error('not initialize api server'); return;}
	if(func != null){
		x.onreadystatechange = function(){
			var j;
			switch(x.readyState){
				case 0:break;//オブジェクト生成
				case 1:break;//オープン
				case 2:break;//ヘッダ受信
				case 3:break;//ボディ受信
				case 4:
							if((200 <= x.status && x.status < 300) || (x.status == 304)){
								j = x.responseText;
								try{
									j = typeof j == 'string' ? JSON.parse(j) : '';
								}catch(e){
									j = null;
								}
								func(j);
								x.abort();
							}else{
								errorFunc();
								x.abort();
							}
							 break;//send()完了
			}
		//	func;
		};
	}
	for(key in params){
		query.push(key + '=' + params[key]);
	}
	str = query.join('&');
	if(method.toUpperCase() == 'GET'){
		x.open(method, APIServer.url + '/' + api + '?' + str , true);
		str = "";
	}else{
		x.open(method, APIServer.url + '/' + api, true);
	}
	x.withCredentials = true;
	x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
	// Set-Cookie:LITROSOUND=8lr6fpmr30focapfnejn807mo5;
	x.send(str);
};

/**
 * 波形生成
 */
function LitroWaveChannel(){return;};
LitroWaveChannel.sortParam = [
	'waveType',
	'volumeLevel',
	'attack',
	'hold',
	'decay',
	'sustain',
	'length',
	'release',
	'vibratospeed',
	'vibratodepth',
	'vibratorise',
	'vibratophase',
	'sweep',
	'delay',
	'detune',
	'waveTypeAttack',
	'waveTypeHold',
	'waveTypeDecay',
	'event',
	'enable',
	'note'
];

//TODO エンベロープごとの波形タイプ
//TODO サーバー保存時のマイナス処理

/**
 * 01:hold-id132, decay-id133, sustain-id134, length-id135, release-id136,
 *  delay-id140, detune-id141, sweep-id150
 * waveTypeHold-id181, waveTypeDecay-id182
 * 00:初期
 */
LitroWaveChannel.paramsVersion = "01";

LitroWaveChannel.tuneParamsProp = {
	'void': {id: 0, max: 0, min: 0},
	enable: {id: 1, max: 1, min: 0},
	restart: {id: 2, max: Infinity, min: 0},
	'return': {id: 3, max: Infinity, min: 0},
	prestart: {id: 4, max: Infinity, min: 0},
	preend:{id: 5, max: Infinity, min: 0},
	noteon:{id: 6, max: Infinity, min: 0},
	noteoff:{id: 7, max: Infinity, min: 0},
	noteextend:{id: 8, max: Infinity, min: 0},
	'event': {id: 127, max: 255, min: 0},
	note: {id: 128, max: 255, min: 0},
	waveType:{id: 129, max: 15, min: 0},
	volumeLevel:{id: 130, max: 15, min: 0},
	attack:{id: 131, max: 64, min: 0},
	hold:{id: 132, max: 255, min: 0}, //v0.8
	decay:{id: 133, max: 64, min: 0},
	sustain:{id: 134, max: 15, min: 0},
	length:{id: 135, max: 255, min: 0},
	release:{id: 136, max: 255, min: 0},
	delay:{id: 140, max: 255, min: 0},
	detune:{id: 141, max: 127, min: -127},
	sweep:{id: 150, max: 127, min: -127},

	vibratospeed:{id: 160, max: 255, min: 0},
	vibratodepth:{id: 161, max: 255, min: 0},
	vibratorise:{id: 162, max: 255, min: 0},
	vibratophase:{id: 163, max: 255, min: 0},
	waveTypeAttack:{id: 180, max: 15, min: -1},
	waveTypeHold:{id: 181, max: 15, min: -1}, //v0.8
	waveTypeDecay:{id: 182, max: 15, min: -1}, //v0.8
};

LitroWaveChannel.diffListTuneParamsProp = {
	"00":{
		decay:{id: 132, max: 64, min: 0},
		sustain:{id: 133, max: 15, min: 0},
		length:{id: 134, max: 255, min: 0},
		release:{id: 135, max: 255, min: 0},
		delay:{id: 136, max: 255, min: 0},
		detune:{id: 137, max: 127, min: -127},
		sweep:{id: 138, max: 127, min: -127},
		waveTypeDecay:{id: 181, max: 15, min: -1}, 
	},
};

LitroWaveChannel.commonTuneType = {
	restart: '',
	'return': '',
};

LitroWaveChannel.noiseParam = {
	volume : 0,
	// shortType : 1,
	reg: 0x8000,
	halfLength : 0,
	clock : 0,
};
/**
 * parseDataStr のときのみ呼ばれる
 * @param {String} paramsVersion
 */
LitroWaveChannel.tuneParamsIDKey = function(paramsVersion)
{
	var k, keys = {}, props;
	props = LitroWaveChannel.tuneParamsProp;
	for(k in props){
		keys[props[k].id] = k;
	}
	
	//ファイルバージョン差分対応
	if(paramsVersion != null && !isNaN(parseInt(paramsVersion, 10))){
		props = LitroWaveChannel.diffListTuneParamsProp;
		if(paramsVersion in props){
			props = props[paramsVersion];
			for(k in props){
				keys[props[k].id] = k;
			}
		}
		console.log("file version:" + paramsVersion + " -> " + LitroWaveChannel.paramsVersion);
	}

	return keys;
};


LitroWaveChannel.maxTune = function(name)
{
	return LitroWaveChannel.tuneParamsProp[name].max;
	// return LitroWaveChannel.tuneParamsMax[name];
};
LitroWaveChannel.minTune = function(name)
{
	return LitroWaveChannel.tuneParamsProp[name].min;
	// return LitroWaveChannel.tuneParamsMin[name];
};

// LitroWaveChannel.baseVolume = 1 / WAVE_VOLUME_RESOLUTION;
LitroWaveChannel.offsetVolume = WAVE_VOLUME_RESOLUTION / 2;

LitroWaveChannel.prototype = {
	init:function(datasize, resolution){
		// console.log(this.data);
		this.id = null;
		// this.bufferSource = null;
		this.buffer = null;
		this.absorbVolumeSource = 0;
		this.absorbPosition = 0;
		this.absorbCount = 0;
		this.absorbNegCount = 0;
		this.waveLength = 0;
		this.refreshClock = 0;
		this.waveClockPosition = 0;
		this.preWaveClockPosition = 0;
		this.detuneClock = 0;
		this.envelopeClock = 0;
		this.envelopeEnd = true;//初期大音量防止
		this.envelopeStart = false;
		this.sweepClock = 0;
		this.vibratoClock = 0;
		this.prevLength = 0;
		this.data = this.allocBuffer(datasize);
		this.bufferSize = datasize;
		this.dataUpdateFlag = false;//不要？
		// this.refChannel = -1;
		// this.referChannelFunc = function(){return;}
		this.noteKey = -1;
		this.noiseParam = {
			volume : 0,
			shortType : 1,
			reg: 0x8000,
			halfLength : 0,
			clock : 0,
		};
		// this.waveType = 0;
		this.frequency = 1;
		this.WAVE_VOLUME_RESOLUTION = resolution;
		this.memory; //波形メモリ

		this.tuneParams = {
			volumeLevel:12,
			waveType:0,
			length:32,
			delay:0,
			detune:0,
			sweep:0,
			attack:0,
			hold:0,
			decay:0,
			sustain:10,
			release:0,
			vibratospeed:0,
			vibratodepth:0,
			vibratorise:0,
			vibratophase:0,
			waveTypeAttack:-1,
			waveTypeHold:-1,
			waveTypeDecay:-1,
			'event': 0,
			enable:1,
			// turn:1,
		};
		this.preSwapTune = this.tuneParams;
		this.envelopes = {};
		this.refreshEnvelopeParams(1);
		this.finishEnvelope();
		
	},
	
	getMemory: function(){
		var mem = this.memoryData;
		return mem.func == null ? mem.data : mem.func(mem.data, this);
	},
	
	getWaveOffsetRate: function(){
		return this.memoryData.offsetRate;
	},
	
	getPhase: function()
	{
		var clock = this.envelopeClock
			, channel = this
			, env = channel.envelopes
			;
		clock -= env.attack;
		if(clock < 0){return 'a';}
	
		clock -= env.hold;
		if(clock < 0){return 'h';}
	
		clock -= env.decay;
		if(clock < 0){return 'd';}
	
		clock -= env.length;
		if(clock < 0){ return 's';}
		
		clock -= env.release;
		if(clock < 0){ return 'r';}
		
		return '';
		// return phase(this.channel[ch]);
	},
	
	envelopedVolume: function()
	{
		if(!this.isEnable()){return 0;}
		// printDebug(ch);
		var i
		// , refChannel = this.referChannelFunc()
		// , refEnabled = refChannel == null ? false : true
		, channel = this
		// , vol = (1 / 2) / channel.WAVE_VOLUME_RESOLUTION  // +1 / -1 
		// , vol = 1 / channel.WAVE_VOLUME_RESOLUTION 
		, vol = 1 
		, clock = channel.envelopeClock
		// , env = refChannel == null ? channel.envelopes : refChannel.envelopes
		, env = channel.envelopes
		, sLevel = env.sustain
		// , svol = vol * sLevel
		, svol = sLevel
		;
		
		if(!channel.envelopeStart){channel = null; return 0;}
		vol = vol * env.volumeLevel;
		switch(channel.getPhase()){
			case 'a': 
				d = vol / env.attack;
				vol = clock * d;
				break;
			case 'h': 
				clock -= env.attack;
				break;
			case 'd': 
				clock -= env.attack + env.hold;
				d = (vol - svol) / env.decay;
				vol -= clock * d;
				break;
			case 's': 
				clock -= env.attack + env.hold + env.decay;
				vol = svol;
				break;
			case 'r': 
				clock -= env.length + env.attack + env.hold + env.decay;
				d = (svol) / env.release;
				vol = svol - (clock * d);
				break;
			default: vol = 0; break;
		}
		if(isNaN(vol)){
			console.log(this.getPhase());
		}
		channel = null;
		// refChannel = null;
		return vol;
	},
	
	envelopeDistance: function(clockRate)
	{
		clockRate == null ? 1 : clockRate;
		var env = this.envelopes;
		return (env.attack + env.hold + env.decay + env.length + env.release) * clockRate;
	},
	
	finishEnvelope: function()
	{
		this.envelopeClock = this.envelopeDistance() + 1;
		// litroSoundInstance.offNoteKeyEventFunc(this.id, this.noteKey);
	},
	
	tune: function(name, param)
	{
		var p = this.tuneParams;
		return p[name] = (param == null) ? p[name] : param;
	},
	//高速化のためエンベロープオブジェクトをつくっとく
	refreshEnvelopeParams: function(clockRate)
	{
		var p = this.tuneParams;
		this.envelopes = {attack: p.attack * clockRate, hold: p.hold * clockRate, decay: p.decay * clockRate, length: p. length * clockRate, release: p.release * clockRate, sustain: p.sustain, volumeLevel: p.volumeLevel};
	},
	
	// envelopes: function(clockRate)
	// {
		// var p = this.tuneParams;
		// clockRate == null ? 1 : clockRate;
		// return {attack: p.attack * clockRate, decay: p.decay * clockRate, length: p. length * clockRate, release: p.release * clockRate, sustain: p.sustain, volumeLevel: p.volumeLevel};
	// },
	
	vibratos: function(clockRate)
	{
		var p = this.tuneParams;
		clockRate == null ? 1 : clockRate;
		return {vibratospeed: p.vibratospeed * clockRate, vibratodepth: p.vibratodepth, vibratorise: p. vibratorise * clockRate, vibratophase: p.vibratophase};
	},
	
	setMemory: function(memDat)
	{
		this.memoryData = memDat;
	},
	
	setFrequency: function(freq)
	{
		this.frequency = freq;// + (freq / 1028 * this.getChannel(ch, 'detune', true));
		this.prevLength = this.waveLength;
		this.waveLength = ((litroSoundInstance.context.sampleRate / this.frequency)) | 0;
	},
	
	allocBuffer: function(datasize){
		var i, data, a;
		data = new Float32Array(datasize);
		for(i = 0; i < datasize; i++){
			data[i] = 0;
		}
		return data;
	},
	
	getDetunePosition: function()
	{
		if(this.tuneParams.detune == 0){return 0;}
		return ((this.detuneClock * this.tuneParams.detune * 0.1) | 0) % this.waveLength;
	},
	
	isNoiseType: function()
	{
		var type = this.tuneParams.waveType;
		return type > 11 && type < 16;
	},
	
	isEnable: function()
	{
		return this.tuneParams.enable == 1;
	},
	
	//Setter
	resetEnvelope: function()
	{
		this.envelopeClock = 0;
		this.envelopeEnd = false;
		this.envelopeStart = true;
	},
	
	clearWave: function(start, end)
	{
		 var i, r = this.data[this.waveLength - 1], len = end == null ? this.waveLength : end;
		for(i = (start == null ? 0 : start); i < len; i++){
			this.data[i] = 0;
		}
		return r;
	},
	
	trigRize: function(){
		//note立ち上がり
			//TODO タイミングの統一性
			// this.absorbVolumeSource = this.data[this.preWaveClockPosition];
			this.setFrequency(freqByKey(this.noteKey));
			this.clearWave(this.waveLength, this.prevLength);
			this.waveClockPosition = Math.round(this.preWaveClockPosition * (this.waveLength / this.prevLength));
			// this.absorbPosition = Math.round(this.absorbPosition * (this.waveLength / this.prevLength));
			this.absorbNegCount = 0;
	},
	
	trigFall: function(){
		//note立ち下がり
		// if(this.isFinishEnvelope(channelNum, true) && !channel.envelopeEnd){
			//TODO タイミングの統一性
			this.absorbVolumeSource = this.data[this.preWaveClockPosition];
			this.absorbCount = 0;
			this.envelopeEnd = true;
			this.dataUpdateFlag = false;
			this.envelopeStart = false;
			this.finishEnvelope();
	},
	
	isFinishEnvelope: function(clockRate){
		clockRate == null ? 1 : clockRate;
		var clock = this.envelopeClock, env = this.envelopes
		;
		if(clock >= env.attack + env.hold + env.decay + env.length + env.release){
			return true;
		}
		return false;
	},
	
	absorbVolume: function(){
		var absCoe = 0.001;
		if(this.envelopeEnd == true){
			//クリック音防止余韻
			return this.absorbVolumeSource * Math.exp(-absCoe * this.absorbCount++);
		}else if(this.envelopeStart == true){
			if(this.absorbNegCount == 0){
				//TODO タイミングの統一
				this.absorbVolumeSource = this.data[this.waveClockPosition];
			}
			return -this.absorbVolumeSource * Math.exp(-absCoe * this.absorbNegCount++);
		}else{
			return 0;
		}
	},
	
	skipWave: function(){
		if(this.envelopeEnd == true || this.waveLength == 0){return 0;}
		var wpos = this.waveClockPosition, wlen = this.waveLength
		;

		this.preWaveClockPosition = wpos;
		this.waveClockPosition = wpos + 1 < wlen ? wpos + 1 : 0;
		return 0;
	},
	
	nextWave: function(){
		if(this.envelopeEnd == true || this.waveLength == 0){return 0;}
		var vol, avol
		, wpos = this.waveClockPosition, wlen = this.waveLength
		, detune = this.getDetunePosition()
		, absCoe = 0.001;
		;

		if(wpos == 0){
			//mem.funcを持っていない場合実行しなくても良い
			this.applyWaveMemory();

		}
		vol = this.data[(wlen + wpos + detune) % wlen];
		this.preWaveClockPosition = wpos;
		this.waveClockPosition = wpos + 1 < wlen ? wpos + 1 : 0;
		return vol;
	},
	
	applyWaveMemory: function()
	{
		var i
			, mem = this.getMemory()
			, vol = this.envelopedVolume()
			, data = this.data, len = this.waveLength, plen = this.prevLength
			, delta = 0
			, pos = 0
			;
		if(mem == null){return;}
		delta = mem.length / len;
		vol *= this.getWaveOffsetRate();
		if(vol < 0){vol = 0;}
		for(i = 0; i < len; i++){
			data[i] = (mem[pos | 0] - LitroWaveChannel.offsetVolume) * vol;
			pos += delta
		}
		for(i; i < plen; i++){
			data[i] = 0;
		}
	},

};

function LitroWaveMemory(){return;};
LitroWaveMemory.SAMPLE_BUFFER = 32;
LitroWaveMemory.QUANTIZATION_SIZE = 8;// & 00001111
LitroWaveMemory.QUANTIZATION_MASK = 0xf;// 00001111
LitroWaveMemory.prototype = {
	init: function(data, name, offsetRate){
		this.name = name == null ? '' : name;
		this.data = new Uint8Array(LitroWaveMemory.SAMPLE_BUFFER);
		this.func = null;
		this.offsetRate = offsetRate;
		if(data != null){
			if(typeof data == 'function'){
				this.func = data;
			}else{
				this.data.set(data);
			}
		}
	}
};

function LitroWaveMemoryHolder(){return;};
LitroWaveMemoryHolder.prototype = {
	init: function(){
		this.waveMemories = [];
		this.indexName = {};
		
	},
	
	initBasicWave: function(){
		var len = LitroWaveMemory.SAMPLE_BUFFER
			, mask = LitroWaveMemory.QUANTIZATION_MASK
			, len1 = (len / 2), len2 = (len / 4), len3 = (len / 6), len4 = (len / 8)
			, wave1 = [], wave2 = [], wave3 = [], wave4 = [], i, tri = []
			, noiseFunc
			;
		this.waveMemories = [];
		this.indexName = {};
		for(i = 0; i < len; i++){
			wave1.push(i < len1 ? mask : 0);
			wave2.push(i < len2 ? mask : 0);
			wave3.push(i < len3 ? mask : 0);
			wave4.push(i < len4 ? mask : 0);
		}
		this.append(wave1, 'square/2', 1);
		this.append(wave2, 'square/4', 1);
		this.append(wave3, 'square/6', 1);
		this.append(wave4, 'square/8', 1);
		
		this.append([8, 9, 10, 11, 12, 13, 14, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5, 6, 7], 'triangle/2', 1.5);
		this.append([8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15, 15, 14, 14, 13, 12, 12, 11, 10, 10, 9, 8, 8, 6, 4, 2, 0, 1, 3, 5, 7], 'triangle/4', 1.5);
		this.append([8, 8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 14, 15, 15, 14, 14, 13, 13, 12, 11, 11, 10, 9, 9, 8, 8, 6, 3, 0, 2, 4, 7], 'triangle/6', 1.5);
		this.append([8, 8, 9, 9, 10, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 14, 14, 13, 13, 12, 12, 11, 10, 10, 9, 9, 8, 8, 4, 0, 3, 6], 'triangle/8', 1.5);
		
		this.append([8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7], 'sawtooth/2', 1.2);
		this.append([8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 0, 1, 2, 3, 4, 5, 6, 7], 'sawtooth/4', 1.2);
		this.append([8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 0, 1, 3, 4, 6, 7], 'sawtooth/6', 1.2);
		this.append([8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14, 15, 15, 15, 15, 0, 2, 5, 7], 'sawtooth/8', 1.2);
		
		noiseFunc = function(data, channel, type){
			var i = 0
			, p = LitroWaveChannel.noiseParam
			, clock = p.clock, reg = p.reg, pvol = p.volume
			, len = data.length, wlen = channel.waveLength
			;
			//p.shortType = type; //短周期タイプ
			for(i = 0; i < len; i++){
				if(clock++ >= wlen){
					reg >>= 1;
					reg |= ((reg ^ (reg >> type)) & 1) << 15;
					pvol = (reg & 1) * WAVE_VOLUME_RESOLUTION;
					clock = 0;
					// console.log(reg);
				}
				data[i] = pvol;
			}
			
			p.reg = reg; p.clock = clock; p.volume = pvol;
			// p.halfLength = hlen;
			// console.log(data.length);
			return data;
		};
		
		this.append(function(data, channel){return noiseFunc(data, channel, 1)}, 'noise/1', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 6)}, 'noise/6', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 12)}, 'noise/12', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 15)}, 'noise/15', 1);
	},
	
	append: function(data, name, offset){
		var m = new LitroWaveMemory();
		m.init(data, name, offset);
		this.indexName[name] = this.waveMemories.length;
		this.waveMemories.push(m);
	},
	
	memory: function(index){
		if(index >= this.waveMemories.length){return null;}
		return this.waveMemories[index];

		// return data.func == null ? data.data : data.func(data.data);
	},
};

// var start = function() {
// };

var change = function(){
	litroAudio.changeWave();
	// console.log(litroAudio.mode);
	litroAudio.mode = (litroAudio.mode + 1) % 4;
};

function maxFreq()
{
	return KEY_FREQUENCY[KEY_FREQUENCY.length - 1][KEY_FREQUENCY[KEY_FREQUENCY.length - 1].length - 1];
}
function minFreq()
{
	return KEY_FREQUENCY[0][0];
}

function maxWavlen()
{
	return litroSoundInstance.maxWavlen;
}
function minWavlen()
{
	return litroSoundInstance.minWavlen;
}
function freqByKey(key){
	return KEY_FREQUENCY[(key / KEY_FREQUENCY[0].length) | 0][key % KEY_FREQUENCY[0].length];
}


//call at 60fps
function litroSoundMain()
{
	// litroSoundInstance.checkPerformance();
	// var ch;
	// for(ch = 0; ch < CHANNELS_NUM; ch++){
		// litroSoundInstance.refreshWave(ch);
	// }
	// if(litroSoundInstance.channel != null){
		// printDebug(litroSoundInstance.channel[0].waveClockPosition, 1);
		// printDebug(litroSoundInstance.channel[0].absorbPosition, 0);
		// , this.waveClockPosition, this.absorbPosition
	// }
	// litroPlayerInstance.playSound();
};


