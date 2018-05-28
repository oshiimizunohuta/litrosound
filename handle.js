/**
 * Litro Sound Library
 * Since 2013-11-19 07:43:37
 * @author しふたろう
 * ver 0.12.00
 */
var LITROSOUND_VERSION = '0.12.00';

var SAMPLE_RATE = 44100;//readonly
// var CHANNEL_BUFFER_SIZE = 48000;
var BUFFER_FRAMES = 60;
// var BUFFERS = 2;
var FRAME_RATE = 60;
var WAVE_VOLUME_RESOLUTION = 15;
var CHANNELS_NUM = 8;
// var VOLUME_TEST = 0.4;
var VOLUME_TEST = 0.4;
var VOLUME_CELLSIZE = 0.01 / Math.pow(WAVE_VOLUME_RESOLUTION, 2);
var VOLUME_MASTER = VOLUME_CELLSIZE * 40;
var litroSoundInstance = null;

var OCTAVE_MAX = 7;

var DEFAULT_NOTE_LENGTH = 800; //ms

var LitroKeyboardControllChar = [
['q', 81],['2', 50],['w', 87],['3', 51],['e', 69],['r', 82],['5', 53],['t', 84],['6', 54],['y', 89],['7', 55],['u', 85],['i', 56],['9', 73],['o', 57],['0', 79],['p', 80],
['z', 90],['s', 83],['x', 88],['d', 68],['c', 67],['v', 86],['g', 71],['b', 66],['h', 72],['n', 78],['j', 77],['m', 75],[',', 188],['l', 76],['.', 190],[';', 187],['/', 191],
];

var KEY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];


function makeLitroPlayerHandle(name, handle){
	var h = new LitroPlayerHandle();
	h.init(name, handle);
	handle.players.push(h);
	return h;
}
function LitroPlayerHandle() {
	return;
}
LitroPlayerHandle.prototype = {
	init: function(name, handle){
		this.handle = handle;
		this.name = name;
		this.systemTime = 0;
		this.playSoundFlag = false;
		this.message = {};
		this.messageCallback = {};
		this.messageFailedFunc = {};
		this.onPlayFunc = function(){return;};
		this.onStopFunc = function(){return;};
		this.onFadeEndFunc = function(){return;};
	},
	
	postApi: function(apifunc, args, callback, failedfunc){
		var p = {}, handle = this.handle;
		p.player = {name: this.name, func: apifunc, args: args};
		handle.workletNode.port.postMessage(p);
		if(this.messageCallback[this.name] == null){
			this.messageCallback[this.name] = {};
		}
		this.messageCallback[this.name][apifunc] = callback;
		if(this.messageFailedFunc[this.name] == null){
			this.messageFailedFunc[this.name] = {};
		}
		if(this.message[this.name] == null){
			this.message[this.name] = {};
		}
		
		this.messageFailedFunc[this.name][apifunc] = failedfunc;
	},
	
	postProperties: function(propkey, params){
		var p = {}, handle = this.handle;
		p.player = {name: this.name, key: propkey, params: params};
		handle.workletNode.port.postMessage(p);
		
	},
	
	playForKey: function(key){
		this.systemTime = performance.now();
		this.handle.context.resume();
		this.postApi(null, [this.systemTime]);
		this.postApi('playForKey', [key]);
		this.playSoundFlag = true;
	},
	stop: function(toggle)
	{
		this.postApi('stop', [toggle]);
		this.systemTime = performance.now();
		this.postApi(null, [this.systemTime]);
//		this.resetFadeChannel();
		this.systemTime = performance.now();
		this.playSoundFlag = false;
//		this.finishChannelEnvelope();
		
		this.onStopFunc();

	},
	fadeout: function(time, func)
	{
//		this.resetFadeChannel();
		this.onFadeEndFunc = func == null ? function(){return;} : func;
		if(!this.isPlay()){
			func();
		};
		this.postApi('fadeout', [time]);
//		this.fadeStart = this.systemTime;
//		this.fadeEnd = this.fadeStart + time;
//		this.fadeDiff = this.fadeEnd - this.fadeStart;
//		this.fadeMode = -1;
	},
	
	fadein: function(title, time, func)
	{
		if(title == null){
			this.play();
		}else{
			this.playForKey(title);
		}
//		this.resetFadeChannel();
		this.onFadeEndFunc = func == null ? function(){return;} : func;
		this.postApi('fadein', [title, time]);
		
//		this.fadeStart = this.systemTime;
//		this.fadeEnd = this.fadeStart + time;
//		this.fadeDiff = this.fadeEnd - this.fadeStart;
//		this.fadeMode = 1;
	},
	onFadeFinish: function(p){
//		var seek = this.noteSeekTime;
//		if(this.fadeMode == -1){
//			this.stop();
//		}
//		this.fadeMode = 0;
		this.onFadeEndFunc(p);
//		this.resetFadeChannel();
	},	
	volume: function(vol){
		var sTime, gain = this.handle.gain.gain;
		if(vol != null){
			vol = vol < 0 ? 0 : vol;
			sTime = this.handle.context.currentTime;
			gain.value = vol;
			// gain.cancelScheduledValues(sTime);
			// gain.setValueAtTime(gain.value, sTime);
			// gain.setTargetAtTime(vol, sTime, 0);
		}else{
			vol = gain.value;
		}
		
	},
	isPlay: function(name){
		return this.playSoundFlag;
	},
	
	loadPack: function(user_id, query, successFunc, errorFunc)
	{
		var self = this;
		this.loadPlayPack(user_id, query, function(data){
			self.postApi('setPlayDataFromPackIndex', [0]);
			if(successFunc != null){successFunc(data);}
		}, errorFunc);
	},
	
	loadPlayPack: function(user_id, pack_query, func, errorFunc)
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
			if(data == null || data == false){
				errorFunc(data);
				return;
			}
			self.postApi('appendPack', [data]);
			
			func(packFiles);
		}, errorFunc);
			
	},
	
};


