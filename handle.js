/**
 * Litro Sound Library
 * Since 2013-11-19 07:43:37
 * @author しふたろう
 * ver 0.12.00
 */
import * as defines from './defines.js';
import * as ltsnd from './Litrosound.js';
import {litroTuneProp, LitroWaveChannel, LitroWaveMemory, LitroWaveMemoryHolder, freqByKey, maxFreq, minFreq, makeEventsetData, LitroSoundParser} from './defines.js';
for(let i in ltsnd){
	window[i] = ltsnd[i];
}

function makeLitroPlayerHandle(name, handle){
	let h = new LitroPlayerHandle(name, handle);
//	h.init(name, handle);
	handle.players.push(h);
	return h;
}
//function LitroPlayerHandle() {
//	return;
//}

class LitroPlayerHandle{

	constructor(name, handle){
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
		this.playPack = new LitroPlayPack();
		LitroPlayerHandle.APIServer = LitroPlayerHandle.APIServer == null ? {url: null} : LitroPlayerHandle.APIServer;

	}

	postApi(apifunc, args, callback, failedfunc){
		let p = {}, handle = this.handle;
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

	}
	postProperties(propkey, params){
		let p = {}, handle = this.handle;
		p.player = {name: this.name, key: propkey, params: params};
		handle.workletNode.port.postMessage(p);

	}
	appendPack(receivePacks){
		let packs = this.playPack, i
			, lp = new LitroSoundParser()
		;
		receivePacks = receivePacks instanceof Array ? receivePacks : [receivePacks];
		for(i = 0; i < receivePacks.length; i++){
			if(receivePacks[i].parseData == null){
				receivePacks[i].parseData = lp.parseDataStr(decodeURIComponent(receivePacks[i].data));
			}
			packs.packFiles.push(receivePacks[i]);
			packs.packTitles.push(receivePacks[i].title);
			packs.packIDs.push(receivePacks[i].sound_id);
		}
	}
	/*
	* Load system sounds
	* name: litrokeyboard
	*/
	loadSystemSound(sename, func, errorFunc)
	{
		//TODO packloadにさせるか考え中
		let self = this
			, params = {}
		;
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		if(sename == null){
			return;
		}

		params.sename = sename;

		LitroPlayerHandle.sendToAPIServer('GET', 'systemse', params, function(data){
			let i
			, packFiles = self.playPack.packFiles
			, packTitles = self.playPack.packTitles
			, packIDs = self.playPack.packIDs
			, lp = new LitroSoundParser();
			if(data == null || data == false){
				errorFunc(data);
			}
			for(i = 0; i < data.length; i++){
				data[i].parseData = lp.parseDataStr(decodeURIComponent(data[i].data));
				packFiles.push(data[i]);
				packTitles.push(data[i].title);
				packIDs.push(data[i].sound_id);
			}

			self.setPlayDataFromPackIndex(sename, 0);

			func(packFiles);
			}, errorFunc);
	}

	loadPack(user_id, query, successFunc, errorFunc)
	{
		let self = this;
		this.playPack.loadPack(user_id, query, function(data){
			self.setPlayDataFromPackIndex(0);
			if(successFunc != null){successFunc(data);}
		}, errorFunc);
	}

	packListFromServer(user_id, page, limit, func, errorFunc)
	{
		this.playPack.listFromServer(user_id, page, limit, func, errorFunc);
	}

	insertPack(pack)
	{
		let title, playdata;
		for(title in pack){
			playdata = pack[title];
			// playdata =
		}
		this.playPack = pack;
	}

	setPlayDataFromPackIndex(index)
	{
		let files = this.playPack.packFiles;
		if(files[index] == null){
			return false;
		}
		return this.postApi('setPlayData', [files[index]]);
	}

	setPlayDataFromPackForTitle(title)
	{
		let key, titles = this.playPack.packTitles
			, index = titles.indexOf(title)
		;
		if(index == -1){
			return false;
		}
		return this.setPlayDataFromPackIndex(index);
	}

	playForKey(key){
//		this.systemTime = performance.now();
//		this.handle.context.resume();
//		this.postApi(null, [this.systemTime]);
//		this.postApi('playForKey', [key]);
//		this.playSoundFlag = true;
		let res = false;
		if(!isNaN(key)){
			res = this.setPlayDataFromPackIndex(key);
		}else if(typeof key == 'string'){
			res = this.setPlayDataFromPackForTitle(key);
		}
		if(res == false){
			return false;
		}

		this.systemTime = performance.now();
		this.handle.context.resume();
		this.postApi(null, [this.systemTime]);
		this.postApi('play');
		this.playSoundFlag = true;
		return true;
	}
	stop(toggle)
	{
		this.postApi('stop', [toggle]);
		this.systemTime = performance.now();
		this.postApi(null, [this.systemTime]);
//		this.resetFadeChannel();
		this.systemTime = performance.now();
		this.playSoundFlag = false;
//		this.finishChannelEnvelope();

		this.onStopFunc();

	}
	fadeout(time, func)
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
	}

	fadein(title, time, func)
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
	}
	onFadeFinish(p){
//		let seek = this.noteSeekTime;
//		if(this.fadeMode == -1){
//			this.stop();
//		}
//		this.fadeMode = 0;
		this.onFadeEndFunc(p);
//		this.resetFadeChannel();
	}
	volume(vol){
		let sTime, gain = this.handle.gain.gain;
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
		return vol;
	}
	cvolume(vol){
		return this.volume(defines.VOLUME_CELLSIZE * vol);
	}
	isPlay(name){
		return this.playSoundFlag;
	}

