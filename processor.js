/* 
 * The MIT License
 *
 * Copyright 2018 bitchunk.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import * as defines from './defines.js';
import {litroTuneProp, LitroWaveChannel, LitroWaveMemory, LitroWaveMemoryHolder, freqByKey, maxFreq, minFreq, makeEventsetData, LitroSoundParser} from './defines.js';

class MainProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		let self = this;
		this.engin;
		this.players = [];
//		
		this.port.onmessage = function(event){
			self.handleMessage(event);
		}
	}
	handleMessage(event) {
		let prop, func, args, i, p, name;
//		console.log('[Processor:Received] "' + event.data.message +
//					'" (' + event.data.timeStamp + ')');
		if(event.data.name != null){
			this.engin[event.data.name] = event.data.value;
//			console.log(this.engine.sampleRate);
		}else if(event.data.player != null){
			name = event.data.player.name;
			
			for(i = 0; i < this.players.length; i++){
				if(this.players[i].name == name && event.data.player.func != null){
					func = event.data.player.func;
					args = event.data.player.args;
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
				}else if(this.players[i].name == name && event.data.player.key != null){
					this.players[i][event.data.player.key] = event.data.player.value;
					break;
				}
			}
			
		}else if(event.data.engine != null){
			if(event.data.engine.func != null){
				func = event.data.engine.func;
				args = event.data.engine.args;
				if(args == null){
					this.engine[func]();
				}else if(args.length == 1){
					this.engine[func](args[0]);
				}else if(args.length == 2){
					this.engine[func](args[0], args[1]);
				}else if(args.length == 3){
					this.engine[func](args[0], args[1], args[2]);
				}else if(args.length == 4){
					this.engine[func](args[0], args[1], args[2], args[3]);
				}
				return;
			}else if(event.data.engine.key != null){
				this.engine[event.data.engine.key] = event.data.engine.params;
				return;
			}
		}else if(event.data.init != null){
			let prop = event.data.init
			;
			this.refreshRate = 0; //init
			this.engine = new LitroSound();
//			this.engine.init();
			this.engine.sampleRate = prop.sample_rate;
			this.engine.initWaveProperties();
			this.players[0] = this.engine.createPlayer('se');
			this.players[1] = this.engine.createPlayer('bgm');
			this.players[0].processorPort = this.port;
			this.players[1].processorPort = this.port;
		}
	}

	process(inputs, outputs) {
		let i, ch
			, players = [], player, pl
			, engine = this.engine
			, data = outputs[0][0], channel, chdata, avol
			, dlen = data.length, clen = defines.CHANNELS_NUM, plen = engine.players.length
			, rate = engine.refreshRate, rCrock = engine.refreshClock, cRate = engine.clockRate
			;
		for(pl = 0; pl < plen; pl++){
			players.push(engine.players[pl].player);
		}
		data.set(engine.buffer0Array);//０でイニシャル
		for(i = 0; i < dlen; i++){
			rCrock += cRate;
			if(rCrock >= rate){
				for(pl = 0; pl< plen; pl++){
					player = players[pl];
					player.playSound();
					for(ch = 0; ch < clen; ch++){
						player.refreshWave(ch);
					}
				}
				rCrock -= rate;
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
		engine.refreshClock = rCrock;
		return true;
	}
}

registerProcessor('main-processor', MainProcessor);
let litroAudio = null;
let litroSoundInstance = null;

let TOP_FREQ_LENGTH = 1;

//LitroSound.version = LITROSOUND_VERSION;
class LitroSound{
	constructor(channelNum) {
		let  self = this
		;
		channelNum = channelNum == null ? defines.CHANNELS_NUM : channelNum;
		this.channel = [];
		this.channel.length = channelNum;
		// this.channel_s = [];
		// this.channel_s.length = channelNum;
		
		// this.players = {};
		this.players = [];
		this.frameRate = defines.FRAME_RATE;
		this.milliSecond = defines.MILLI_SECOND;//firefox : chrome
		this.minClock = defines.MIN_CLOCK; //ノート単位クロック
		this.sampleRate = 0;
		this.refreshRate = 0; //init
		this.refreshClock = 0;
		this.clockRate = 1.00;
		this.recoverCount = 0; //異常時立ち直りまでのカウント
		this.processHeavyLoad = false;
		this.performanceCycle = 280; //?
		this.performanceValue = 0;
		this.radiateTime = 16; //[ms] 安定化待ち時間
		this.radiationTimer = 0;

		this.maxFreq = 0; //init
		this.maxWavlen = 0;
		this.minWavlen = 0;
		this.mode = 0;
		litroSoundInstance = this;
		this.masterVolume = defines.VOLUME_MASTER; //VOLUME_TEST;
		this.WAVE_VOLUME_RESOLUTION = defines.WAVE_VOLUME_RESOLUTION; //波形データのボリューム分解能
		this.outputBuffer = [];
		//2018
		this.buffer0Array = new Float32Array(defines.PROCESS_BUFFER_SIZE);


		this.scriptProcess = null;
		this.gain = null; //ゲイン
		this.analyser = null; //波形分析
		this.delay = null; //遅延
		this.source = null; //重要バッファ
		this.setChannelEventFunc = function(){return;};
		this.onNoteKeyEventFunc = function(){return;};
		this.offNoteKeyEventFunc = function(){return;};
		this.fadeoutEventFunc = function(){return;};
		
		this.TOP_FREQ_LENGTH = 0; //init
		
	}
	
	createPlayer(name){
		let p = new LitroPlayer();
		p.litroSound = this;
		p.init(name);
		return p;
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
	
	initWaveProperties()
	{
		//2018
//		if(this.context == null){return;}
		this.TOP_FREQ_LENGTH = (this.sampleRate / freqByKey((defines.KEY_FREQUENCY.length * defines.KEY_FREQUENCY[0].length) - 1)) | 0;
		this.refreshRate = this.sampleRate / defines.MILLI_SECOND;
//		this.refreshRate = 62.1;
		this.maxFreq = (this.sampleRate / 2) | 0;
		this.maxWavlen = (this.sampleRate / minFreq()) | 0;
		this.minWavlen = (this.sampleRate / maxFreq()) | 0;
		
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

	checkPerformance(ev)
	{
		let pf = window.performance.now()
			, self = this;
		if(this.scriptProcess == null){return;}
		if(pf - this.performanceValue > this.performanceCycle){
			if(!this.processHeavyLoad){
				console.log('process has become overloaded!!');
				this.processHeavyLoad = true;
				this.connectOff();
				this.radiationTimer = setInterval(function(e, ev){self.checkPerformance(ev);}, this.radiateTime, ev);
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
};


/**
 * デバッグ用
 */
