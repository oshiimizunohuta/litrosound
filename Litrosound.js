/**
 * Litro Sound Library
 * Since 2013-11-19 07:43:37
 * @author しふたろう
 * ver 0.11.06
 */
var LITROSOUND_VERSION = '0.11.05';

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
var MIN_CLOCK = MILLI_SECOND / FRAME_RATE; //EnvelopeMinimumClock
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
		channelNum = channelNum == null ? CHANNELS_NUM : channelNum;
		this.isFirefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) ? true : false;
		this.channel = [];
		this.channel.length = channelNum;
		// this.channel_s = [];
		// this.channel_s.length = channelNum;
		
		// this.players = {};
		this.players = [];
		this.frameRate = FRAME_RATE;
		// this.milliSecond = this.isFirefox ? 1100 : 1000;//firefox : chrome
		this.milliSecond = MILLI_SECOND;//firefox : chrome
		this.minClock = MIN_CLOCK; //ノート単位クロック
		this.sampleRate = 0;
		this.refreshRate = 0; //init
		this.refreshClock = 0;
		this.clockRate = 1.00;
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
		
		var agent, src, i, data, buf
			, self = this
		;
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
		
		this.connectModules(PROCESS_BUFFER_SIZE);

		// 出力開始
		// src.noteOn(0);
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
		
		this.buffer0Array = new Float32Array(PROCESS_BUFFER_SIZE);
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
	
	setTouchOuth: function(eQuery)
	{
		var e, type = typeof eQuery, self = this;
		if(type == 'string'){
			e = document.querySelectorAll(eQuery);
		}else{
			e = type == 'array' ? eQuery : [eQuery];
		}
		
		function onoff(){
			self.connectOff();
			self.connectOn();
			Array.prototype.map.call(e, function(elm){
				elm.removeEventListener('touchstart', onoff, false);
			});
		}
		Array.prototype.map.call(e, function(elm){
			elm.addEventListener('touchstart', onoff, false);
		});
	},

	bufferProcess: function(ev)
	{
		var i, ch
			, players = [], player, pl
			, data = ev.outputBuffer.getChannelData(0), channel, chdata, avol
			, dlen = data.length, clen = CHANNELS_NUM, plen = this.players.length
			, rate = this.refreshRate, rCrock = this.refreshClock, cRate = this.clockRate
			// , d0 = new Float32Array(ev.outputBuffer.length)
			;
			// console.log(channels.length);
		if(!this.checkPerformance(ev)){
			this.clearBuffer(ev);
			return;
		}
		for(pl = 0; pl < plen; pl++){
			players.push(this.players[pl].player);
		}
		
		data.set(this.buffer0Array);
		for(i = 0; i < dlen; i++){
			rCrock += cRate;
			if(rCrock >= rate){
				for(pl = 0; pl< plen; pl++){
					player = players[pl];
					player.playSound();
					for(ch = 0; ch < clen; ch++){
						player.refreshWave(ch);
						//startEnv
						//
					}
				}
				rCrock = 0;
			}
			for(ch = 0; ch < clen; ch++){
				chdata = 0;
				avol = 0;
				for(pl = 0; pl < plen; pl++){
					channel = players[pl].channel[ch];
					if(chdata == 0){
						chdata += channel.nextWave();
					}else{
						channel.skipWave();
					}
					if(channel.isAbsorbable()){
						avol += channel.absorbVolume();
					}
				}
				data[i] += chdata + avol;
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
LitroPlayer.version = '03.01';
//v02.03.01:tuneParamsID追加変更(paramsVer.0.2.0)
//v01.03.01:returnイベントはplayフラグが必須
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
		this.tmpEnable = false; //一時リスタートモード(編集用)
		this.enablePrestart = false; //仮
		this.name = name;
		
		this.setChannelEventFunc = function(){return;};
		this.onNoteKeyEventFunc =  function(){return;};
		this.offNoteKeyEventFunc =  function(){return;};
		
		this.onPlayFunc = function(){return;};
		this.onStopFunc = function(){return;};
		
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
			this.SERVER_URL = 'https://ltsnd.bitchunk.net/api';
		}else if(window.location.href.indexOf('localhost') >= 0){
			this.SERVER_URL = '//localhost:58104/api';	
		}else{
			this.SERVER_URL = 'https://ltsnd.bitchunk.net/api';
			// this.SERVER_URL = 'http://bitchunk.fam.cx/litrosound/api';
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
			// channel.refreshEnvelopeParams(MIN_CLOCK);
			channel.setFrequency(MIN_CLOCK);
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
	
	isFinishEnvelope: function(ch)
	{
		var clock = this.channel[ch].envelopeClock, env = this.getEnvelopes(ch)
		;
		if(clock >= env.attack + env.hold + env.decay + env.length + env.release){
			return true;
		}
		return false;
	},
	
	isNoises: function()
	{
		var noises = []
			, i, len = this.channel.length, ch;
		for(i = 0; i < len; i++){
			ch = i;
			noises.push(this.channel[ch].isNoiseType());
		}
		return noises;
	},
	
	getNoteKey: function(ch)
	{
		return this.channel[ch].noteKey;
	},	
	
	getChannel: function(ch, key)
	{
		return this.channel[ch].tuneParams[key];
	},
	
	getTuneParams: function(ch)
	{
		return this.channel[ch].tuneParams;
	},
	
	getEnvelopes: function(ch)
	{
		var channel = this.channel[ch];
		
		return channel.envelopes;
	},
	
	getVibratos: function(ch)
	{
		return this.channel[ch].vibratos(MIN_CLOCK);
	},
	
	getDelay: function(ch)
	{
		// this.getChannel(ch, 'delay', true) * 10;
		return this.channel[ch].tuneParams.delay * 10;
	},
	
	isSweepNotes: function(ch)
	{
		return this.channel[ch].sweepNotesOn;
	},
	
	envelopeWaveType: function(ch)
	{
		var channel = this.channel[ch]
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
	/**
	 *note target sweep
	 */
	setSweepNoteOn: function(ch, enable)
	{
		this.channel[ch].sweepNotesOn = enable;
		// console.log('set', ch);

	},
	
	//未使用？
	setWaveType: function(channelNum, type)
	{
		this.setChannel(channelNum, 'waveType', type);
	},
	
	setChannel: function(ch, key, value)
	{
		var channel = this.channel[ch]
			, prop =  LitroWaveChannel.tuneParamsProp
			, vibDist = prop.vibratodepth.max - prop.vibratodepth.min
			, vib
		;
		if(value > LitroWaveChannel.maxTune(key)){
			value = LitroWaveChannel.minTune(key);
		}else if(value < LitroWaveChannel.minTune(key)){
			value = LitroWaveChannel.maxTune(key);
		}
		channel.tune(key, value);
		channel.refreshEnvelopeParams(MIN_CLOCK);
		
		//仮
		if(this.isSweepNotes(ch)){
			channel.skipEnvelope();
		}
		
		vib = channel.vibratos(MIN_CLOCK);
		if(key == 'sweep'){
			if(channel.waveLength > 0){
				// this.setFrequency(ch, Math.round(this.litroSound.sampleRate / channel.waveLength) | 0);
				channel.setFrequency(Math.round(this.litroSound.sampleRate / channel.waveLength) | 0);
			}
			channel.sweepClock = 1;
			channel.sweepRateMin = maxWavlen() / Math.exp(value *  prop.sweep.min * 0.001);
			channel.sweepRateMax = maxWavlen() / Math.exp(value *  prop.sweep.max * 0.001);
		}else if(key == 'vibratophase'){
			channel.vibratophaseRate = vib.vibratophase * 180 / vibDist;
		}else if(key == 'vibratodepth'){
			channel.vibratodepthRate  = vib.vibratodepth / vibDist;
		}else if(key == 'vibratospeed'){
			channel.vibratospeedRate = (Math.PI / 180) * 180 / vib.vibratospeed;
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
			this.channel[ch].endEnvelope();
			this.channel[ch].clearWave();
			this.channel[ch].absorbVolumeSource = 0;
			this.channel[ch].waveLength = 0;
		}
	},
	
	// execper1/60fps
	refreshWave: function (channelNum)
	{
		var i, sumFreq, phase
		, wavLen, vibLen, sweepLen//, sumLen
		, channel = this.channel[channelNum]
		, data = channel.data
		, vib = this.getVibratos(channelNum, true)
		, vibriseClock = channel.vibratoClock - vib.vibratorise
		, sweep = this.getChannel(channelNum, 'sweep', true)
		, enable = channel.isEnable()
		, abst = 0, startTrig = false, endTrig = false
		, pls_l, pls_r
		;

		//立ち上がり
		if(channel.envelopeStart && channel.envelopeClock == 0 && !channel.envelopeEnd && enable){
			abst = channel.data[channel.waveClockPosition];
			channel.startEnvelope();
			startTrig = true;
		}
		//立ち下がり
		else if(this.isFinishEnvelope(channelNum) && !channel.envelopeEnd && enable){
			abst = channel.data[channel.waveClockPosition];
			channel.endEnvelope();
			this.offNoteKeyEventFunc(channelNum.id, channel.noteKey);
			this.clearSweepNotes(ch);
			this.setSweepNoteOn(ch, false);
			endTrig = true;
		}
		
		channel.prevLength = channel.waveLength;

		wavLen = channel.staticWaveLength;
		sweepLen = sweep == 0 ? 0 
							: sweep > 0 ? -channel.sweepClock * channel.sweepRateMax
							: channel.sweepClock * channel.sweepRateMin;

		phase = channel.vibratophaseRate;
		swnotesRate = channel.sweepNotesRate * channel.sweepNotesClock;

		vibLen = vibriseClock < 0 || vib.vibratospeed == 0 ? 0 : (wavLen * channel.vibratodepthRate)
		 			* Math.sin((vibriseClock + phase) * channel.vibratospeedRate);
		// sumLen = sweepLen + vibLen;
		// channel.waveLength = (wavLen + sweepLen + vibLen + channel.sweepNotesRate) | 0;
		channel.setWaveLength(wavLen + sweepLen + vibLen + swnotesRate);
		channel.setWaveLength(channel.waveLengthFloat > maxWavlen() ? maxWavlen() : channel.waveLengthFloat);
		channel.setWaveLength(channel.waveLengthFloat < minWavlen() ? minWavlen() : channel.waveLengthFloat);

		//Test flow pattern
		channel.setMemory(this.memoryHolder.memory(this.envelopeWaveType(channelNum)));
		channel.applyWaveMemory();
		
		if(endTrig){
			channel.restartAbsorbVolume(abst, 0);
		}else if(startTrig){
			channel.restartAbsorbVolume(abst, channel.data[channel.waveClockPosition]);
		}
		//Test flow pattern end

		if(!channel.envelopeEnd && channel.envelopeStart){
			channel.envelopeClock++;
			channel.detuneClock++;
			channel.sweepClock++;
			channel.vibratoClock++;
			channel.sweepNotesClock++;
		}
	},
	
	
	onNoteKey: function(ch, key)
	{
		// console.log(codenum + ' ' + octave);
		var channel = this.channel[ch], freq = freqByKey(key)
		;
		channel.noteKey = key;
		// console.log(channel.envelopeClock, this.isFinishEnvelope(ch));
		// if(this.isSweepNotes(ch) && !this.isFinishEnvelope(ch)){
		if(this.isSweepNotes(ch) && !channel.envelopeEnd){
			// console.log(channel.envelopeClock, this.isFinishEnvelope(ch));
			return;
		}
		
		channel.envelopeClock = 0;
		channel.detuneClock = 0;
		channel.sweepClock = 0;
		channel.vibratoClock = 0;
		// channel.sweepNotesClock = 0;
		channel.dataUpdateFlag = true;
		channel.resetEnvelope();
		this.onNoteKeyEventFunc(ch, key);
		
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
		channel.sweepNotesClock = 0;
		channel.dataUpdateFlag = true;
		channel.resetEnvelope();
		this.refreshWave(ch);
		
		// console.log("onN", channel.absorbPosition, channel.waveClockPosition);
		// this.setFrequency(ch, freq);
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
		this.skiptoReleaseClock(channelNum);
	},
	
	skiptoReleaseClock: function(ch)
	{
		var env = this.getEnvelopes(ch)
			, clock = env.decay + env.length
			, channel = this.channel[ch]
		;
		channel.envelopeClock = channel.envelopeClock < clock ? clock : channel.envelopeClock;
		channel.envelopeClock += 0.1; //立ち上がり調整防止
	},
	
	clearSweepNotes: function(ch)
	{
		var channel = this.channel[ch];
		if(channel.sweepNotesTarget != null){
		// console.log('clear', ch, channel.sweepNotesTarget);
			channel.setFrequency(channel.sweepNotesTarget);
			channel.sweepNotesBase = null;
			channel.sweepNotesTarget = null;
			channel.sweepNotesRate = 0;
			channel.sweepNotesClock = 0;
		}
	},
	
	refreshSweepNotes: function(ch)
	{
		var channel = this.channel[ch]
		, baseNote, targetNote
		, sample = this.litroSound.sampleRate
		, delay = this.getDelay(ch)
		;
		
		if(!this.isSweepNotes(ch)){
			return;
		}
		baseNote = this.searchNearBack(ch, this.noteSeekTime - delay, 0, 'note');
		targetNote = this.searchNearForward(ch, this.noteSeekTime - delay, -1, 'note', baseNote);
		// console.log(ch, this.noteSeekTime, baseNote, targetNote);
		if(baseNote == null || targetNote == null){
			this.clearSweepNotes(ch);
			return;
		}
		channel.sweepNotesBase = freqByKey(baseNote.value);
		channel.sweepNotesTarget = freqByKey(targetNote.value);
		channel.sweepNotesRate = ((sample / channel.sweepNotesTarget) - (sample / channel.sweepNotesBase)) / (targetNote.time - baseNote.time);
		channel.sweepNotesClock = 0;
		channel.setFrequency(channel.sweepNotesBase);
		//staticwavelengthの更新が必須(要setfrequency)
		// channel.setWaveLength(sample / channel.sweepNotesBase);
		// console.log(channel.staticWaveLength, channel.waveLength);
		// console.log(sample / channel.sweepNotesBase, channel.sweepNotesRate);
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
	
	loadPack: function(user_id, query, successFunc, errorFunc)
	{
		var self = this;
		this.playPack.loadPack(user_id, query, function(data){
			self.setPlayDataFromPackIndex(0);
			if(successFunc != null){successFunc(data);}
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
	
	eventPlay: function(elementQuery, type, key)
	{
		var i, elements = document.querySelectorAll(elementQuery)
			, self = this
		;
		for(i = 0; i < elements.length; i++){
			elements[i].addEventListener(type, function(){
				self.playForKey(key);
			}, false);
		}
	},
	
	setOnPlayFunc: function(func)
	{
		this.onPlayFunc = func;
	},
	
	setOnStopFunc: function(func)
	{
		this.onStopFunc = func;
	},
	
	play: function()
	{
		this.systemTime = performance.now();
		this.playSoundFlag = true;
		this.delayEventset = makeEventsetData();
		this.finishChannelEnvelope();
		// for(var i = 0; i < this.channel.length; i++){
			// this.channel[i].refChannel = this.channel[i].id;
		// }
		//TODO connectリセット処理が必要かも
		// litroSoundInstance.connectOff();
		// litroSoundInstance.connectOn();
				
		this.onPlayFunc();
	},
	
	stop: function(toggle)
	{
		this.systemTime = performance.now();
		this.playSoundFlag = false;
		this.delayEventset = makeEventsetData();
		this.finishChannelEnvelope();
		
		this.onStopFunc();

	},
	
	finishChannelEnvelope: function(){
		var i, channel = this.channel;
		for(i = 0; i < channel.length; i++){
			channel[i].skipEnvelope();
			this.setSweepNoteOn(i, false);
			this.clearSweepNotes(i);
		}
	},
	
	volume: function(vol)
	{
		var sTime, gain = this.litroSound.gain.gain;
		if(vol != null){
			vol = vol < 0 ? 0 : vol;
			sTime = this.litroSound.context.currentTime;
			// console.log(gain.value, sTime);
			gain.value = vol;
			// gain.cancelScheduledValues(sTime);
			// gain.setValueAtTime(gain.value, sTime);
			// gain.setTargetAtTime(vol, sTime, 0);
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
		var tuneProp = LitroWaveChannel.tuneParamsProp
			, restart
			;
		if(type == 'note'){
			this.onNoteKey(ch, value);
			this.refreshSweepNotes(ch);
		}else if(type == 'event'){
			switch(value){
				case tuneProp['return'].id:
					restart = this.commonEventTime('restart');
					if(this.playOnce || (restart == -1)){
						this.stop();
						return true;
					}
					if(!this.isPlay()){
						return true;
					}
					
					this.seekMoveBack(-1);
					this.seekMoveForward(this.commonEventTime('restart'));
					this.delayEventset = makeEventsetData();
					this.restartEvent();
					return true;
					
				case tuneProp.tmpend.id:
					if(!this.tmpEnable){
						return true;
					}
					this.seekMoveBack(-1);
					this.seekMoveForward(this.commonEventTime('tmpstart'));
					this.delayEventset = makeEventsetData();
					this.restartEvent();
					return true;
					
				case tuneProp.sweepnotes.id:
					this.setSweepNoteOn(ch, true);
					break;
				case tuneProp.meeknotes.id:
					// this.setSweepNoteOn(ch, false);
					break;
				case tuneProp.noteoff.id: this.fadeOutNote(ch); break;
				case tuneProp.noteextend.id: this.extendNote(ch); break;
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
			, delay = this.getDelay(ch);
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
			if(!this.isPlay()){
				return;
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
	
	setSeekPosition: function(ftime)
	{
		this.noteSeekTime = ftime;
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
				if(ignore != null && ignore.time == eventset.time){
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

function makeLitroElement(type, time, value)
{
	return {type: type != null ? type : 'null', time: time != null ? time : 0, value: value != null ? value : 0};
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
	
	loadPack: function(user_id, pack_query, func, errorFunc)
	{
		var self = this
			, params = {pack_query: pack_query}
		;
		//both type user load
		if(typeof user_id == 'string'){
			params.account = user_id;
		}else{
			params.user_id = user_id;
		}
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(e){console.log('load pack error: ', e); return;} : errorFunc;
		if(pack_query == null){
			errorFunc({error_code: 0, message: 'no query'});
			return;
		}
		
		//data : {sound_id, ?}
		sendToAPIServer('GET', 'packload', params, function(data){
			var i
			, packFiles = self.packFiles
			, packTitles = self.packTitles
			, packIDs = self.packIDs
			, lp = new LitroSoundParser();
			if(data == null || data == false){
				errorFunc(data);
				return;
			}
			for(i = 0; i < data.length; i++){
				data[i].parseData = lp.parseDataStr(decodeURIComponent(data[i].data));
				packFiles.push(data[i]);
				packTitles.push(data[i].title);
				packIDs.push(data[i].sound_id);
			}
			
			func(packFiles);
			}, errorFunc);
			
	},
	
	packReceive: function(data)
	{
		var i
		, packFiles = this.packFiles
		, packTitles = this.packTitles
		, packIDs = this.packIDs
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
		
		// this.setPlayDataFromPackIndex(, 0);
		
		func(packFiles);	
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
			res[time] = makeLitroElement(type, time, value);
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
 * 02:diffsweep-id16, refstart1_8/refend1_8-id64_79
 * 01:hold-id132, decay-id133, sustain-id134, length-id135, release-id136,
 *  delay-id140, detune-id141, sweep-id150
 * waveTypeHold-id181, waveTypeDecay-id182
 * 00:初期
 */
LitroWaveChannel.paramsVersion = "02";

LitroWaveChannel.tuneParamsProp = {
	'void': {id: 0, max: 0, min: 0, 'default': 0},
	enable: {id: 1, max: 1, min: 0, 'default': 1},
	restart: {id: 2, max: Infinity, min: 0, 'default': 0},
	'return': {id: 3, max: Infinity, min: 0, 'default': 0},
	tmpstart: {id: 4, max: Infinity, min: 0, 'default': 0},
	tmpend:{id: 5, max: Infinity, min: 0, 'default': 0},
	noteon:{id: 6, max: Infinity, min: 0, 'default': 0},
	noteoff:{id: 7, max: Infinity, min: 0, 'default': 0},
	noteextend:{id: 8, max: Infinity, min: 0, 'default': 0},

	sweepnotes:{id: 16, max: Infinity, min: 0, 'default': 0}, //v0.2
	meeknotes:{id: 17, max: Infinity, min: 0, 'default': 0}, //v0.2
	
	refstart1:{id: 64, max: Infinity, min: 0, 'default': 0}, //v0.2
	refend1:{id: 65, max: Infinity, min: 0, 'default': 0},
	refstart2:{id: 66, max: Infinity, min: 0, 'default': 0},
	refend2:{id: 67, max: Infinity, min: 0, 'default': 0},
	refstart3:{id: 68, max: Infinity, min: 0, 'default': 0},
	refend3:{id: 69, max: Infinity, min: 0, 'default': 0},
	refstart4:{id: 70, max: Infinity, min: 0, 'default': 0},
	refend4:{id: 71, max: Infinity, min: 0, 'default': 0},
	refstart5:{id: 72, max: Infinity, min: 0, 'default': 0},
	refend5:{id: 73, max: Infinity, min: 0, 'default': 0},
	refstart6:{id: 74, max: Infinity, min: 0, 'default': 0},
	refend6:{id: 75, max: Infinity, min: 0, 'default': 0},
	refstart7:{id: 76, max: Infinity, min: 0, 'default': 0},
	refend7:{id: 77, max: Infinity, min: 0, 'default': 0},
	refstart8:{id: 78, max: Infinity, min: 0, 'default': 0},
	refend8:{id: 79, max: Infinity, min: 0, 'default': 0},

	'event': {id: 127, max: 255, min: 0, 'default': 0},
	note: {id: 128, max: 255, min: 0, 'default': 0},
	waveType:{id: 129, max: 15, min: 0, 'default': 0},

	enhance:{id: 130, max: 64, min: 0, 'default': 0}, //v0.2
	
	volumeLevel:{id: 131, max: 15, min: 0, 'default': 12},
	attack:{id: 132, max: 64, min: 0, 'default': 0},
	hold:{id: 133, max: 255, min: 0, 'default': 0}, //v0.1(v0.8)
	decay:{id: 134, max: 64, min: 0, 'default': 0},
	sustain:{id: 135, max: 15, min: 0, 'default': 10},
	length:{id: 136, max: 255, min: 0, 'default': 32},
	release:{id: 137, max: 255, min: 0, 'default': 0},
	
	delay:{id: 140, max: 255, min: 0, 'default': 0},
	detune:{id: 141, max: 127, min: -127, 'default': 0},
	sweep:{id: 150, max: 127, min: -127, 'default': 0},

	vibratospeed:{id: 160, max: 255, min: 0, 'default': 0},
	vibratodepth:{id: 161, max: 255, min: 0, 'default': 0},
	vibratorise:{id: 162, max: 255, min: 0, 'default': 0},
	vibratophase:{id: 163, max: 255, min: 0, 'default': 0},
	waveTypeAttack:{id: 180, max: 15, min: -1, 'default': -1},
	waveTypeHold:{id: 181, max: 15, min: -1, 'default': -1}, //v0.8
	waveTypeDecay:{id: 182, max: 15, min: -1, 'default': -1}, //v0.8
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
	
	"01":{
		volumeLevel:{id: 130, max: 15, min: 0},
		attack:{id: 131, max: 64, min: 0},
		hold:{id: 132, max: 255, min: 0},
		decay:{id: 133, max: 64, min: 0},
		sustain:{id: 134, max: 15, min: 0},
		length:{id: 135, max: 255, min: 0},
		release:{id: 136, max: 255, min: 0},
	},
};

LitroWaveChannel.commonTuneType = {
	restart: '',
	'return': '',
	tmpstart: '',
	tmpend: '',
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
	var k, keys = {}, props, verList, v;
	props = LitroWaveChannel.tuneParamsProp;
	for(k in props){
		keys[props[k].id] = k;
	}
	
	verList = Object.keys(LitroWaveChannel.diffListTuneParamsProp);
	verList.reverse();
	//ファイルバージョン差分対応
	
	if(paramsVersion == LitroWaveChannel.paramsVersion){
		return keys;
	}

	if(paramsVersion != null && !isNaN(parseInt(paramsVersion, 10))){
		if(verList.indexOf(paramsVersion) == -1){
			console.log("file version:" + paramsVersion + " -> unknown version");
			return keys;
		}
		for(v = 0; v < verList.length; v++){
			props = LitroWaveChannel.diffListTuneParamsProp[verList[v]];
			// props = props[paramsVersion];
			for(k in props){
				keys[props[k].id] = k;
			}
			if(verList[v] == paramsVersion){
				break;
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

function litroTuneProp(key)
{
	return LitroWaveChannel.tuneParamsProp[key];
}

LitroWaveChannel.prototype = {
	init:function(datasize, resolution){
		// console.log(this.data);
		this.id = null;
		// this.bufferSource = null;
		this.buffer = null;
		this.absorbVolumeSource = 0;
		this.absorbVolumeStart = 0;
		this.absorbVolumeEnd = 0;
		this.absorbVolumeDistance = 0;
		this.absorbPosition = 0;
		this.absorbCount = 0;
		this.absorbNegCount = 0;
		this.waveLength = 0;
		this.waveLengthFloat = 0;
		this.staticWaveLength = 0;
		this.refreshClock = 0;
		this.waveClockPosition = 0;
		this.preWaveClockPosition = 0;
		this.preWaveData = 0;
		this.detuneClock = 0;
		this.envelopeClock = 0;
		this.envelopeEnd = true;//初期大音量防止
		this.envelopeStart = false;
		this.sweepClock = 0;
		this.sweepRateMin = 0;
		this.sweepRateMax = 0;
		this.vibratoClock = 0;
		this.vibratophaseRate = 0;
		this.vibratodepthRate = 0;
		this.vibratospeedRate = 0;
		
		this.sweepNotesOn = false;
		this.sweepNotesBase = -1;//freq
		this.sweepNotesTarget = -1;//イニシャルは-1
		this.sweepNotesRate = 0;
		this.sweepNotesClock = 0;
		
		this.prevLength = 0;
		this.data = this.allocBuffer(datasize);
		this.blankBuffer = this.allocBuffer(datasize);

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
		this.memoryData = [];
		this.ABSORB_COEFFCIENT = 0.001;
		this.ABSORB_COUNT_MAX = (64 / this.ABSORB_COEFFCIENT) | 0;
		this.waveMemoryClockRate = 1;

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
		this.refreshEnvelopeParams(MIN_CLOCK);
		this.skipEnvelope();
		
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
		, channel = this
		// , vol = (1 / 2) / channel.WAVE_VOLUME_RESOLUTION  // +1 / -1 
		// , vol = 1 / channel.WAVE_VOLUME_RESOLUTION 
		, vol = 1 
		, clock = channel.envelopeClock
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
		clockRate = clockRate == null ? 1 : clockRate;
		var env = this.envelopes;
		return (env.attack + env.hold + env.decay + env.length + env.release) * clockRate;
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
		var memPos = this.waveClockPosition
		, preMemPos = this.preWaveClockPosition
		;
		if(freq == null || freq == 0){
			console.error('Illegal Freq value', freq);
			return;
		}
		// + (freq / 1028 * this.getChannel(ch, 'detune', true));
		this.frequency = freq;
		this.prevLength = this.staticWaveLength | 0;
		// this.setWaveLength(litroSoundInstance.context.sampleRate / this.frequency);
		this.setWaveLength(litroSoundInstance.context.sampleRate / this.frequency);
		this.staticWaveLength = this.waveLengthFloat;
		this.waveClockPosition = Math.round(this.waveClockPosition * this.waveLengthFloat / this.prevLength) | 0;
		this.preWaveClockPosition = (this.preWaveClockPosition * this.waveLengthFloat / this.prevLength) | 0;
				// if(this.id == 2)
		// console.log(this.waveClockPosition, memPos);
	
	},

//TODO staticWaveLengthも更新するべき？(する場合refreshWaveも調整必要あり)	
	setWaveLength: function(length)
	{
		var mem  = this.getMemory();
		this.waveLengthFloat = length;
		this.waveLength = Math.round(length) | 0;
		this.waveMemoryClockRate = mem == null ? 0 : (mem.length / this.waveLength);
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
	
	resetChannelParams: function(){
		var k, params = this.tuneParams;
		for(k in params){
			params[k] = LitroWaveChannel.tuneParamsProp[k].default;
		}
	},
	
	//Setter
	resetEnvelope: function()
	{
		this.envelopeClock = 0;
		this.envelopeEnd = false;
		this.envelopeStart = true;
		// this.resetAbsorbVolume(this.preWaveData, false);
		this.resetAbsorbVolume(this.preWaveData, false);
	},
	
	skipEnvelope: function()
	{
		// this.preWaveData = this.data[this.preWaveClockPosition];
		//TODO 検証
		// this.resetAbsorbVolume(this.preWaveData, true);
		
		this.envelopeClock = this.envelopeDistance() + 1;
		// litroSoundInstance.offNoteKeyEventFunc(this.id, this.noteKey);
	},
		
	clearWave: function(start, end)
	{
		 var i, r = this.data[this.waveLength - 1], len = end == null ? this.waveLength : end;
		for(i = (start == null ? 0 : start); i < len; i++){
			this.data[i] = 0;
		}
		return r;
	},
	
	startEnvelope: function(){
		//note立ち上がり
			this.setFrequency(freqByKey(this.noteKey));
			//TODO いらないかも
			this.clearWave(this.waveLength, this.prevLength);
	},
	
	endEnvelope: function(){
		//note立ち下がり
			this.envelopeEnd = true;
			this.dataUpdateFlag = false;
			this.envelopeStart = false;
			this.skipEnvelope();
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
	
	//TODO いらないんじゃ
	resetAbsorbVolume: function(volume, positive)
	{
		if(positive){
			this.absorbCount = 0;
		}else{
			this.absorbNegCount = 0;
		}
		this.absorbVolumeSource = volume;
	},
	
	restartAbsorbVolume: function(start, end)
	{
		this.absorbVolumeStart = start;
		this.absorbVolumeEnd = end;
		this.absorbVolumeDistance = end - start;
		this.absorbCount = 0;
	},
	
	absorbVolume: function(){
		return -this.absorbVolumeDistance * Math.exp(-this.ABSORB_COEFFCIENT * this.absorbCount++);
	},
	
	isAbsorbable: function(){
		return this.absorbCount < this.ABSORB_COUNT_MAX;
	},
	
	skipWave: function(){
		if(this.envelopeEnd == true || this.waveLength == 0){return 0;}
		var wpos = this.waveClockPosition, wlen = this.waveLength
		, detune = this.getDetunePosition()
		;

		this.preWaveClockPosition = wpos;
		this.preWaveData = this.data[(wlen + wpos + detune) % wlen];
		this.waveClockPosition = wpos + 1 < wlen ? wpos + 1 : 0;
		return 0;
	},
	
	nextWave: function(){
		if(this.envelopeEnd == true || this.waveLength == 0){return 0;}
		var vol
		, wpos = this.waveClockPosition, wlen = this.waveLength
		, detune = this.getDetunePosition()
		;

		if(wpos == 0){
			//mem.funcを持っていない場合実行しなくても良い
			this.applyWaveMemory();
		}
		vol = this.data[(wlen + wpos + detune) % wlen];
		this.preWaveClockPosition = wpos;
		this.preWaveData = vol;
		this.waveClockPosition = wpos + 1 < wlen ? wpos + 1 : 0;
		return vol;
	},
	
	applyWaveMemory: function()
	{
		var i
			, mem = this.getMemory()
			, vol = this.envelopedVolume()
			, data = this.data, len = this.waveLength, plen = this.prevLength
			, delta = this.waveMemoryClockRate
			, pos = 0
			, offvol = LitroWaveChannel.offsetVolume
			;
		vol *= this.getWaveOffsetRate();
		if(vol < 0){vol = 0;}
		for(i = 0; i < len; i++){
			data[i] = (mem[pos | 0] - offvol) * vol;
			pos += delta;
		}
		
		if(i < plen){
			data.set(this.blankBuffer.subarray(i, plen - 1), i);
		}
		
		// for(i; i < plen; i++){
			// data[i] = 0;
		// }
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
		
		this.append(function(data, channel){return noiseFunc(data, channel, 1);}, 'noise/1', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 6);}, 'noise/6', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 12);}, 'noise/12', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 15);}, 'noise/15', 1);
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

function LTSND(user, pack, func){
	var soundEngin
		, sePlayer, bgmPlayer
		, ltsnd = {engin: soundEngin, se: sePlayer, bgm: bgmPlayer}
	;
	window.addEventListener('load', function(){
		ltsnd.engin = new LitroSound();
		ltsnd.engin.init();
		ltsnd.engin.setTouchOuth('body');
		ltsnd.se = new LitroPlayer();
		ltsnd.bgm = new LitroPlayer();
		
		ltsnd.se.init('se');
		// bgmPlayer.init('bgm');
		ltsnd.se.loadPack(user, "name:" + pack, func(ltsnd));
	}, false);
	
	return ltsnd;
}


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
	return;
};


