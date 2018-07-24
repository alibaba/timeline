/**********************
 * Track for Timeline *
 * @author Meng       *
 **********************/


let __trackUUID = 0; // 避免uuid重复

/**
 * Track 🚀 🚀 🚀
 * 轨道，代表时间线上的一个行为对象，有自己的startTime, duration等特性
 * TODO: startTime === endTime的处理
 * TODO: startTime and endTime过于接近的问题
 * TODO: onP
 * TODO: 回调中提供与预定时间的偏移量
 */
export default class Track {
	/**
	 * 创建一个Track
	 * @param {any} id - 命名，可以用来查找制定Track，也便与调试
	 * @param {Bool} [loop=false] - 是否循环
	 * @param {Number} [startTime=0] - 起始时间
	 * @param {Number} endTime - 结束时间
	 * @param {Number} duration - 时长
	 * @param {Func} onStart - 开始时的回调，loop的话每次开始都会调用
	 * @param {Func} onEnd - 结束时的回调，loop的话每次结束都会调用
	 * @param {Func} onUpdate - 过程回调
	 * @param {Func} onInit - 首次开始时的回调
	 * @param {Func} easing - easing - 缓动函数 p => p
	 */
	constructor({ id, loop, startTime = 0, endTime, duration,
				  onStart, onEnd, onUpdate, onInit, easing, }) {
		this.id = id !== undefined ? id : '';
		this.uuid = '' + Math.random() + __trackUUID ++;
		this.isTrack = true;

		this._startTime = startTime;
		this._endTime = endTime;
		this.onStart = onStart;
		this.onEnd = onEnd;
		this.onUpdate = onUpdate;
		this.onInit = onInit;
		this.loop = loop;
		this.easing = easing;

		// 保证只被add一次
		this._taken = false;

		// 子级Track
		this.tracks = [];
		this.children = this.tracks;

		// 计算duration和endTime，处理endTime与duration不一致的情况

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

		if (this._startTime < 0 || this._endTime <= this._startTime) {
			throw new Error('wrong parameters');
		}

		this.running = false; // 运行中
		this.inited = true; // 初始化完成
		this.started = false; // 本轮播放过
		// 循环次数
		this.loopTime = 0;

        // 垃圾回收flag
		this._alive = true;
	}

	get startTime() { return this._startTime; }
	set startTime(newTime) {
		// TODO: 这部分修改之后需要重新校验
		this._startTime = newTime;
		this._endTime = this._startTime + this._duration;
	}

	get endTime() { return this._endTime; }
	set endTime(newTime) {
		this._endTime = newTime;
		this._duration = this._endTime = this._startTime;
	}

	get duration() { return this._duration; }
	set duration(newTime) {
		this._duration = newTime;
		this._endTime = this._startTime + this._duration;
	}

	get alive() { return this._alive; }
	set alive(v) { this._alive = v; }

	traverse(f) {
		// 自己
		f(this)
		// children
		if (!this.children || this.children.length === 0) return
		this.children.forEach(c => c.traverse(f))
	}

	init(time) {
		if (this.running) {
			// NOTE: 避免终止位置不正确
			this.onUpdate && this.onUpdate(this.endTime, 1);
			this.onEnd && this.onEnd(this.endTime);
		}

		this.running = false;
		this.started = false;

		// this.inited = false;
		this.onInit && this.onInit(time);
		// this.inited = true;
	}

	tick(_time) {
		if (!this.alive) { return }

		let time = _time; // es lint
		// TODO: 使用循环时，onEnd如何处理？暂时不处理
		if (this.loop && time > this._endTime) {
			// 循环次数, 处理onStart onEnd
			const newLoopTime = Math.floor((time - this._startTime) / this._duration);
			time = (time - this._startTime) % this._duration + this._startTime;
			if (this.loopTime !== newLoopTime) {
				// 新的一轮循环
				this.loopTime = newLoopTime;
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, (time - this._startTime) / this._duration);
				this.onEnd && this.onEnd(time);
				return;
			}
		}

		if (time < this._startTime) {
			// Track未开始
			// if (this.running) {
			// 	this.running = false;
			// 	// NOTE: 避免终止位置不正确
			// 	this.onUpdate && this.onUpdate(time, 1);
			// 	this.onEnd && this.onEnd(time);
			// }
			// if (!this.inited) {
			// 	this.onInit && this.onInit(time);
			// 	this.inited = true;
			// 	this.started = false;
			// }

		} else if (time > this._endTime) {
			// Track已结束
			if (this.running) {
				this.running = false;
				// NOTE: 避免终止位置不正确
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
			} else if (!this.started) {
				// NOTE: 避免整个动画被跳过，起码要播一下最后一帧
				// if (!this.inited) {
				// 	this.onInit && this.onInit(time);
				// 	this.inited = true;
				// }
				this.onStart && this.onStart(time);
				this.onUpdate && this.onUpdate(time, 1);
				this.onEnd && this.onEnd(time);
				this.started = true;
			}
			// 过期而且不循环（循环的情况在上面处理）
			this.alive = false;

		} else {
			// Track运行中
			// if (!this.inited) {
			// 	this.onInit && this.onInit(time);
			// 	this.inited = true;
			// }
			if (!this.running) {
				this.running = true;
				// this.inited = false;
				this.started = true;
				this.onStart && this.onStart(time);
			}
			if (this.onUpdate) {
				let p = (time - this._startTime) / this._duration;
				// 缓动
				if (this.easing) { p = this.easing(p); }
				this.onUpdate(time, p);
			}
		}
	}

	// 垃圾回收
	recovery() {
		// 倒序删除，以免数组索引混乱
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			if (!this.tracks[i].alive) {
				this.tracks.splice(i, 1);
			}
		}
	}

	/**
	 * 根据配置创建一个Track
	 * @param {Object} props 配置项，详见Track.constructor
	 * @return {Track} 所创建的Track
	 */
	addTrack(props) {return this.add(props);}
	add(props) {
		if (props.isTimeline) {
			props.tracks.push(props)
		} else {
			const track = new Track(props);
			track._safeClip(this.duration);
			track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track);
			return track;
		}
	}

	// @TODO remove
	removeTrack(track) {return this.remove(track);}
	remove(track) {console.warn('remove TODO');}

	// 停掉指定Track
	stopTrack(track) {
		const uuid = track.uuid;
		for (let i = this.tracks.length - 1; i >= 0 ; i--) {
			if (this.tracks[i].uuid === uuid) {
				this.tracks[i].alive = false;
			}
		}
	}

	/**
	 * 根据ID获取Tracks
	 * @param  {Number} id
	 * @return {Array(Track)}
	 */
	getTracksByID(id) {
		const tracks = [];
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks;
	}

	clear() {
		this.tracks = [];
	}

	// 避免和时间线起点对齐导致onStart不能正确触发
	_safeClip(end) {
		if (this._startTime <= 0) {
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
