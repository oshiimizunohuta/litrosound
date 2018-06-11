/**
 * 初期設定
 */

//export default function defines(){
export const
LITROSOUND_VERSION = '0.12.00'
, LITROPLAYER_VERSION = '03.01'

, SAMPLE_RATE = 44100//readonly
// CHANNEL_BUFFER_SIZE = 48000
, BUFFER_FRAMES = 60
// BUFFERS = 2,
, FRAME_RATE = 60
, WAVE_VOLUME_RESOLUTION = 15
, CHANNELS_NUM = 8
// VOLUME_TEST = 0.4,
, VOLUME_TEST = 0.4
, VOLUME_CELLSIZE = 0.01 / Math.pow(WAVE_VOLUME_RESOLUTION, 2)
, VOLUME_MASTER = VOLUME_CELLSIZE * 40

, OCTAVE_MAX = 7

, DEFAULT_NOTE_LENGTH = 800//ms

, LitroKeyboardControllChar = [
['q', 81],['2', 50],['w', 87],['3', 51],['e', 69],['r', 82],['5', 53],['t', 84],['6', 54],['y', 89],['7', 55],['u', 85],['i', 56],['9', 73],['o', 57],['0', 79],['p', 80],
['z', 90],['s', 83],['x', 88],['d', 68],['c', 67],['v', 86],['g', 71],['b', 66],['h', 72],['n', 78],['j', 77],['m', 75],[',', 188],['l', 76],['.', 190],[',', 187],['/', 191],
]

, KEY_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
, TITLE_MAXLENGTH = 32

, PROCESS_BUFFER_SIZE = 128 //worklet
, SINGLE_PROCESS_BUFFER_SIZE = 256 //scriptBufferProcess
, MILLI_SECOND = 1000
, MIN_CLOCK = MILLI_SECOND / FRAME_RATE //EnvelopeMinimumClock

, KEY_FREQUENCY = [
	[32.703,34.648,36.708,38.891,41.203,43.654,46.249,48.999,51.913,55.000,58.270,61.735],
	[65.406,69.296,73.416,77.782,82.407,87.307,92.499,97.999,103.826,110.000,116.541,123.471],
	[130.813,138.591,146.832,155.563,164.814,174.614,184.997,195.998,207.652,220.000,233.082,246.942],
	[261.626,277.183,293.665,311.127,329.628,349.228,369.994,391.995,415.305,440.000,466.164,493.883],
	[523.251,554.365,587.330,622.254,659.255,698.456,739.989,783.991,830.609,880.000,932.328,987.767],
	[1046.502,1108.731,1174.659,1244.508,1318.510,1396.913,1479.978,1567.982,1661.219,1760.000,1864.655,1975.533],
	[2093.005,2217.461,2349.318,2489.016,2637.020,2793.826,2959.955,3135.963,3322.438,3520.000,3729.310,3951.066],
	[4186.009,4434.922,4698.636,4978.032,5274.041,5587.652,5919.911,6271.927,6644.875,7040.000,7458.620,7902.133],
]
, KEYCODE_MAX = KEY_FREQUENCY.length * KEY_FREQUENCY[0].length

, freqByKey = function(key){
	return KEY_FREQUENCY[(key / KEY_FREQUENCY[0].length) | 0][key % KEY_FREQUENCY[0].length];
}
, freqByOctaveCodeNum = function(octave, codenum){
	return KEY_FREQUENCY[octave][codenum];
}
, keyByOctaveCodeNum = function(octave, codenum){
	return (KEY_FREQUENCY[octave].length * octave) + codenum;
}


, maxFreq = function()
{
	return KEY_FREQUENCY[KEY_FREQUENCY.length - 1][KEY_FREQUENCY[KEY_FREQUENCY.length - 1].length - 1];
}
, minFreq = function()
{
	return KEY_FREQUENCY[0][0];
}

, makeEventsetData = function(channels){
	let eventset = [], type, ch, addEtc = 0, i
	;
//	channels = channels == null ? litroSoundInstance.channel.length : channels;
	channels = channels == null ? CHANNELS_NUM : channels;
	for(ch = 0; ch < channels + addEtc; ch++){
		// this.noteData.push({});
		eventset.push({});
		eventset[ch].note = {};
		for(i = 0; i < LitroWaveChannel.sortParam.length; i++){
			eventset[ch][LitroWaveChannel.sortParam[i]] = {};
		}
	}
	return eventset;
}