//	loadPack(user_id, query, successFunc, errorFunc)
//	{
//		let self = this;
//		this.loadPlayPack(user_id, query, function(data){
//			self.postApi('setPlayDataFromPackIndex', [0]);
//			if(successFunc != null){successFunc(data);}
//		}, errorFunc);
//	}
//
//	loadPlayPack(user_id, pack_query, func, errorFunc)
//	{
//		let self = this
//			, params = {pack_query: pack_query}
//		;
//		//both type user load
//		if(typeof user_id == 'string'){
//			params.account = user_id;
//		}else{
//			params.user_id = user_id;
//		}
//		func = func == null ? function(){return;} : func;
//		errorFunc = errorFunc == null ? function(e){console.log('load pack error: ', e); return;} : errorFunc;
//		if(pack_query == null){
//			errorFunc({error_code: 0, message: 'no query'});
//			return;
//		}
//
//		//data : {sound_id, ?}
//		LitroPlayerHandle.sendToAPIServer('GET', 'packload', params, function(data){
//			let i
//			, packFiles = self.packFiles
//			, packTitles = self.packTitles
//			, packIDs = self.packIDs
//			if(data == null || data == false){
//				errorFunc(data);
//				return;
//			}
//			self.postApi('appendPack', [data]), function(){
//				self.playPack = self.postApi('appendPack', [data]);
//			};
//
//			func(packFiles);
//		}, errorFunc);
//
//	}

	static initLTSNDServer(apiUrl)
	{
		LitroPlayerHandle.initAPIServer(apiUrl);
	}

	static initAPIServer(apiUrl)
	{
		if(LitroPlayerHandle.APIServer == null){
			LitroPlayerHandle.APIServer = {url: null};
		}
		LitroPlayerHandle.APIServer.url = apiUrl;
	}

	static sendToAPIServer(method, api, params, func, errorFunc)
	{
		let str, query = [], key, x = new XMLHttpRequest();
		if(LitroPlayerHandle.APIServer.url == null){console.error('not initialize api server'); return;}

		x.timeout = 5000;

		x.onload = func != null ? function () {
			let j;
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
			x.open(method, LitroPlayerHandle.APIServer.url + '/' + api + '?' + str , true);
			str = "";
		}else{
			x.open(method, LitroPlayerHandle.APIServer.url + '/' + api, true);
		}
		x.withCredentials = true;
		x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');

		// Set-Cookie:LITROSOUND=8lr6fpmr30focapfnejn807mo5;
		x.send(str);
	}
};

export class LitroHandle{
	constructor(channelNum) {
		let  self = this
		;
		channelNum = channelNum == null ? defines.CHANNELS_NUM : channelNum;
		const version = defines.LITROSOUND_VERSION;
		this.isFirefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) ? true : false;
		this.channel = [];
		this.channel.length = channelNum;
		defines.processorMode('worklet');
		// this.channel_s = [];
		// this.channel_s.length = channelNum;

		// this.players = {};
		this.players = [];
		this.frameRate = defines.FRAME_RATE;
		this.sampleRate = 0;

		this.masterVolume = defines.VOLUME_MASTER; //defines.VOLUME_TEST;
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

		this.callback = {} //init完了後コールバック
		if(this.context.audioWorklet == null){
			this.callback = false;
			return false;
		}

		this.worklet = this.context.audioWorklet.addModule(LitroHandle.processorPath).then(function(){
			let node = new AudioWorkletNode(self.context, 'main-processor')
			;
			self.workletNode = node;
			self.connectModules();

			self.callback.ready();
		});