function litroVersion()
{
	let str = ''
		;
		// ls.init(1);
		// lp.init('v');

	str = "LitroSound:" + LitroSound.version + "\n"
	 + "LitroPlayer:" + LitroPlayer.version + "\n"
	 + "LitroAudioParams:" + LitroWaveChannel.paramsVersion;
	console.info(str);
}

let TITLE_MAXLENGTH = 32;
let litroPlayerInstance = null;
/**
 * データ管理オブジェクト
 */
//v02.03.01:tuneParamsID追加変更(paramsVer.0.2.0)
//v01.03.01:returnイベントはplayフラグが必須
//v01.03.00:tuneParamsID変更(paramsVer.0.1.0)
//v00.03.00:-値対応
//v00.01.00:タグ付き

class LitroPlayer{
	
	init(name, channelNum)
	{
		let i, self = this;
		// litroPlayerInstance = this;
		this.channel = [];
		this.channel.length = channelNum == null ? defines.CHANNELS_NUM : channelNum;
		
		// this.noteData = []; //note data
//		this.playPack = new LitroPlayPack(); //複数のファイルを入れておく連続再生用？
//		this.playPack.init(this);
		this.noteSeekTime= 0; //note をセットする位置
		this.playSoundFlag = false;
		this.litroSound = this.litroSound == null ? litroSoundInstance : this.litroSound;
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
		this.onFadeEndFunc = function(){return;};
		
		this.fadeStart = -1;
		this.fadeEnd = -1;
		this.fadeDiff = -1;
		this.fadeMode = 0;
		
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

		this.COMMON_TUNE_CH = 0;
		
		this.clearEventsData();
		
		for(i = 0; i < LitroWaveChannel.sortParam.length; i++){
			this.eventsetKeyIndex[LitroWaveChannel.sortParam[i]] = i;
		}
		
		this.memoryHolder = new LitroWaveMemoryHolder();
		this.memoryHolder.initBasicWave();
		
		this.waveChennelInit(((this.litroSound.sampleRate / defines.KEY_FREQUENCY[0][0]) | 0) + 1);
		
		
	}
	