function LitroHandle() {
	return;
}
var testval = 0;
LitroHandle.version = LITROSOUND_VERSION;
LitroHandle.prototype = {
	init : function(channelNum) {
		var  self = this
			, callback = {} //init完了後コールバック
		;
		channelNum = channelNum == null ? CHANNELS_NUM : channelNum;
		this.isFirefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) ? true : false;
		this.channel = [];
		this.channel.length = channelNum;
		// this.channel_s = [];
		// this.channel_s.length = channelNum;
		
		// this.players = {};
		this.players = [];
		this.frameRate = FRAME_RATE;
		this.sampleRate = 0;

		litroSoundInstance = this;
		this.masterVolume = VOLUME_MASTER; //VOLUME_TEST;
		this.WAVE_VOLUME_RESOLUTION = 15; //波形データのボリューム分解能
		this.outputBuffer = [];
		this.scriptProcess = null;
		this.gain = null; //ゲイン
		this.analyser = null; //波形分析
		this.source = null; //※重要バッファ
		this.setChannelEventFunc = function(){return;};
		this.onNoteKeyEventFunc = function(){return;};
		this.offNoteKeyEventFunc = function(){return;};
		this.fadeoutEventFunc = function(){return;};
		
		this.message = {};
		this.messageCallback = {};
		this.messageFailedFunc = {};
		
		window.performance = window.performance == null ? window.Date : window.performance;
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		if(window.AudioContext == null){
			console.log("this browser can't AudioContext!! ");
			return;
		}
		// this.context = new AudioContext();
		this.createContext();

		if(this.context.audioWorklet == null){
			return false;
		}
		this.worklet = this.context.audioWorklet.addModule('./litrosound/processor.js').then(function(){
			var node = new AudioWorkletNode(self.context, 'main-processor')
			;
			self.workletNode = node;
			self.connectModules();
			
			callback.ready();
		});

		callback = {ready: function(){}};
		return callback;
		// 出力開始
		// src.noteOn(0);
	},
	
	engine: function(apifunc, args, callback, failedfunc){
		this.workletNode.port.postMessage({engine: {func: apifunc, args: args}});
	},
	
	postProperties: function(propkey, params){
		var p = {}, handle = this.handle;
		p.engine = {key: propkey, params: params};
		this.workletNode.port.postMessage(p);
		
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
	
	processorMessage: function(data){
		var key, plname, i, func, args;
		if(data.player != null){
			key = data.player.key;
			plname = data.player.name;
			
			for(i = 0; i < this.players.length; i++){
				if(this.players[i].name == plname && data.player.func != null){
					func = data.player.func;
					args = data.player.args;
					if(args == null){
						this.players[i][func]();
					}else if(args.length == 1){
						this.players[i][func](args[0]);
					}else if(args.length == 2){
						this.players[i][func](args[0], args[1]);
					}else if(args.length == 3){
						this.players[i][func](args[0], args[1], args[2]);
					}else if(args.length == 4){
						this.players[i][func](args[0], args[1], args[2], args[3]);
					}
					break;
				}else if(this.players[i].name == plname && data.player.key != null){
					this.players[i][data.player.key] = data.player.value;
					break;
				}
			}
			return;
			if(this.message[plname] != null && this.message[plname][key] != null){
				this.message[plname][key] = data.player.value;
			}
			if(this.messageCallback[plname] != null && this.messageCallback[plname][key] != null){
				this.messageCallback[plname][key](this.message[plname][key]);
			}
			if(this.messageFailedFunc[plname] != null && this.messageFailedFunc[plname][key] != null){
				this.messageFailedFunc[plname][key](this.message[plname][key]);
			}
		}
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
//		if(this.context == null){this.context = new AudioContext();}
		if(this.context == null){
			this.context = new AudioContext({
				latencyHint: 'interactive',
				sampleRate: SAMPLE_RATE,
			});
		}
		// context.sampleRate = rate; //read only
		
		this.sampleRate = this.context.sampleRate; //
//		console.log(this.sampleRate)
	},
	
	connectModules: function(size)
	{
		var src, self = this, vol, node
			, context = this.context;
		//ゲイン
		if(this.gain != null){
			vol = this.gain.gain.value;
		}
		this.gain = null;
		this.gain = context.createGain();
		this.gain.gain.value = vol == null ? this.masterVolume : vol;
		this.gain.connect(context.destination);
		
		//iOSで必須！！
		this.source = this.context.createBufferSource();
//		this.source.connect(scriptProcess);
		this.source.start(0);
		
		//プロセスはworkletmodule
		this.workletNode.connect(self.gain);
		this.source.connect(this.workletNode);
		this.workletNode.port.onmessage = function(e){
			self.processorMessage(e.data);
		};
		this.workletNode.port.postMessage({init: {sample_rate: context.sampleRate}});
		this.postProperties('sampleRate', this.sampleRate);
		
		// this.source.playbackRate = 8;
		//解析
		this.analyser = null;
		this.analyser = this.context.createAnalyser();
		this.analyser.fft = 512;
//		scriptProcess.connect(this.analyser);
//gain が解析元
		this.gain.connect(this.analyser);
		
	},
	
	connectOn: function()
	{
		this.connectOff();
		this.connectModules();
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

	str = "LitroSound:" + LitroHandle.version + "\n"
	 + "LitroPlayer:" + LitroPlayerHandle.version + "\n"
	 + "LitroAudioParams:" + LitroWaveChannel.paramsVersion;
	console.info(str);
}

var TITLE_MAXLENGTH = 32;

function makeLitroElement(type, time, value)
{
	return {type: type != null ? type : 'null', time: time != null ? time : 0, value: value != null ? value : 0};
};



var APIServer = {url: null};
function initAPIServer(apiUrl)
{
	APIServer.url = apiUrl;
};
function sendToAPIServer(method, api, params, func, errorFunc)
{
	var str, query = [], key, x = new XMLHttpRequest();
	if(APIServer.url == null){console.error('not initialize api server'); return;}

	x.timeout = 5000;
	
	x.onload = func != null ? function () {
		var j;
		if (x.readyState === 4) {
			if (x.status === 200) {
				try{
					j = x.responseText;
					j = typeof j == 'string' ? JSON.parse(j) : '';
				}catch(e){
					j = null;
				}
				func(j);
			} else {
				console.error(x.statusText);
			}
		}
	} : function () {
		return false;
	};
	
	if(errorFunc != null){
		x.ontimeout = function(e){
			errorFunc(e);
			return false;
		};
		x.onerror = function(e){
			errorFunc(e);
			return false;
		};
		x.onabort = function(e){
			errorFunc(e);
			return false;
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

function LITROSOUND(user, bgmpack, sepack, func, errorFunc){
	var soundEngin
		, sePlayer, bgmPlayer
		, ltsnd = {engin: soundEngin, se: sePlayer, bgm: bgmPlayer}
		, initRes
	;
//	window.addEventListener('load', function(){
		ltsnd.engine = new LitroHandle();
		initRes = ltsnd.engine.init();
		if(!initRes){
			return initRes;
		}
		initRes.ready = function(){
			ltsnd.engine.setTouchOuth('body');
			ltsnd.se = makeLitroPlayerHandle('se', ltsnd.engine);
			ltsnd.bgm = makeLitroPlayerHandle('bgm', ltsnd.engine);

	//		ltsnd.se.init('se');
	//		ltsnd.bgm.init('bgm');
			ltsnd.bgm.loadPack(user, "name:" + bgmpack, function(){
				if(sepack != null){
					ltsnd.se.loadPack(user, "name:" + sepack, function(){
						func(ltsnd);
					});
				}else{
					func(ltsnd);
				}
			}, function(){
				errorFunc(ltsnd);
			});
		};
//	}, false);
	
	return ltsnd;
	
}

function LTSNDFULL(user, bgmpack, sepack, func, errorFunc){
	var soundEngin
		, sePlayer, bgmPlayer
		, ltsnd = {engine: soundEngin, se: sePlayer, bgm: bgmPlayer}
	;
//	window.addEventListener('load', function(){
		ltsnd.engine = new LitroSound();
		ltsnd.engine.init();
		ltsnd.engine.setTouchOuth('body');
		ltsnd.se = new LitroPlayer();
		ltsnd.bgm = new LitroPlayer();
		
		ltsnd.se.init('se');
		ltsnd.bgm.init('bgm');
		ltsnd.bgm.loadPack(user, "name:" + bgmpack, function(){
			if(sepack != null){
				ltsnd.se.loadPack(user, "name:" + sepack, function(){
					func(ltsnd);
				});
			}else{
				func(ltsnd);
			}
		}, function(){
			errorFunc(ltsnd);
		});
//	}, false);
	
	return ltsnd;
	
}

function LTSND(user, pack, func, errorFunc){
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
		ltsnd.se.loadPack(user, "name:" + pack, function(){
			func(ltsnd);
		}, function(){
			errorFunc(ltsnd);
		});
	}, false);
	
	return ltsnd;
}

//call at 60fps
function litroSoundMain()
{
	return;
};


