/* eslint-disable */

// ref: https://github.com/tweenjs/tween.js/blob/master/src/Tween.js
let getTimeNow = null;
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined') {
	getTimeNow = function () {
		const time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
} else if (typeof (window) !== 'undefined' &&
window.performance !== undefined &&
window.performance.now !== undefined) {
	// In a browser, use window.performance.now if it is available.
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	getTimeNow = window.performance.now.bind(window.performance);
} else if (Date.now !== undefined) {
	// Use Date.now if it is available.
	getTimeNow = Date.now;
} else {
	// Otherwise, use 'new Date().getTime()'.
	getTimeNow = function () {
		return new Date().getTime();
	};
}
window.getTimeNow = getTimeNow;

// const CONFIG_TRACK = {
//  startTime: 0,
//  endTime: undefined,
//  onStart: undefined,
//  onEnd: undefined,
//  onUpdate: undefined,
//  id: undefined,
// }

// TODO: startTime === endTime的处理
// TODO: startTime and endTime过于接近的问题
// TODO: onP
// TODO: 回调中提供与预定时间的偏移量
class Track {
	constructor({ id, loop, startTime = 0, endTime, duration,
				  onStart, onEnd, onUpdate, onInit,
			  /** target, from, to, easing, **/ }) {
		this.id = id !== undefined ? id : ('' + 999999 * Math.random()).slice(0, 5);

		this._startTime = startTime;
		this._endTime = endTime;
		this.onStart = onStart;
		this.onEnd = onEnd;
		this.onUpdate = onUpdate;
		this.onInit = onInit;
		this.loop = loop;

		let _duration = duration; // es lint

		if (!_duration && !endTime) {
			_duration = Infinity;
		}

		if (_duration) {
			this._duration = _duration;
			this._endTime = startTime + _duration;
		}
		if (endTime) {
			this._duration = endTime - startTime;
			if (this._endTime !== endTime) {
				console.warn('endTime与duration不一致，将以endTime为准');
				this._endTime = endTime;
			}
		}

		if (this._startTime < 0 || this._endTime < this._startTime) {
			throw new Error('wrong parameters');
		}

		this.running = false;
		this.inited = true;
		this.started = false; // 本轮播放过
		// 循环次数
		this.loopTime = 0;

        // 可回收
		this.alive = true;
		//
		// // target 的处理
		// this._subTracks = [];
		// // 根据to的值来提取需要缓动的值
		// if (typeof to !== 'object') {
		// 	to =
		// 	this._keys = to.keys();
		// 	this._offsets = {};
		// 	this._keys.forEach(key => {
		// 		this._offsets[key] = to[key] - (from)
		// 	})
		// } else {
		//
		// }
	}

	// TODO: 这部分修改之后需要重新校验

	get startTime() {
		return this._startTime;
	}
	set startTime(newTime) {
		this._startTime = newTime;
		this._endTime = this._startTime + this._duration;
	}

	get endTime() {
		return this._endTime;
	}
	set endTime(newTime) {
		this._endTime = newTime;
		this._duration = this._endTime = this._startTime;
	}

	get duration() {
		return this._duration;
	}
	set duration(newTime) {
		this._duration = newTime;
		this._endTime = this._startTime + this._duration;
	}