	//チャンネル設定
	waveChennelInit(dataSize){
		let ch, channel, i
			;
		for(i = 0; i < this.channel.length; i++){
			channel = new LitroWaveChannel();
			channel.init(dataSize, this.litroSound.WAVE_VOLUME_RESOLUTION, this.litroSound.sampleRate);
			channel.id = i;
			// channel.refreshEnvelopeParams(defines.MIN_CLOCK);
			channel.setFrequency(defines.MIN_CLOCK);
			channel.setMemory(this.memoryHolder.memory(0));
			this.channel[i] = channel;
		}
	}
	
	//channel getter
	enableChannels(){
		return this.channel.filter(function(ch){
			return ch.tune('enable') == 1;
		});
	}
	
	isFinishEnvelope(ch)
	{
		let clock = this.channel[ch].envelopeClock, env = this.getEnvelopes(ch)
		;
		if(clock >= env.attack + env.hold + env.decay + env.length + env.release){
			return true;
		}
		return false;
	}
	
	isNoises()
	{
		let noises = []
			, i, len = this.channel.length, ch;
		for(i = 0; i < len; i++){
			ch = i;
			noises.push(this.channel[ch].isNoiseType());
		}
		return noises;
	}
	
	getNoteKey(ch)
	{
		return this.channel[ch].noteKey;
	}
	
	getChannel(ch, key)
	{
		return this.channel[ch].tuneParams[key];
	}
	
	getTuneParams(ch)
	{
		return this.channel[ch].tuneParams;
	}
	
	getEnvelopes(ch)
	{
		let channel = this.channel[ch];
		
		return channel.envelopes;
	}
	
	getVibratos(ch)
	{
		return this.channel[ch].vibratos(defines.MIN_CLOCK);
	}
	
	getDelay(ch)
	{
		// this.getChannel(ch, 'delay', true) * 10;
		return this.channel[ch].tuneParams.delay * 10;
	}
	
	isSweepNotes(ch)
	{
		return this.channel[ch].sweepNotesOn;
	}
	
	envelopeWaveType(ch)
	{
		let channel = this.channel[ch]
			, res;
		;
		switch(channel.getPhase()){
			case 'a': res = this.getChannel(ch, 'waveTypeAttack'); break;
			case 'h': res = this.getChannel(ch, 'waveTypeHold'); break;
			case 'd': res = this.getChannel(ch, 'waveTypeDecay'); break;
			default: res = -1;
		}
		return res < 0 ? this.getChannel(ch, 'waveType') : res;
	}
	
	//channel setter
	setOnNoteKeyEvent(func){
		this.onNoteKeyEventFunc = func;
	}
	
	setOffNoteKeyEvent(func){
		this.offNoteKeyEventFunc = func;
	}
	/**
	 *note target sweep
	 */
	setSweepNoteOn(ch, enable)
	{
		this.channel[ch].sweepNotesOn = enable;
	}
	
	//未使用？
	setWaveType(channelNum, type)
	{
		this.setChannel(channelNum, 'waveType', type);
	}
	
