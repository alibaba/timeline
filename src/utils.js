///////////////
// polyfills //
///////////////


// 获取系统时间戳的函数
let getTimeNow = null;

// 如果有 process.hrtime ，则使用这个
// 		高精度，系统时间不相关，理论上不应该回退（与libuv有关，没有标准说明这一点），但是为了安全起见还是要使用防回退机制

// 如果有 performance.now ， 则使用这个，
// 		低精度，系统时间不相关，按照标准不应该回退，但是为了安全起见还是要使用防回退机制

// 如果都不能用，说明是 IE9 或者 OperaAndroid，只能用 Date.now
// 		很低精度，系统时间相关，抖动可能性很大

// 如果还不行，说明是IE8，只能用 new Date().getTime()
// 		很低精度，性能很差，系统时间相关，抖动可能性很大

// 无论使用哪种时间接口，都必须做防回退保证

let _timePrev = 0;
let _time = 0;

if (typeof (process) !== 'undefined' && process.hrtime !== undefined) {
	console.log('##timeline:: hrtime 高精度时间');

	// 初始化
	_timePrev = process.hrtime();

	getTimeNow = function () {
		// 注意hrtime拿到的时间是无意义的，需要进行时间对比
		const _dtime = process.hrtime(_timePrev);
		_timePrev = process.hrtime()

		// Convert [seconds, nanoseconds] to milliseconds.
		const dtime = _dtime[0] * 1000 + _dtime[1] / 1000000;

		// 防回退:
		// 		如果发生回退，这一步的时间将停止，
		// 		但是由于当前的hrtime已经被记录下来，下一步就会继续前进
		_time += dtime > 0 ? dtime : 0;
		return _time;
	};

} else if (typeof (performance) !== 'undefined' && performance.now !== undefined) {
	// console.log('%c##timeline:: performance.now 浏览器精度时间', 'color: gray;');

	_timePrev = performance.now();

	getTimeNow = function () {
		const timeCurr = performance.now();
		const dtime = timeCurr - _timePrev;
		_timePrev = timeCurr;

		_time += dtime > 0 ? dtime : 0;
		return _time;
	}

} else if (Date.now !== undefined) {
	console.warn('##timeline:: Date.now 低精度时间，建议升级浏览器');

	_timePrev = Date.now();

	getTimeNow = function () {
		const timeCurr = Date.now();
		const dtime = timeCurr - _timePrev;
		_timePrev = timeCurr;

		_time += dtime > 0 ? dtime : 0;
		return _time;
	}

} else {
	console.warn('##timeline:: new Date().getTime() 低精度低性能时间，建议升级浏览器');
	_timePrev = new Date().getTime();

	getTimeNow = function () {
		const timeCurr = new Date().getTime();
		const dtime = timeCurr - _timePrev;
		_timePrev = timeCurr;

		_time += dtime > 0 ? dtime : 0;
		return _time;
	}

}

//  raf
let raf, cancelRaf;

// NOTE 在Worker和node环境中不存在raf，因此可以使用setTimeout替代
if (typeof requestAnimationFrame !== 'undefined') {
	raf = requestAnimationFrame;
	cancelRaf = cancelAnimationFrame;
} else {
	raf = cbk => setTimeout(cbk, 15);
	cancelRaf = clearTimeout;
}

// 避免和时间线起点对齐导致onStart不能正确触发
function safeClip(track, end) {
	if (track._startTime <= 0) {
		track._startTime = 0.5;
	}
	if (track._startTime >= end) {
		track._startTime = end - 1;
	}
	if (track._endTime >= end) {
		track._endTime = end - 0.5;
		// 原则上，p不大于一即可
		track._duration = end - track._startTime;
	}
}

export { getTimeNow, raf, cancelRaf, safeClip };