	tick(_time) {
		let time = _time;
		// TODO: 循环，onEnd如何处理
		if (this.loop && time > this._endTime) {
			// 循环次数, 处理onStart onEnd
			const newLoopTime = Math.floor((time - this._startTime) / this._duration);
			time = (time - this._startTime) % this._duration + this._startTime;
			if (this.loopTime !== newLoopTime) {
				this.loopTime = newLoopTime;
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, (time - this._startTime) / this._duration);
				this.onEnd && this.onEnd(time);
				return;
			}
		}
		// console.log(time)
		if (time < this._startTime) {
			if (this.running) {
				this.running = false;
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
			}
			if (!this.inited) {
				this.onInit && this.onInit(time);
				this.inited = true;
				this.started = false;
			}

		} else if (time > this._endTime) {
			if (this.running) {
				this.running = false;
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
			} else if (!this.started) {
				// NOTE: 避免整个动画被跳过，起码要播一下最后一帧
				if (!this.inited) {
					this.onInit && this.onInit(time);
					this.inited = true;
				}
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
				this.started = true;
			} else {
                // 过期而且不循环（循环的情况在上面处理）
				this.alive = false;
			}

		} else {
			if (!this.running) {
				this.running = true;
				this.inited = false;
				this.started = true;
				this.onStart && this.onStart(time);
			}
			this.onUpdate && this.onUpdate(time, (time - this._startTime) / this._duration);
		}
	}

	safeClip(end) {
		// 避免和时间线起点对齐导致onStart不能正确触发
		if (this._startTime === 0) {
			this._startTime = 0.5;
		}
		if (this._startTime >= end) {
			this._startTime = end - 1;
		}
		if (this._endTime >= end) {
			this._endTime = end - 0.5;
			// 原则上，p不大于一即可
			this._duration = end - this._startTime;
		}
	}
}

const CONFIG_TIMELINE = {
	autoRecevery: false,
};

export default class Timeline {
	constructor(config) {
		this.config = {
			...CONFIG_TIMELINE,
			...config,
		};

		this.duration = this.config.duration;
		this.loop = this.config.loop;

		this.tracks = [];
		this.currentTime = 0; // timeLocal
		this.referenceTime = 0; // 参考时间

		this.animationFrameID = 0;

		this.running = false;

		this.cbkEnd = [];
	}

	get onEnd() {
		return this.cbkEnd;
	}
	set onEnd(cbk) {
		this.cbkEnd.push(cbk);
	}

	// 相对时间，只能用来计算差值
	_getTimeNow() {
		return getTimeNow();
	}

	/**
	* 每帧调用
	* @param  {Boolean} singleStep 单步逐帧播放
	* @param  {Num}  time  opt, 跳转到特定时间
	*/
	tick(singleStep = false, time) {

		if (time === undefined) {
			this.currentTime = this._getTimeNow() - this.referenceTime;
		} else {
			this.seek(time);
		}
		if (this.currentTime > this.duration) {
			if (this.running) {
				for (let i = this.cbkEnd.length - 1; i >= 0; i--) {
					this.cbkEnd[i]();
				}
			}
			if (this.loop) {
				this.seek(0); // 保证 onInit 和 onStart 会被触发
			} else {
				this.running = false;
				// 以免track在尾部得不到调用
				this.onTimeUpdate && this.onTimeUpdate(this);
				for (let i = this.tracks.length - 1; i >= 0; i--) {
					this.tracks[i].tick(this.currentTime);
				}
				// this.stop()
				return;
			}
		}
		this.onTimeUpdate && this.onTimeUpdate(this);
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			this.tracks[i].tick(this.currentTime);
		}
        // 自动回收
		if (this.config.autoRecevery) {
			this.recovery();
		}
		if (singleStep) {
			this.running = false;
			return;
		}
		this.animationFrameID = requestAnimationFrame(() => this.tick());
		return this;
	}

	play() {
		this.stop();
		this.running = true;
		this.referenceTime = this._getTimeNow();
		this.tick();
		return this;
	}

	seek(time) {
		this.currentTime = time;
		this.referenceTime = this._getTimeNow() - time;
		return this;
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this.animationFrameID);
		return this;
	}

	recovery() {
        // 倒序删除，以免数组索引混乱
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			if (!this.tracks[i].alive) {
				this.tracks.splice(i, 1);
			}
		}
	}

	// addTrack(startTimeOrTrack, endTime, onStart, onEnd, onUpdate) {
	addTrack(props) {
		// let track = null
		// if (startTimeOrTrack instanceof Track) {
		//  track = startTimeOrTrack
		// } else {
		//  track = new Track({startTimeOrTrack, endTime, onStart, onEnd, onUpdate})
		// }
		const track = new Track(props);
		track.safeClip(this.duration);
		track.onInit && track.onInit(this.currentTime);
		this.tracks.push(track);
		return track;
	}

	destroy() {

	}

	getTrackByID(id) {

	}

	static Track = Track
}