	setChannel(ch, key, value)
	{
		let channel = this.channel[ch]
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
		channel.refreshEnvelopeParams(defines.MIN_CLOCK);
		
		//仮
		if(this.isSweepNotes(ch)){
			channel.skipEnvelope();
		}
		
		// vib = channel.vibratos(defines.MIN_CLOCK);
		vib = channel.vibratos(1);
		if(key == 'sweep'){
			if(channel.waveLength > 0){
				// this.setFrequency(ch, Math.round(this.litroSound.sampleRate / channel.waveLength) | 0);
				channel.setFrequency(Math.round(this.litroSound.sampleRate / channel.waveLength) | 0);
			}
			channel.sweepClock = 1;
			channel.sweepRateMin = maxWavlen() / Math.exp(value *  prop.sweep.min * 0.001);
			channel.sweepRateMax = maxWavlen() / Math.exp(value *  prop.sweep.max * 0.001);
		}else if(key == 'vibratophase'){
			//vibrato offset phase
			// channel.vibratophaseRate = vib.vibratophase * 180 / vibDist;
			channel.vibratophaseRate = 2 * Math.PI * (vib.vibratophase / (vibDist));
		}else if(key == 'vibratodepth'){
			channel.vibratodepthRate = vib.vibratodepth / vibDist;
		}else if(key == 'vibratospeed'){
			//vibrato rate
			// channel.vibratospeedRate = (Math.PI / 180) * 180 / vib.vibratospeed;
			channel.vibratospeedRate = vib.vibratospeed == 0 ? 0 : Math.PI  / (vib.vibratospeed + 0);
		}else if(key == 'waveType'){
			channel.setMemory(this.memoryHolder.memory(value));
		}
		this.setChannelEventFunc(ch, key, value);
		return value;
	}
	
	setSetChannelEvent(func)
	{
		this.setChannelEventFunc = func;
	}

	toggleOutput(ch, toggle)
	{
		this.setChannel(ch, 'enable', toggle | 0);
		if(!toggle){
			this.channel[ch].endEnvelope();
			this.channel[ch].clearWave();
			this.channel[ch].absorbVolumeSource = 0;
			this.channel[ch].waveLength = 0;
		}
	}
	
