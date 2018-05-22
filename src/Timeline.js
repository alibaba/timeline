/**************************************************
 * Timeline                                       *
 * Manage All Your Events And Animations Together *
 * @author Meng                                   *
 **************************************************/

// @TODO 时间排序
// @TODO 自动排序插入
// @TODO 拆分动作保证顺序

import Track from './Track';
import { getTimeNow, raf, cancelRaf } from './utils';

// 默认配置
const CONFIG_TIMELINE = {
	duration: Infinity,
	loop: false,
	autoRecevery: false,
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 避免长时间页面切走后切回，造成的时间突进
	pauseWhenInvisible: false,
	// 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	// 用于避免打断点时继续计时，端点结束后时间突进
	maxStep: Infinity,
	// 最大帧率限制
	maxFPS: Infinity,

	// @TODO: 保证每个节点的执行顺序
	// orderGuarantee: true,
};

/**
 * Timeline 🌺 🌺 🌺
 * 接口风格与MediaElement保持一致
 */
export default class Timeline {
	// 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	constructor(config) {
		this.config = {
			...CONFIG_TIMELINE,
			...config,
		};

		this.duration = this.config.duration;
		this.loop = this.config.loop;

		// 频率限制
		this.minFrame = 900 / this.config.maxFPS;

		this.tracks = [];
		this.currentTime = 0; // timeLocal
		this._lastCurrentTime = 0;
		this.referenceTime = this._getTimeNow(); // 参考时间

		this.animationFrameID = 0;

		this.running = false;

		this.cbkEnd = [];

		// this._ticks = []; // 把需要执行的tick排序执行（orderGuarantee）

		this._timeBeforeHidden = 0;
		this._timeBeforePaused = 0;

		this._timeoutID = 0; // 用于给setTimeout和setInterval分配ID

		// 页面不可见时暂停计时
		// 非浏览器主线程环境则忽略
		if (this.config.pauseWhenInvisible && typeof (document) !== 'undefined') {
			document.addEventListener("visibilitychange", () => {
				if (document.hidden) {
					this._timeBeforeHidden = this.currentTime;
					cancelRaf(this.animationFrameID);
				} else {
					this.seek(this._timeBeforeHidden);
					if (this.running) {
						this.tick();
					}
				}
			});
		}
	}

	// 播放结束的回调
	get onEnd() { return this.cbkEnd; }
	set onEnd(cbk) { this.cbkEnd.push(cbk); }

	// 相对时间，只能用来计算差值
	_getTimeNow() { return getTimeNow(); }

	/**
	* 每帧调用
	* @param  {Bool} singleStep 单步逐帧播放
	* @param  {Num}  time  opt, 跳转到特定时间
	*/
	tick(singleStep = false, time) {

		if (time === undefined) {
			const currentTime = this._getTimeNow() - this.referenceTime;
			// FPS限制
			if (currentTime - this.currentTime < this.minFrame) {
				this.animationFrameID = raf(() => this.tick());
				return this;
			}
			this._lastCurrentTime = this.currentTime;
			this.currentTime = currentTime;
			// 最长帧限制
			const step = this.currentTime - this._lastCurrentTime;
			if (step > this.config.maxStep) {
				this.seek(this._lastCurrentTime + this.config.maxStep);
			}
		} else {
			this.seek(time);
		}

		// 播放完毕
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
				// for (let i = this.tracks.length - 1; i >= 0; i--) {
				for (let i = 0; i < this.tracks.length; i++) {
					this.tracks[i].tick(this.currentTime);
				}
				// this.stop()
				return;
			}
		}

		// 回调
		this.onTimeUpdate && this.onTimeUpdate(this);

		// 逐个轨道处理
		// for (let i = this.tracks.length - 1; i >= 0; i--) {
		for (let i = 0; i < this.tracks.length; i++) {
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

	// 开始播放
	play() {
		this.stop();
		this.running = true;
		this.referenceTime = this._getTimeNow();
		this.tick();
		return this;
	}

	// 调到指定时间
	seek(time) {
		this.currentTime = time;
		this.referenceTime = this._getTimeNow() - time;
		return this;
	}

	// 停止播放
	stop() {
		this.running = false;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 暂停播放
	pause() {
		this.running = false;
		this._timeBeforePaused = this.currentTime;
		cancelRaf(this.animationFrameID);
		return this;
	}

	// 从暂停中恢复， ** 不能从停止中恢复 **
	resume() {
		this.pause();
		this.seek(this._timeBeforePaused);
		this.running = true;
		this.tick();
		return this;
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
	addTrack(props) {
		const track = new Track(props);
		track._safeClip(this.duration);
		track.onInit && track.onInit(this.currentTime);
		this.tracks.push(track);
		return track;
	}

	// 停掉指定Track
	stopTrack(track) {
		const uuid = track.uuid;
		for (let i = this.tracks.length - 1; i >= 0 ; i--) {
			if (this.tracks[i].uuid === uuid) {
				this.tracks[i].alive = false;
			}
		}
	}

	// 清理掉整个Timeline，目前没有发现需要单独清理的溢出点
	destroy() {
		this.stop();
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

	// 重写Dom标准中的 setTimeout 和 setInterval

	setTimeout(callback, time = 10) {
		if (time < 0) time = 0;
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: 1000,
			loop: false,
			onStart: callback,
		});
		return ID;
	}

	setInterval(callback, time = 10) {
		if (time < 0) time = 0;
		const ID = this._timeoutID ++;
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: time,
			loop: true,
			onStart: callback,
		});
		return ID;
	}

	clearTimeout(ID) {
		const track = this.getTracksByID('__timeout__' + ID)[0];
		if (track) this.stopTrack(track);
	}

	clearInterval(ID) {
		this.clearTimeout(ID);
	}

	getTime() {
		return this.referenceTime + this.currentTime;
	}

	// NOTE: 暂时不鼓励在外部创建Track
	// static Track = Track
}
