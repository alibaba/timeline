/**
 * Copyright (c) 2022 Alibaba Group Holding Limited
 * @author Simon<gaomeng1900@gmail.com>
 */

// @logic
//
// 如果有 process.hrtime ，则使用这个
// 		高精度，系统时间不相关，理论上不应该回退（与libuv有关，没有标准说明这一点），但是为了安全起见还是要使用防回退机制
//
// 如果有 performance.now ， 则使用这个，
// 		低精度，系统时间不相关，按照标准不应该回退，但是为了安全起见还是要使用防回退机制
//
// 如果都不能用，说明是 IE9 或者 OperaAndroid，只能用 Date.now
// 		很低精度，系统时间相关，抖动可能性很大
//
// 如果还不行，说明是IE8，只能用 new Date().getTime()
// 		很低精度，性能很差，系统时间相关，抖动可能性很大
//
// 无论使用哪种时间接口，都必须做防回退保证

/**
 * @description get a increasing timestamp in ms
 * @description 获取相对时间戳（单增，单位毫秒）
 * @note return a relative time used to measure a time interval
 * @note the returned value is relative to a unknown time in the past, thus should only be used to compare.
 * @note this function is monotonically non-decreasing, that is to say, it will **never** return a decreasing value no matter how system time changes.
 * @exports
 */
let getTimeNow: () => number

/**
 * previous time
 * @private
 */
let _timePrev = 0
let _timeHRPrev = [0, 0] as [number, number]

/**
 * current time
 * @private
 */
let _timeNow = 0

/**
 * internal method to get time
 * @exports
 */
let MODE: 'process.hrtime' | 'performance.now' | 'Date.now' | 'Date.getTime'

/**
 * count of time-decrease
 * @description this is usually caused by system clock reset (underlying methods never promised they won't decrease)
 * @exports
 */
let decreaseCount = 0

if (typeof process !== 'undefined' && process.hrtime !== undefined) {
	console.debug('##timeline::use process.hrtime')

	MODE = 'process.hrtime'

	// 初始化
	_timeHRPrev = process.hrtime()

	getTimeNow = function () {
		// 注意hrtime拿到的时间是无意义的，需要进行时间对比
		const _delta = process.hrtime(_timeHRPrev)
		_timeHRPrev = process.hrtime()

		// Convert [seconds, nanoseconds] to milliseconds.
		const delta = _delta[0] * 1000 + _delta[1] / 1000000

		// anti decrease
		// 防回退:
		// 		如果发生回退，这一步的时间将停止，
		// 		但是由于当前的hrtime已经被记录下来，下一步就会继续前进
		if (delta >= 0) {
			_timeNow += delta
		} else {
			decreaseCount++
		}

		return _timeNow
	}
} else if (typeof performance !== 'undefined' && performance.now !== undefined) {
	MODE = 'performance.now'

	_timePrev = performance.now()

	getTimeNow = function () {
		const timeCurr = performance.now()
		const delta = timeCurr - _timePrev
		_timePrev = timeCurr

		// anti decrease
		if (delta >= 0) {
			_timeNow += delta
		} else {
			decreaseCount++
		}

		return _timeNow
	}
} else if (Date.now !== undefined) {
	console.warn('##timeline::use Date.now (low precision time. update your browser.)')

	MODE = 'Date.now'

	_timePrev = Date.now()

	getTimeNow = function () {
		const timeCurr = Date.now()
		const delta = timeCurr - _timePrev
		_timePrev = timeCurr

		// anti decrease
		if (delta >= 0) {
			_timeNow += delta
		} else {
			decreaseCount++
		}

		return _timeNow
	}
} else {
	console.warn(
		'##timeline::use new Date().getTime() (low precision & performance. update your browser.)'
	)

	MODE = 'Date.getTime'

	_timePrev = new Date().getTime()

	getTimeNow = function () {
		const timeCurr = new Date().getTime()
		const delta = timeCurr - _timePrev
		_timePrev = timeCurr

		// anti decrease
		if (delta >= 0) {
			_timeNow += delta
		} else {
			decreaseCount++
		}

		return _timeNow
	}
}

export { getTimeNow, MODE, decreaseCount }