		this.callback = {ready: function(){}};
		// 出力開始
		// src.noteOn(0);
	}

	getCallback(){
		return this.callback;

	}

	engine(apifunc, args, callback, failedfunc){
		this.workletNode.port.postMessage({engine: {func: apifunc, args: args}});
	}
	postProperties(propkey, params){
		let p = {}, handle = this.handle;
		p.engine = {key: propkey, params: params};
		this.workletNode.port.postMessage(p);

	}

	appendPlayer(name, player)
	{
		let primary = this.players.some(function(p, i){
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
	}

	processorMessage(data){
		let key, plname, i, func, args;
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
	}

	removePlayer(name)
	{
		let deleted;
		deleted = this.players.some(function(p, i){
			if(p.name == name){
				delete this.player[i];
				return true;
			}
			return false;
		}, this);

		return deleted;
	}

	/**
	 * 視覚用波形出力
	 * @param {Object} size
	 */
	getAnalyseData(size)
	{
		let data = new Uint8Array(size);
		this.analyser.getByteTimeDomainData(data);
		return data;
	}

	createContext(){
//		if(this.context == null){this.context = new AudioContext();}
		if(this.context == null){
			this.context = new AudioContext({
				latencyHint: 'interactive',
				sampleRate: defines.SAMPLE_RATE,
			});
		}
		// context.sampleRate = rate; //read only

		this.sampleRate = this.context.sampleRate; //
//		console.log(this.sampleRate)
	}

	connectModules(size)
	{
		let src, self = this, vol, node
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

	}

	connectOn()
	{
		this.connectOff();
		this.connectModules();
		// this.scriptProcess.connect(this.gain);
		// this.scriptProcess.connect(this.analyser);
		// this.gain.connect(this.context.destination);
	}
	connectOff()
	{
		this.scriptProcess.disconnect();
		this.scriptProcess.onaudioprocess = null;
		this.gain.disconnect();
	}

	setTouchOuth(eQuery)
	{
		let e, type = typeof eQuery, self = this;
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
	}

	clearBuffer(ev)
	{
		let i
			, data = ev.outputBuffer.getChannelData(0)
			, dlen = ev.outputBuffer.length, clen = this.channel.length
			;
		for(i = 0; i < dlen; i++){
			data[i] = 0;
		}
	}

	static setProcessorPath(path)
	{
		LitroHandle.processorPath = path;
	}
};
LitroHandle.processorPath = './litrosound/processor.js';

/**
 * デバッグ用
 */
//function litroVersion()
//{
//	let str = ''
//		;
//		// ls.init(1);
//		// lp.init('v');
//
////	str = "LitroSound:" + LitroHandle.version + "\n"
////	 + "LitroPlayer:" + LitroPlayerHandle.version + "\n"
////	 + "LitroAudioParams:" + LitroWaveChannel.paramsVersion;
//	str = "LitroSound:" + LitroHandle.version + '(' + LitroHandle.processorMode + ')' + "\n"
//	 + "LitroPlayer:" + LitroPlayerHandle.version + "\n"
//	 + "LitroAudioParams:" + LitroWaveChannel.paramsVersion;
//	console.info(str);
//}


function makeLitroElement(type, time, value)
{
	return {type: type != null ? type : 'null', time: time != null ? time : 0, value: value != null ? value : 0};
};


export function initLTSNDServer(url){
	LitroPlayerHandle.initLTSNDServer(url);
}

export function LITROSOUND(user, bgmpack, sepack, func, errorFunc){
	let soundEngin
		, sePlayer, bgmPlayer
		, ltsnd = {engin: soundEngin, se: sePlayer, bgm: bgmPlayer}
		, initRes
	;
//	window.addEventListener('load', function(){
		ltsnd.engine = new LitroHandle();
		initRes = ltsnd.engine.getCallback();
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

export function LTSNDFULL(user, bgmpack, sepack, func, errorFunc){
	let soundEngin
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
					defines.litroVersion();
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

export function LTSND(user, pack, func, errorFunc){
	let soundEngin
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


class LitroPlayPack{
	constructor(){
		this.init();
	}
	init()
	{
		this.packList = [];
		this.packFiles = [];
		this.packTitles = [];
		this.packIDs = [];

		// this.litroSound = litroSoundInstance;

		this.NONPACK_NAME = ' NO-PACK ';

	}

	listFromServer(user_id, page, limit, func, errorFunc)
	{
		let params = {page: page, limit: limit, user_id: user_id}
			, self = this;
		func = func == null ? function(){return;} : func;
		errorFunc = errorFunc == null ? function(){return;} : errorFunc;
		LitroPlayerHandle.sendToAPIServer('GET', 'packlist', params, function(data){
			let i;
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
	}

	loadPack(user_id, pack_query, func, errorFunc)
	{
		let self = this
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
		LitroPlayerHandle.sendToAPIServer('GET', 'packload', params, function(data){
			let i
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

	}

	packReceive(data)
	{
		let i
		, packFiles = this.packFiles
		, packTitles = this.packTitles
		, packIDs = this.packIDs
		, lp = new LitroSoundParser();
		if(data == null || data == false){
			errorFunc(data);
		}
		for(i = 0; i < data.length; i++){
			data[i].parseData = lp.parseDataStr(decodeURIComponent(data[i].data));
			packFiles.push(data[i]);
			packTitles.push(data[i].title);
			packIDs.push(data[i].sound_id);
		}

		// this.setPlayDataFromPackIndex(, 0);

		func(packFiles);
	}
};



//call at 60fps
function litroSoundMain()
{
	return;
};
