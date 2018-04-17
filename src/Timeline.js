/* eslint-disable */

let getTimeNow = null;
// @NOTE: chrome的Worker里也是有process的！！！
// 			而且和node的process不一样！！！
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined' && process.hrtime !== undefined) {
	getTimeNow = function () {
		const time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
} else if (typeof (this) !== 'undefined' &&
this.performance !== undefined &&
this.performance.now !== undefined) {
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
// window.getTimeNow = getTimeNow;

let raf, cancelRaf;
if (typeof requestAnimationFrame !== 'undefined') {
	raf = requestAnimationFrame;
	cancelRaf = cancelAnimationFrame;
} else {
	raf = cbk => setTimeout(cbk, 20);
	cancelRaf = clearTimeout;
}

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
		this.id = id !== undefined ? id : '';
		this.uuid = '' + 999999 * Math.random(); // @TODO not safe

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
		if (!this.alive) { return }
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
	duration: Infinity,
	loop: false,
	autoRecevery: false,
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 如果document.hidden不可用，则该项不会生效
	// 避免长时间页面切走后切回，造成的时间突进
	pauseWhenInvisible: false,
	// 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	// 用于避免打断点时继续计时，端点结束后时间突进
	maxStep: Infinity,
	// 最大帧率限制
	maxFPS: Infinity,
};

export default class Timeline {
	constructor(config) {
		this.config = {
			...CONFIG_TIMELINE,
			...config,
		};

		this.duration = this.config.duration;
		this.loop = this.config.loop;

		// 频率限制
		this.minFrame = 1 / this.config.maxFPS;

		this.tracks = [];
		this.currentTime = 0; // timeLocal
		this._lastCurrentTime = 0;
		this.referenceTime = this._getTimeNow(); // 参考时间

		this.animationFrameID = 0;

		this.running = false;

		this.cbkEnd = [];

		this._timeBeforeHidden = 0;
		this._timeBeforePaused = 0;


		// 非浏览器主线程环境则忽略
		if (this.config.pauseWhenInvisible && typeof (document) !== 'undefined') {
			// this.invisiblePause = document.hidden
			document.addEventListener("visibilitychange", () => {
				// if (!document.hidden) {
				// 	console.log('重置时间');
				// 	this.referenceTime = this._getTimeNow();
				// }
				if (document.hidden) {
					// console.log('pause');
					this._timeBeforeHidden = this.currentTime;
					cancelRaf(this.animationFrameID);
				} else {
					// console.log('continue');
					this.seek(this._timeBeforeHidden);
					if (this.running) {
						this.tick();
					}
				}
			});
		}
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
			if (this.currentTime - this._lastCurrentTime < this.minFrame) {
				return;
			}
			this._lastCurrentTime = this.currentTime;
			this.currentTime = this._getTimeNow() - this.referenceTime;
			const step = this.currentTime - this._lastCurrentTime;
			if (step > this.config.maxStep) {
				this.seek(this._lastCurrentTime + this.config.maxStep);
			}
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
		this.animationFrameID = raf(() => this.tick());
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
		cancelRaf(this.animationFrameID);
		return this;
	}

	pause() {
		this.running = false;
		this._timeBeforePaused = this.currentTime;
		cancelRaf(this.animationFrameID);
		return this;
	}

	resume() {
		this.pause();
		this.seek(this._timeBeforePaused);
		this.running = true;
		this.tick();
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

	stopTrack(track) {
		const uuid = track.uuid;
		for (let i = this.tracks.length - 1; i >= 0 ; i--) {
			if (this.tracks[i].uuid === uuid) {
				this.tracks[i].alive = false;
			}
		}
	}

	destroy() {

	}

	getTracksByID(id) {
		const tracks = [];
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks;
	}

	static Track = Track
}