, makeLitroElement = function(type, time, value)
{
	return {type: type != null ? type : 'null', time: time != null ? time : 0, value: value != null ? value : 0};
}
;


//	const VALUE = 100;
//}



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
	let k, keys = {}, props, verList, v;
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
		console.info("file version:" + paramsVersion + " -> " + LitroWaveChannel.paramsVersion);
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
	init:function(datasize, resolution, sampleRate){
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
		
		this.fadeRate = 1;
		
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
		this.sampleRate = sampleRate;
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
		let mem = this.memoryData;
		return mem.func == null ? mem.data : mem.func(mem.data, this);
	},
	
	getWaveOffsetRate: function(){
		return this.memoryData.offsetRate;
	},
	
	getPhase: function()
	{
		let clock = this.envelopeClock
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
		let i
		, channel = this
		, clock = channel.envelopeClock
		, env = channel.envelopes
		, svol, vol, d
		, fadeRate = this.fadeRate
		;
		if(!channel.envelopeStart){channel = null; return 0;}
		vol = (env.volumeLevel * fadeRate) | 0;
		svol = (env.sustain * fadeRate) | 0;
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
		let env = this.envelopes;
		return (env.attack + env.hold + env.decay + env.length + env.release) * clockRate;
	},

	tune: function(name, param)
	{
		let p = this.tuneParams;
		return p[name] = (param == null) ? p[name] : param;
	},
	//高速化のためエンベロープオブジェクトをつくっとく
	refreshEnvelopeParams: function(clockRate)
	{
		let p = this.tuneParams;
		this.envelopes = {attack: p.attack * clockRate, hold: p.hold * clockRate, decay: p.decay * clockRate, length: p. length * clockRate, release: p.release * clockRate, sustain: p.sustain, volumeLevel: p.volumeLevel};
	},
	
	vibratos: function(clockRate)
	{
		let p = this.tuneParams;
		clockRate == null ? 1 : clockRate;
		return {vibratospeed: p.vibratospeed * clockRate, vibratodepth: p.vibratodepth, vibratorise: p. vibratorise * clockRate, vibratophase: p.vibratophase};
	},
	
	setMemory: function(memDat)
	{
		this.memoryData = memDat;
	},
	
	setFrequency: function(freq)
	{
		let memPos = this.waveClockPosition
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
		this.setWaveLength(this.sampleRate / this.frequency);
		this.staticWaveLength = this.waveLengthFloat;
		this.waveClockPosition = Math.round(this.waveClockPosition * this.waveLengthFloat / this.prevLength) | 0;
		this.preWaveClockPosition = (this.preWaveClockPosition * this.waveLengthFloat / this.prevLength) | 0;
				// if(this.id == 2)
	
	},

//TODO staticWaveLengthも更新するべき？(する場合refreshWaveも調整必要あり)	
	setWaveLength: function(length)
	{
		let mem  = this.getMemory();
		this.waveLengthFloat = length;
		this.waveLength = Math.round(length) | 0;
		this.waveMemoryClockRate = mem == null ? 0 : (mem.length / this.waveLength);
	},
	
	allocBuffer: function(datasize){
		let i, data, a;
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
		let type = this.tuneParams.waveType;
		return type > 11 && type < 16;
	},
	
	isEnable: function()
	{
		return this.tuneParams.enable == 1;
	},
	
	resetChannelParams: function(){
		let k, params = this.tuneParams;
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
		 let i, r = this.data[this.waveLength - 1], len = end == null ? this.waveLength : end;
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
		let clock = this.envelopeClock, env = this.envelopes
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
		let wpos = this.waveClockPosition, wlen = this.waveLength
		, detune = this.getDetunePosition()
		;

		this.preWaveClockPosition = wpos;
		this.preWaveData = this.data[(wlen + wpos + detune) % wlen];
		this.waveClockPosition = wpos + 1 < wlen ? wpos + 1 : 0;
		return 0;
	},
	
	nextWave: function(){
		if(this.envelopeEnd == true || this.waveLength == 0){return 0;}
		let vol
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
		let i
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
		let len = LitroWaveMemory.SAMPLE_BUFFER
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
			let i = 0
			, p = LitroWaveChannel.noiseParam
			, clock = p.clock, reg = p.reg, pvol = p.volume
			, len = data.length, wlen = channel.waveLength
//			/ 2
			;
//			noteKey
//			debugger
			//p.shortType = type; //短周期タイプ
			for(i = 0; i < len; i++){
				if(++clock >= wlen){
					reg >>= 1;
					reg |= ((reg ^ (reg >> type)) & 1) << 15;
					pvol = (reg & 1) * WAVE_VOLUME_RESOLUTION;
					clock = 0;
				}
				data[i] = pvol;
			}
			
			p.reg = reg; p.clock = clock; p.volume = pvol;
			// p.halfLength = hlen;
			return data;
		};
		
		this.append(function(data, channel){return noiseFunc(data, channel, 1);}, 'noise/1', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 6);}, 'noise/6', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 12);}, 'noise/12', 1);
		this.append(function(data, channel){return noiseFunc(data, channel, 15);}, 'noise/15', 1);
	},
	
	append: function(data, name, offset){
		let m = new LitroWaveMemory();
		m.init(data, name, offset);
		this.indexName[name] = this.waveMemories.length;
		this.waveMemories.push(m);
	},
	
	memory: function(index){
		if(index >= this.waveMemories.length){return null;}
		return this.waveMemories[index];

		// return data.func == null ? data.data : data.func(data.data);
	},
}