	// execper1/60fps
	refreshWave (channelNum)
	{
		let i, phase
		, wavLen, vibLen, sweepLen//, sumLen
		, channel = this.channel[channelNum]
		, vib = this.getVibratos(channelNum, true)
		, vibriseClock = channel.vibratoClock - vib.vibratorise
		, sweep = this.getChannel(channelNum, 'sweep', true)
		, enable = channel.isEnable()
		, abst = 0, startTrig = false, endTrig = false
		, swnotesRate
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
			this.clearSweepNotes(channelNum);
			this.setSweepNoteOn(channelNum, false);
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
		 			* Math.sin(((vibriseClock * channel.vibratospeedRate) + phase));
		 			// * Math.sin((vibriseClock + phase) * channel.vibratospeedRate);
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
	}
	
	
	onNoteKey(ch, key)
	{
		let channel = this.channel[ch], freq = freqByKey(key)
		;
		channel.noteKey = key;
		// if(this.isSweepNotes(ch) && !this.isFinishEnvelope(ch)){
		if(this.isSweepNotes(ch) && !channel.envelopeEnd){
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
		
	}
	
	onNoteFromCode(ch, codenum, octave)
	{
		let channel = this.channel[ch], freq = freqByOctaveCodeNum(octave, codenum);
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
		
		// this.setFrequency(ch, freq);
	}
	
	extendNote(channelNum)
	{
		let channel = this.channel[channelNum]
			, envelopes = channel.envelopes
		;
		channel.envelopeClock = (envelopes.attack + envelopes.hold + envelopes.decay) | 0;
		channel.envelopeClock += 0.1; //立ち上がり調整防止
	}
	
	fadeOutNote(channelNum)
	{
		if(channelNum == null){
			return;
		}
		this.skiptoReleaseClock(channelNum);
	}
	
	skiptoReleaseClock(ch)
	{
		let env = this.getEnvelopes(ch)
			, clock = env.decay + env.length
			, channel = this.channel[ch]
		;
		channel.envelopeClock = channel.envelopeClock < clock ? clock : channel.envelopeClock;
		channel.envelopeClock += 0.1; //立ち上がり調整防止
	}
	
	clearSweepNotes(ch)
	{
		let channel = this.channel[ch];
		if(channel.sweepNotesTarget != null){
			channel.setFrequency(channel.sweepNotesTarget);
			channel.sweepNotesBase = null;
			channel.sweepNotesTarget = null;
			channel.sweepNotesRate = 0;
			channel.sweepNotesClock = 0;
		}
	}
	
	refreshSweepNotes(ch)
	{
		let channel = this.channel[ch]
		, baseNote, targetNote
		, sample = this.litroSound.sampleRate
		, delay = this.getDelay(ch)
		;
		
		if(!this.isSweepNotes(ch)){
			return;
		}
		baseNote = this.searchNearBack(ch, this.noteSeekTime - delay, 0, 'note');
		targetNote = this.searchNearForward(ch, this.noteSeekTime - delay, -1, 'note', baseNote);
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
	}
		
	clearEventsData()
	{
		this.eventsetData = makeEventsetData();
		this.delayEventset = makeEventsetData(); 
		this.noteSeekTime= 0; //note をセットする位置
		
	}
	setPlayData(data)
	{
		try{
			let lp = new LitroSoundParser();
			this.clearEventsData();
			// this.eventsetData = this.parseDataStr(decodeURIComponent(data.data));

			this.eventsetData = data.parseData != null ? data.parseData : lp.parseDataStr(decodeURIComponent(data.data));
			this.title = data.title == null ? '' : data.title;
			this.fileUserName = data.user_name == null ? '' : data.user_name;
			this.user_id = data.user_id == null ? 0 : data.user_id;
			this.sound_id = data.sound_id == null ? 0 : data.sound_id;
		}catch(e){
			console.warn(e);
			return false;
		}
		return true;
	}
	
	moveTuneParamsID (from, to)
	{
		let i, len = this.eventsetData.length, events, tmp = null, removed;
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
	}
	
	fileList(list)
	{
		this.serverFileList = list == null ? this.serverFileList : list;
		return this.serverFileList;
	}

	isPlay()
	{
		return this.playSoundFlag;
	}
	playForData(data)
	{
		let res = this.setPlayData(data);
		this.play();
		
		return res;
	}
	
	eventPlay(elementQuery, type, key)
	{
		let i, elements = document.querySelectorAll(elementQuery)
			, self = this
		;
		for(i = 0; i < elements.length; i++){
			elements[i].addEventListener(type, function(){
				self.finishChannelEnvelope();
				self.playForKey(key);
			}, false);
		}
	}
	
	setOnPlayFunc(func)
	{
		this.onPlayFunc = func;
	}
	
	setOnStopFunc(func)
	{
		this.onStopFunc = func;
	}
	
	play()
	{
//		this.onFadeOutFinish();
//		this.litroSound.context.resume();
//		this.systemTime = performance.now();
		this.playSoundFlag = true;
		
		this.processorPort.postMessage({player: {name: this.name, key:'playSoundFlag', value: this.playSoundFlag}});

		this.delayEventset = makeEventsetData();
		this.finishChannelEnvelope();
		
		// for(let i = 0; i < this.channel.length; i++){
			// this.channel[i].refChannel = this.channel[i].id;
		// }
		//TODO connectリセット処理が必要かも
		// litroSoundInstance.connectOff();
		// litroSoundInstance.connectOn();
				
		this.onPlayFunc();
		this.processorPort.postMessage({player:{name: this.name, func: 'onPlayFunc'}});
	}
	
	stop(toggle)
	{
		this.resetFadeChannel();
//		this.systemTime = performance.now();
		this.playSoundFlag = false;
		this.processorPort.postMessage({player: {name: this.name, key:'playSoundFlag', value: this.playSoundFlag}});
		this.delayEventset = makeEventsetData();
		this.finishChannelEnvelope();
		
		this.onStopFunc();
		//2018
		this.processorPort.postMessage({player:{name: this.name, func: 'onStopFunc'}});

	}
	
	fadeout(time, func)
	{
		this.resetFadeChannel();
		this.onFadeEndFunc = func == null ? function(){return;} : func;
		if(!this.isPlay()){
			func();
		};
		this.fadeStart = this.systemTime;
		this.fadeEnd = this.fadeStart + time;
		this.fadeDiff = this.fadeEnd - this.fadeStart;
		this.fadeMode = -1;
	}
	
	fadein(title, time, func)
	{
//		if(title == null){
//			this.play();
//		}else{
//			this.playForKey(title);
//		}
		this.resetFadeChannel();
		this.onFadeEndFunc = func == null ? function(){return;} : func;
		this.fadeStart = this.systemTime;
		this.fadeEnd = this.fadeStart + time;
		this.fadeDiff = this.fadeEnd - this.fadeStart;
		this.fadeMode = 1;
	}
	
	resetFadeChannel()
	{
		let ch, channels = this.channel, clen = channels.length
		;
		for(ch = 0; ch < clen; ch++){
			channels[ch].fadeRate = 1;
		}
		this.fadeStart = -1;
		this.fadeEnd = -1;
		this.fadeDiff = -1;
		this.fadeMode = 0;
//		this.onFadeEndFunc = function(){return;};
	}
	
	onFadeFinish()
	{
		let seek = this.noteSeekTime;
		if(this.fadeMode == -1){
			this.stop();
		}
		this.fadeMode = 0;
		this.onFadeEndFunc({seektime: seek});
		
		//2018
		this.processorPort.postMessage({player:{name: this.name, func: 'onFadeFinish', args:[{seektime: seek}]}});
//		this.resetFadeChannel();
	}
	
	fadeoutChannel()
	{
		let channels = this.channel
		, ch, clen = channels.length
		, channel, resol = 15, isChange = false
		, diff = this.fadeEnd - this.systemTime
		, fadeMode = this.fadeMode
		, rate = fadeMode < 0 ? diff / this.fadeDiff : 1 - (diff / this.fadeDiff)
		;
		if(fadeMode == 0){
			return;
		}
		
		rate = rate < 0 ? 0 : rate;
		rate = rate > 1 ? 1 : rate;
		//vol = 0 ~ 15
		for(ch = 0; ch < clen; ch++){
			channel = channels[ch];
			channel.fadeRate = rate;
		}
		if(diff < 0){
			this.onFadeFinish();
			return fadeMode == -1;
		}
		return false;
	}
		
	finishChannelEnvelope(){
		let i, channel = this.channel;
		for(i = 0; i < channel.length; i++){
			channel[i].endEnvelope();
			// channel[i].skipEnvelope();
			this.setSweepNoteOn(i, false);
			this.clearSweepNotes(i);
		}
	}
	
//	volume(vol)
//	{
//		let sTime, gain = this.litroSound.gain.gain;
//		if(vol != null){
//			vol = vol < 0 ? 0 : vol;
//			sTime = this.litroSound.context.currentTime;
//			gain.value = vol;
//			// gain.cancelScheduledValues(sTime);
//			// gain.setValueAtTime(gain.value, sTime);
//			// gain.setTargetAtTime(vol, sTime, 0);
//		}else{
//			vol = gain.value;
//		}
//		
//		return vol;
//	},
	
	commonEventTime(eventName){
		let t, tuneID = LitroWaveChannel.tuneParamsProp[eventName].id
			, set = this.eventsetData[this.COMMON_TUNE_CH].event;
		for(t  in set){
			if(set[t].value == tuneID){
				return t | 0;
			}
		}
		return -1;
	}
	
	//ループの際何かを実行
	restartEvent(){
		return;
	}
	
	setRestartEvent(func){
		this.restartEvent = func;
	}
	
	soundEventPush(ch, type, value)
	{
		// let tuneId = LitroWaveChannel.tuneParamsID;
		let tuneProp = LitroWaveChannel.tuneParamsProp
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
	}
	
	scanEdata(ch, edata)
	{
		let seekTime = this.noteSeekTime, looped = false
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
				delay = this.getDelay(ch);
			}
			
		}
		return looped;
	}
	scanDelayedEdata(ch, dData)
	{
		let seekTime = this.noteSeekTime, looped = false
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
	}
	//bufferProcess任せ
	playSound()
	{
		if(!this.playSoundFlag){return;}
		let t, ch, s
			, data, delay
//			, now = performance.now()
			, now = this.systemTime
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
			
			//fadeout volume
			if(this.fadeMode != 0){
				if(this.fadeoutChannel()){
					break;
				};
			}
		}

		this.systemTime = now + t;
		
	}
	
	soundEventDelayPush(ch, time, time_id, type, value)
	{
		// this.delayEventset[ch] = this.delayEventset[ch] == null ? {} : this.delayEventset[ch];
		// this.delayEventset[ch][type] = this.delayEventset[ch][type] == null ? {} : this.delayEventset[ch][type];
		this.delayEventset[ch][type][time_id | 0] = {time: time | 0, ch: ch, type: type, value: value};
	}
	
	getEventsFromTime(ch, time, filter)
	{
		let type, types = {}, res = {}, set = false, tindex;
		filter = filter == null ? LitroWaveChannel.sortParam : this.typesArray(filter);
		// for(tindex = 0; tindex < filter.length; tindex++){
		filter.forEach(function(type, tindex){
			type = filter[tindex];
			if(this.eventsetData[ch] != null && this.eventsetData[ch][type] != null && this.eventsetData[ch][type][time] != null){
				res[type] = this.eventsetData[ch][type][time];
			}
		}, this);
		return res;
	}
	
	seekMoveForward(ftime)
	{
		ftime = ftime == null ? 1 : ftime;
		this.noteSeekTime += ftime;
	}
	seekMoveBack(ftime)
	{
		ftime = ftime == null ? this.noteRange * this.noteRangeScale / this.noteRangeCells : ftime;
		if(ftime < 0){
			ftime = this.noteSeekTime;
		}
		this.noteSeekTime -= ftime;
		this.noteSeekTime = this.noteSeekTime < 0 ? 0 : this.noteSeekTime;
	}
	
	setSeekPosition(ftime)
	{
		this.noteSeekTime = ftime;
		this.noteSeekTime = this.noteSeekTime < 0 ? 0 : this.noteSeekTime;
	}
	
	//eventset-time-type
	allStackEventset(ch, types)
	{
		let tindex, type, t, events = {}
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
	}
	
	typesArray(type, exIgnores)
	{
		let types = [], t, params = []
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
	}
	
	//Note検索 end:0前方・-1後方
	//return eventset / null
	searchNearForward(ch, start, end, type, ignore)
	{
		let t, tindex, events ={}, types = [], eventset
			, keyIndex = this.eventsetKeyIndex
		;
		start = start == null ? this.noteSeekTime : start;
		//前方一致
		types = this.typesArray(type == null ? 'ALL' : type);
		events = this.allStackEventset(ch, types);

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
	}
	//return eventset / null
	searchNearBack(ch, start, end, type, ignore)
	{
		let t, tindex, events ={}, types = [], eventset
			, keyIndex = this.eventsetKeyIndex
		;
		start = start == null ? this.noteSeekTime : start;
		types = this.typesArray(type == null ? 'ALL' : type);
		//後方一致
		events = this.allStackEventset(ch, types);
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
	}
	
};
LitroPlayer.version = defines.LITROPLAYER_VERSION;

const maxWavlen = function()
{
	return litroSoundInstance.maxWavlen;
}

const minWavlen = function()
{
	return litroSoundInstance.minWavlen;
}

let change = function(){
	litroAudio.changeWave();
	litroAudio.mode = (litroAudio.mode + 1) % 4;
};


//function freqByKey(key){
//	return KEY_FREQUENCY[(key / KEY_FREQUENCY[0].length) | 0][key % KEY_FREQUENCY[0].length];
//}
//call at 60fps
function litroSoundMain()
{
	return;
};