//TODO parserを作る？
class LitroSoundParser{
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
	
	constructor(){
		this.fversion = LitroWaveChannel.paramsVersion + '.' + LITROPLAYER_VERSION;
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
	}
	pad0(str, num)
	{
		while(num - str.length > 0){
			str = '0' + str;
		}
		return str;
	}
	
	 
// 	 TODO headerObjectをつくる
	headerInfo(currentFile)
	{
		let title = this.str5bit(this.titleCodes.length > 0 ? this.titleCodes : currentFile.title);
		return this.FORMAT_LAVEL + '[version]' + this.fversion + '[auth]' + currentFile.playerAccount + '[title]' + title + this.dataHeaderDelimiter;
	}
	
	//byteArray or String
	str5bit(source)
	{
		let i = 0, bstr = "", str = '', len = source.length, c
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
	}
	
	dataToString(edat)
	{
		// LitroWaveChannel.tuneParamsID
		let str = ''
			, ch, time, type, chstr, timeDats, typeDatsNum
			, typestr
			, prop = LitroWaveChannel.tuneParamsProp
			, mode = this.CHARCODE_MODE
			, datLen = this.DATA_LENGTH36
		;
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
	}
	
	dataStrToCharCode(str)
	{
		let i, len, clen = 0, sepLen = this.CHARCODE_LENGTH36
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
	}
	//%04%E6%90%80%E2%B0%80%EF%90%80%EB%B0%80
	
	charCodeToDataStr(code)
	{
		let sepLen = this.CHARCODE_LENGTH36, clen = code.length
			, rlen = 0, str = '', sepStr
		, mode = this.CHARCODE_MODE
		;
		while(clen > rlen){
			sepStr = code.substr(rlen, 1).charCodeAt(0).toString(mode);
			str += '00000000'.substr(0, sepLen - sepStr.length) + sepStr;
			rlen += 1;
		}
		return str;
	}
	
	//datastr parse のみ有効
	timevalData(type, timeval)
	{
		let i, res = {}, datLen = this.DATA_LENGTH36
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
	}
	
	parseHeaderStr(str)
	{
		// '[version]' '[auth]' '[title]' 
		let start, len, deli, key;
		for(key in this.headerParamDelimiters){
			deli = this.headerParamDelimiters[key];
			start = str.lastIndexOf(deli) + deli.length;
			len = str.indexOf('[', start) - start;
			this.headerParams[key] = len < 0 ? '' : str.substr(start, len);
		}
		return this.headerParams;
	}
	
	parseDataStr(data)
	{
		let dlen
			, mode = this.CHARCODE_MODE
			, datLen = this.DATA_LENGTH36
			, rlen = 0, res = '', tvalLen = 0
			, idKey
			, minLen = datLen.ch + datLen.type + datLen.timeval
			, delim = this.dataHeaderDelimiter, headerParams = {}
			, eventsetData = makeEventsetData()
			, ch, type, tval
			;
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
	}
	
	dataComponent(litroCurrentFile){
		let data, current = litroCurrentFile
		;
// 		litroCurrentFile: title playerAccount eventsetData 
		data = encodeURIComponent(this.headerInfo(current) + this.dataToString(current.eventsetData));
		return data;
	}
};

export {litroTuneProp, LitroWaveChannel, LitroWaveMemory, LitroWaveMemoryHolder, LitroSoundParser};
